"""Tests for Wikimedia / mock seed photo scraper."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from ml_pipeline.seed_scraper.wikimedia_fetcher import (
    MonumentSeed,
    WikimediaSeedFetcher,
    fetch_seed_photos,
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
