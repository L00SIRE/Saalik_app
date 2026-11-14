"""Tests for Wikimedia / mock seed photo scraper."""

from __future__ import annotations

import io
import random
from pathlib import Path

from PIL import Image, ImageDraw

from ml_pipeline.seed_scraper.wikimedia_fetcher import (
    MonumentSeed,
    WikimediaSeedFetcher,
    dhash,
    fetch_seed_photos,
    is_near_duplicate,
    load_monuments_from_seed,
)


def test_load_monuments_from_seed() -> None:
    monuments = load_monuments_from_seed(limit=5)
    assert len(monuments) == 5
    assert all(isinstance(m, MonumentSeed) for m in monuments)
    assert monuments[0].monument_id
    assert monuments[0].name_en
    assert monuments[0].zone_id
    assert "Nepal" in monuments[0].search_query


def test_mock_fetch_writes_images(tmp_path: Path) -> None:
    monuments = load_monuments_from_seed(limit=2)
    fetcher = WikimediaSeedFetcher(output_dir=tmp_path, mock=True)
    results = fetcher.fetch_all(monuments, max_images=2)

    assert len(results) == 2
    for result in results:
        assert result.source == "mock"
        assert len(result.paths) == 2
        assert len(result.licenses) == 2
        for path in result.paths:
            assert path.exists()
            with Image.open(path) as img:
                assert img.size[0] >= 320
                assert img.size[1] >= 240


def test_fetch_seed_photos_entrypoint(tmp_path: Path) -> None:
    results = fetch_seed_photos(
        output_dir=tmp_path,
        mock=True,
        limit_monuments=3,
        max_images=1,
    )
    assert len(results) == 3
    assert all(r.paths for r in results)
    payload = results[0].to_dict()
    assert "monument_id" in payload
    assert isinstance(payload["paths"], list)


def test_mock_images_differ_across_monuments(tmp_path: Path) -> None:
    monuments = load_monuments_from_seed(limit=3)
    fetcher = WikimediaSeedFetcher(output_dir=tmp_path, mock=True)
    results = fetcher.fetch_all(monuments, max_images=1)
    bytes_set = {path.read_bytes() for r in results for path in r.paths}
    assert len(bytes_set) == 3


def _scene(seed: int) -> Image.Image:
    """Synthetic photo: grey gradient sky with a dozen random building-like blocks."""
    rng = random.Random(seed)
    image = Image.linear_gradient("L").rotate(rng.choice((30, 150, 210, 330))).resize((800, 600)).convert("RGB")
    draw = ImageDraw.Draw(image)
    for _ in range(12):
        left, top = rng.randrange(0, 700), rng.randrange(0, 500)
        shade = rng.randrange(0, 256)
        draw.rectangle([left, top, left + rng.randrange(60, 260), top + rng.randrange(60, 260)], fill=(shade, shade, shade))
    return image


def test_dhash_flags_same_frame_but_not_a_different_photo(tmp_path: Path) -> None:
    original = _scene(1)

    buffer = io.BytesIO()
    original.resize((400, 300)).save(buffer, format="JPEG", quality=50)
    reupload = Image.open(io.BytesIO(buffer.getvalue()))
    cropped = original.crop((12, 9, 788, 591))

    assert is_near_duplicate(dhash(original), dhash(original))
    assert is_near_duplicate(dhash(original), dhash(reupload))
    assert is_near_duplicate(dhash(original), dhash(cropped))
    assert not is_near_duplicate(dhash(original), dhash(_scene(2)))
    # Mock mode must never reach the network or add files.
    assert WikimediaSeedFetcher(output_dir=tmp_path, mock=True).harvest_additional(MonumentSeed("x", "X", "z"), add=3) == []
