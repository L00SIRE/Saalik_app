"""Fetch open-licensed seed photos for monuments in nepal_heritage_seed.

Network is optional: set ``mock=True`` or ``SAALIK_SEED_MOCK=1`` to generate
deterministic local placeholder images suitable for tests and offline demos.
"""

from __future__ import annotations

import hashlib
import html
import io
import json
import os
import re
import sys
import time
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

RASTER_MIMES = {"image/jpeg", "image/png", "image/webp"}
MIN_ORIGINAL_WIDTH = 640
DHASH_NEAR = 8  # Hamming distance (of 64 bits) at or below which two photos count as the same frame


def dhash(image: Image.Image) -> int:
    """64-bit difference hash: one bit per left-to-right brightness step on a 9x8 grey thumbnail."""
    px = image.convert("L").resize((9, 8), Image.LANCZOS).tobytes()
    return sum(
        1 << (row * 8 + col)
        for row in range(8)
        for col in range(8)
        if px[row * 9 + col + 1] > px[row * 9 + col]
    )


def is_near_duplicate(a: int, b: int) -> bool:
    return bin(a ^ b).count("1") <= DHASH_NEAR


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


PRIORITY_ZONE_IDS = (
    "kathmandu_durbar",
    "patan_durbar",
    "bhaktapur_durbar",
    "swayambhunath",
    "boudhanath",
    "pashupatinath",
)


def load_monuments_from_seed(
    seed_root: Optional[Path] = None,
    limit: Optional[int] = None,
    zone_ids: Optional[Sequence[str]] = None,
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
        if zone_ids is not None and zone_id not in zone_ids:
            continue
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
                    search_query=f'"{name_en}" Nepal',
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
        user_agent: str = "SaalikHeritageBot/0.1 (educational heritage index; https://www.sumandangal.com/)",
        timeout_s: float = 20.0,
        allow_mock_fallback: bool = True,
    ) -> None:
        self.output_dir = Path(output_dir) if output_dir else DEFAULT_OUTPUT_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
        if mock is None:
            mock = _env_flag("SAALIK_SEED_MOCK", "1")
        self.mock = bool(mock)
        self.user_agent = user_agent
        self.timeout_s = timeout_s
        self.allow_mock_fallback = allow_mock_fallback

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
        queries = [monument.search_query, f"{monument.name_en} Nepal temple"]
        file_titles: List[str] = []
        try:
            for query in queries:
                file_titles.extend(self._search_titles(query, limit=max_images * 3))
                if len(file_titles) >= max_images * 2:
                    break
        except Exception as exc:  # noqa: BLE001
            result.errors.append(f"search_failed: {exc}")
            return self._maybe_mock(monument, dest, max_images, result)

        seen = set()
        for title in file_titles:
            if title in seen:
                continue
            seen.add(title)
            if len(result.paths) >= max_images:
                break
            lowered = title.lower()
            if lowered.endswith((".pdf", ".svg", ".tif", ".tiff", ".djvu", ".ogg", ".webm")):
                continue
            try:
                meta = self._file_metadata(title)
                if not meta:
                    continue
                url = meta.get("url")
                license_name = str(meta.get("license", "unknown"))
                mime = str(meta.get("mime", ""))
                if not url or not _open_license(license_name):
                    result.errors.append(f"skipped_license:{title}:{license_name}")
                    continue
                if mime and not mime.startswith("image/"):
                    continue
                out_path = dest / f"{_safe_stem(title)}{_thumb_ext(url)}"
                if not out_path.exists() or out_path.stat().st_size < 1000:
                    self._download(url, out_path)
                result.paths.append(out_path)
                result.licenses.append(license_name)
            except Exception as exc:  # noqa: BLE001
                result.errors.append(f"{title}: {exc}")

        if not result.paths:
            return self._maybe_mock(monument, dest, max_images, result)
        return result

    def _maybe_mock(
        self,
        monument: MonumentSeed,
        dest: Path,
        max_images: int,
        result: SeedFetchResult,
    ) -> SeedFetchResult:
        if not self.allow_mock_fallback:
            return result
        mock = self._fetch_mock(monument, dest, max_images=max_images)
        mock.source = "mock_fallback"
        mock.errors = result.errors + mock.errors
        return mock

    def harvest_additional(
        self,
        monument: MonumentSeed,
        add: int,
        extra_queries: Sequence[str] = (),
    ) -> List[Dict[str, str]]:
        """Download up to ``add`` new open-licensed Commons photos into the monument folder.

        Candidates come from ``extra_queries`` (file search), then members of categories
        matching the name and aliases, then file search on the name and aliases. Returns one
        ``{file, title, url, license, artist}`` record per photo added. Never runs in mock mode.
        """
        if self.mock or add <= 0:
            return []
        dest = self.output_dir / monument.monument_id
        dest.mkdir(parents=True, exist_ok=True)
        hashes = []
        for path in dest.iterdir():
            try:
                with Image.open(path) as image:
                    hashes.append(dhash(image))
            except OSError:  # not an image
                continue
        # One verdict per Commons file: skip anything already filed, or rejected, under any monument.
        roots = (self.output_dir, self.output_dir.parent / "rejected_images")
        known = {p.stem for root in roots for p in root.glob("*/*")}

        names = (monument.name_en, *monument.aliases)
        titles: List[str] = []
        try:
            for query in extra_queries:
                titles += self._search_titles(query, limit=20)
            for name in names:
                for category in self._search_titles(name, limit=3, namespace=14):
                    data = self._api_get(
                        {"action": "query", "list": "categorymembers", "cmtitle": category, "cmtype": "file", "cmlimit": 50}
                    )
                    titles += [item["title"] for item in data.get("query", {}).get("categorymembers", [])]
            for name in names:
                titles += self._search_titles(f"{name} Nepal", limit=20)
        except Exception as exc:  # noqa: BLE001 - keep the candidates gathered so far
            print(f"harvest {monument.monument_id}: candidate lookup failed: {exc}", file=sys.stderr)

        added: List[Dict[str, str]] = []
        for title in dict.fromkeys(titles):
            if len(added) >= add:
                break
            stem = _safe_stem(title)
            if stem in known:
                continue
            try:
                meta = self._file_metadata(title)
                if (
                    not meta
                    or not meta["url"]
                    or not _open_license(meta["license"])
                    or meta["mime"] not in RASTER_MIMES
                    or meta["width"] < MIN_ORIGINAL_WIDTH
                ):
                    continue
                blob = self._get_bytes(meta["url"])
                with Image.open(io.BytesIO(blob)) as image:
                    digest = dhash(image)
            except Exception as exc:  # noqa: BLE001 - unreadable candidate: try the next one
                print(f"harvest {monument.monument_id}: skipped {title}: {exc}", file=sys.stderr)
                continue
            if any(is_near_duplicate(digest, seen) for seen in hashes):
                continue
            path = dest / f"{stem}{_thumb_ext(meta['url'])}"
            path.write_bytes(blob)
            hashes.append(digest)
            added.append(
                {
                    "file": path.name,
                    "title": title,
                    "url": meta["page"],
                    "license": meta["license"],
                    "artist": meta["artist"],
                }
            )
        return added

    def _api_get(self, params: Dict[str, Any]) -> Dict[str, Any]:
        time.sleep(0.2)
        query = urllib.parse.urlencode({**params, "format": "json"})
        req = urllib.request.Request(
            f"{self.API_URL}?{query}",
            headers={"User-Agent": self.user_agent},
        )
        with urllib.request.urlopen(req, timeout=self.timeout_s) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def _search_titles(self, query: str, limit: int = 5, namespace: int = 6) -> List[str]:
        """Search Commons page titles; namespace 6 is files, 14 is categories."""
        data = self._api_get(
            {
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srnamespace": namespace,
                "srlimit": max(1, limit),
            }
        )
        return [item["title"] for item in data.get("query", {}).get("search", [])]

    def _file_metadata(self, title: str) -> Optional[Dict[str, Any]]:
        data = self._api_get(
            {
                "action": "query",
                "titles": title,
                "prop": "imageinfo",
                "iiprop": "url|extmetadata|mime|size",
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
            artist = re.sub(r"<[^>]+>", "", (meta.get("Artist") or {}).get("value") or "")
            return {
                "url": str(url) if url else "",
                "license": str(license_short),
                "mime": str(info.get("mime") or ""),
                "width": int(info.get("width") or 0),
                "artist": " ".join(html.unescape(artist).split()),
                "page": str(info.get("descriptionurl") or ""),
            }
        return None

    def _get_bytes(self, url: str) -> bytes:
        req = urllib.request.Request(url, headers={"User-Agent": self.user_agent})
        with urllib.request.urlopen(req, timeout=self.timeout_s) as resp:
            return resp.read()

    def _download(self, url: str, dest: Path) -> None:
        dest.write_bytes(self._get_bytes(url))


def _safe_stem(title: str) -> str:
    """Local file stem for a Commons ``File:`` title."""
    return "".join(ch if ch.isalnum() or ch in "._-" else "_" for ch in title.replace("File:", ""))[:90]


def _thumb_ext(url: str) -> str:
    ext = Path(urllib.parse.urlparse(url).path).suffix.lower() or ".jpg"
    return ext if ext in {".jpg", ".jpeg", ".png", ".webp", ".gif"} else ".jpg"


def _open_license(license_name: str) -> bool:
    low = license_name.lower()
    if any(bad in low for bad in ("non-free", "nonfree", "fair use", "all rights reserved", "copyrighted")):
        return False
    return any(
        ok in low
        for ok in (
            "cc0",
            "cc-by",
            "cc by",
            "cc-sa",
            "public domain",
            "gfdl",
            "no restrictions",
            "pd-",
        )
    ) or low.strip() in {"pd", "cc0"}


def fetch_seed_photos(
    seed_root: Optional[Path] = None,
    output_dir: Optional[Path] = None,
    mock: Optional[bool] = None,
    limit_monuments: Optional[int] = None,
    max_images: int = 2,
    zone_ids: Optional[Sequence[str]] = None,
    allow_mock_fallback: bool = True,
) -> List[SeedFetchResult]:
    """CLI-friendly entrypoint used by scripts and benchmarks."""
    monuments = load_monuments_from_seed(seed_root=seed_root, limit=limit_monuments, zone_ids=zone_ids)
    fetcher = WikimediaSeedFetcher(
        output_dir=output_dir,
        mock=mock,
        allow_mock_fallback=allow_mock_fallback,
    )
    return fetcher.fetch_all(monuments, max_images=max_images)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Fetch open-licensed heritage seed photos")
    parser.add_argument("--seed-root", type=Path, default=None)
    parser.add_argument("--output-dir", type=Path, default=None)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--max-images", type=int, default=4)
    parser.add_argument("--live", action="store_true", help="Hit Wikimedia (default is mock)")
    parser.add_argument("--priority-zones", action="store_true")
    parser.add_argument("--strict", action="store_true", help="Do not write mock images when Commons has no hit")
    parser.add_argument("--add", type=int, default=0, help="Harvest up to N more live Commons photos per monument")
    parser.add_argument("--only", default="", help="Comma-separated monument ids to harvest with --add")
    args = parser.parse_args()
    if args.only and not args.add:
        parser.error("--only needs --add")

    if args.add:
        only = set(filter(None, args.only.split(",")))
        fetcher = WikimediaSeedFetcher(output_dir=args.output_dir, mock=False)
        harvested = {
            m.monument_id: fetcher.harvest_additional(m, args.add)
            for m in load_monuments_from_seed(seed_root=args.seed_root)
            if not only or m.monument_id in only
        }
        print(json.dumps(harvested, indent=2, ensure_ascii=False))
    else:
        results = fetch_seed_photos(
            seed_root=args.seed_root,
            output_dir=args.output_dir,
            mock=not args.live,
            limit_monuments=args.limit or None,
            max_images=args.max_images,
            zone_ids=PRIORITY_ZONE_IDS if args.priority_zones else None,
            allow_mock_fallback=not args.strict,
        )
        print(json.dumps([r.to_dict() for r in results], indent=2))
