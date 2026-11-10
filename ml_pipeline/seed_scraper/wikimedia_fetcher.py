"""Fetch open-licensed seed photos for monuments in nepal_heritage_seed.

Network is optional: set ``mock=True`` or ``SAALIK_SEED_MOCK=1`` to generate
deterministic local placeholder images suitable for tests and offline demos.
"""

from __future__ import annotations

import hashlib
import json
import os
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
from PIL import Image, ImageDraw

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SEED_ROOT = REPO_ROOT / "data" / "nepal_heritage_seed"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "raw_images"


@dataclass(frozen=True)
class MonumentSeed:
    monument_id: str
    name_en: str
    zone_id: str
    aliases: Tuple[str, ...] = ()
    search_query: str = ""

    def __post_init__(self) -> None:
        if not self.search_query:
            object.__setattr__(self, "search_query", f"{self.name_en} Nepal")


@dataclass
class SeedFetchResult:
    monument_id: str
    paths: List[Path] = field(default_factory=list)
    source: str = "mock"
    licenses: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "monument_id": self.monument_id,
            "paths": [str(p) for p in self.paths],
            "source": self.source,
            "licenses": list(self.licenses),
            "errors": list(self.errors),
        }


def _env_flag(name: str, default: str = "0") -> bool:
    return os.environ.get(name, default).strip().lower() in {"1", "true", "yes", "on"}


def load_monuments_from_seed(
    seed_root: Optional[Path] = None,
    limit: Optional[int] = None,
) -> List[MonumentSeed]:
    """Parse zone JSON files under data/nepal_heritage_seed/zones/."""
    root = Path(seed_root) if seed_root else DEFAULT_SEED_ROOT
    zones_dir = root / "zones"
    if not zones_dir.is_dir():
        raise FileNotFoundError(f"Heritage seed zones directory not found: {zones_dir}")

    monuments: List[MonumentSeed] = []
    for path in sorted(zones_dir.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        zone_id = str(payload.get("zoneId") or path.stem)
        for item in payload.get("monuments", []):
            names = item.get("names") or {}
            name_en = str(names.get("en") or item.get("id"))
            aliases = tuple(str(a) for a in (item.get("aliases") or []))
            monuments.append(
                MonumentSeed(
                    monument_id=str(item["id"]),
                    name_en=name_en,
                    zone_id=zone_id,
                    aliases=aliases,
                    search_query=f"{name_en} Kathmandu Valley Nepal",
                )
            )
            if limit is not None and len(monuments) >= limit:
                return monuments
    return monuments


def _stable_int(text: str) -> int:
    return int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:16], 16)


def _color_from_id(monument_id: str) -> Tuple[int, int, int]:
    digest = _stable_int(monument_id)
    r = 40 + (digest % 180)
    g = 40 + ((digest // 7) % 180)
    b = 40 + ((digest // 13) % 180)
    return int(r), int(g), int(b)


def _render_mock_image(
    monument: MonumentSeed,
    index: int,
    size: Tuple[int, int] = (640, 480),
) -> Image.Image:
    """Create a deterministic, unique-looking placeholder photo per monument."""
    w, h = size
    base = _color_from_id(monument.monument_id)
    img = Image.new("RGB", size, base)
    draw = ImageDraw.Draw(img)

    cx = w // 2 + (index - 1) * 12
    tiers = 3 + (_stable_int(monument.monument_id) % 3)
    for t in range(tiers):
        width = int(w * (0.55 - t * 0.08))
        top = int(h * 0.22) + t * int(h * 0.12)
        left = cx - width // 2
        color = (
            min(255, base[0] + 30 * t),
            min(255, base[1] + 20 * t),
            min(255, base[2] + 10 * t),
        )
        draw.rectangle(
            [left, top, left + width, top + int(h * 0.1)],
            fill=color,
            outline=(20, 20, 20),
        )

    rng = np.random.default_rng(_stable_int(f"{monument.monument_id}:{index}") % (2**32))
    noise = (rng.random((h, w, 3)) * 24).astype(np.uint8)
    arr = np.asarray(img, dtype=np.uint8)
    arr = np.clip(arr.astype(np.int16) + noise.astype(np.int16), 0, 255).astype(np.uint8)
    out = Image.fromarray(arr)
    label = f"{monument.monument_id}#{index}"
    ImageDraw.Draw(out).text((12, h - 28), label, fill=(255, 255, 255))
    return out


class WikimediaSeedFetcher:
    """Fetch (or mock) open-licensed Wikimedia seed photos for monuments."""

    API_URL = "https://commons.wikimedia.org/w/api.php"

    def __init__(
        self,
        output_dir: Optional[Path] = None,
        mock: Optional[bool] = None,
        user_agent: str = "SaalikHeritageBot/0.1 (educational; contact=saalik-app)",
        timeout_s: float = 15.0,
    ) -> None:
        self.output_dir = Path(output_dir) if output_dir else DEFAULT_OUTPUT_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
        if mock is None:
            mock = _env_flag("SAALIK_SEED_MOCK", "1")
        self.mock = bool(mock)
        self.user_agent = user_agent
        self.timeout_s = timeout_s

    def fetch_monument(
        self,
        monument: MonumentSeed,
        max_images: int = 3,
    ) -> SeedFetchResult:
        dest = self.output_dir / monument.monument_id
        dest.mkdir(parents=True, exist_ok=True)
        if self.mock:
            return self._fetch_mock(monument, dest, max_images=max_images)
        return self._fetch_wikimedia(monument, dest, max_images=max_images)

    def fetch_all(
        self,
        monuments: Sequence[MonumentSeed],
        max_images: int = 2,
    ) -> List[SeedFetchResult]:
        return [self.fetch_monument(m, max_images=max_images) for m in monuments]

    def _fetch_mock(
        self,
        monument: MonumentSeed,
        dest: Path,
        max_images: int,
    ) -> SeedFetchResult:
        paths: List[Path] = []
        licenses: List[str] = []
        for i in range(max_images):
            path = dest / f"mock_{i:02d}.jpg"
            image = _render_mock_image(monument, index=i)
            image.save(path, format="JPEG", quality=90)
            paths.append(path)
            licenses.append("Generated-Mock/Public-Domain-Placeholder")
        return SeedFetchResult(
            monument_id=monument.monument_id,
            paths=paths,
            source="mock",
            licenses=licenses,
        )

    def _fetch_wikimedia(
        self,
        monument: MonumentSeed,
        dest: Path,
        max_images: int,
    ) -> SeedFetchResult:
        result = SeedFetchResult(monument_id=monument.monument_id, source="wikimedia")
        try:
            file_titles = self._search_file_titles(monument.search_query, limit=max_images * 2)
        except Exception as exc:  # noqa: BLE001
            result.errors.append(f"search_failed: {exc}")
            mock = self._fetch_mock(monument, dest, max_images=max_images)
            mock.source = "mock_fallback"
            mock.errors = result.errors + mock.errors
            return mock

        for title in file_titles:
            if len(result.paths) >= max_images:
                break
            try:
                meta = self._file_metadata(title)
                if not meta:
                    continue
                url = meta.get("url")
                license_name = str(meta.get("license", "unknown"))
                if not url:
                    continue
                ext = Path(urllib.parse.urlparse(url).path).suffix or ".jpg"
                safe_name = title.replace("File:", "").replace(" ", "_")
                out_path = dest / f"{safe_name[:80]}{ext}"
                self._download(url, out_path)
                result.paths.append(out_path)
                result.licenses.append(license_name)
            except Exception as exc:  # noqa: BLE001
                result.errors.append(f"{title}: {exc}")

        if not result.paths:
            mock = self._fetch_mock(monument, dest, max_images=max_images)
            mock.source = "mock_fallback"
            mock.errors = result.errors + mock.errors
            return mock
        return result

    def _api_get(self, params: Dict[str, Any]) -> Dict[str, Any]:
        query = urllib.parse.urlencode({**params, "format": "json"})
        req = urllib.request.Request(
            f"{self.API_URL}?{query}",
            headers={"User-Agent": self.user_agent},
        )
        with urllib.request.urlopen(req, timeout=self.timeout_s) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def _search_file_titles(self, query: str, limit: int = 5) -> List[str]:
        data = self._api_get(
            {
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srnamespace": 6,
                "srlimit": max(1, limit),
            }
        )
        return [item["title"] for item in data.get("query", {}).get("search", [])]

    def _file_metadata(self, title: str) -> Optional[Dict[str, str]]:
        data = self._api_get(
            {
                "action": "query",
                "titles": title,
                "prop": "imageinfo",
                "iiprop": "url|extmetadata|mime",
                "iiurlwidth": 1280,
            }
        )
        pages = data.get("query", {}).get("pages", {})
        for page in pages.values():
            infos = page.get("imageinfo") or []
            if not infos:
                continue
            info = infos[0]
            meta = info.get("extmetadata") or {}
            license_short = (
                (meta.get("LicenseShortName") or {}).get("value")
                or (meta.get("License") or {}).get("value")
                or "unknown"
            )
            url = info.get("thumburl") or info.get("url")
            return {"url": str(url) if url else "", "license": str(license_short)}
        return None

    def _download(self, url: str, dest: Path) -> None:
        req = urllib.request.Request(url, headers={"User-Agent": self.user_agent})
        with urllib.request.urlopen(req, timeout=self.timeout_s) as resp:
            dest.write_bytes(resp.read())


def fetch_seed_photos(
    seed_root: Optional[Path] = None,
    output_dir: Optional[Path] = None,
    mock: Optional[bool] = None,
    limit_monuments: Optional[int] = None,
    max_images: int = 2,
) -> List[SeedFetchResult]:
    """CLI-friendly entrypoint used by scripts and benchmarks."""
    monuments = load_monuments_from_seed(seed_root=seed_root, limit=limit_monuments)
    fetcher = WikimediaSeedFetcher(output_dir=output_dir, mock=mock)
    return fetcher.fetch_all(monuments, max_images=max_images)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Fetch open-licensed heritage seed photos")
    parser.add_argument("--seed-root", type=Path, default=None)
    parser.add_argument("--output-dir", type=Path, default=None)
    parser.add_argument("--limit", type=int, default=8)
    parser.add_argument("--max-images", type=int, default=2)
    parser.add_argument("--live", action="store_true", help="Hit Wikimedia (default is mock)")
    args = parser.parse_args()

    results = fetch_seed_photos(
        seed_root=args.seed_root,
        output_dir=args.output_dir,
        mock=not args.live,
        limit_monuments=args.limit,
        max_images=args.max_images,
    )
    print(json.dumps([r.to_dict() for r in results], indent=2))
