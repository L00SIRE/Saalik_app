"""Tests for retrieval metrics and benchmark runner."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest

from ml_pipeline.benchmarks.retrieval_benchmark import (
    RetrievalBenchmark,
    compute_mrr,
    compute_recall_at_k,
    cosine_similarity_matrix,
    run_cli_benchmark,
)
from ml_pipeline.embeddings.multimodal_encoder import create_encoder
from ml_pipeline.seed_scraper.wikimedia_fetcher import WikimediaSeedFetcher, load_monuments_from_seed


def test_recall_and_mrr_helpers() -> None:
    ranks = [1, 2, 3, 5]
    assert compute_recall_at_k(ranks, 1) == pytest.approx(0.25)
    assert compute_recall_at_k(ranks, 3) == pytest.approx(0.75)
    assert compute_mrr(ranks) == pytest.approx((1 + 1 / 2 + 1 / 3 + 1 / 5) / 4)
    assert compute_recall_at_k([], 1) == 0.0
    assert compute_mrr([]) == 0.0


def test_cosine_similarity_matrix() -> None:
    a = np.array([[1.0, 0.0], [0.0, 1.0]], dtype=np.float32)
    b = np.array([[1.0, 0.0], [0.0, 1.0]], dtype=np.float32)
    sims = cosine_similarity_matrix(a, b)
    np.testing.assert_allclose(sims, np.eye(2), atol=1e-6)


def test_benchmark_on_mock_seed(tmp_path: Path) -> None:
    plot_dir = tmp_path / "plots"
    image_root = tmp_path / "images"
    encoder = create_encoder(backend="fake", force_fake=True, embedding_dim=64)
    bench = RetrievalBenchmark(encoder=encoder, plot_dir=plot_dir)

    result = bench.run_from_seed(
        image_root=image_root,
        limit_monuments=4,
        images_per_monument=2,
        mock_fetch=True,
    )

    assert result.n_queries == 8
    assert result.n_gallery == 8
    assert 0.0 <= result.recall_at_1 <= 1.0
    assert 0.0 <= result.recall_at_3 <= 1.0
    assert 0.0 <= result.mrr <= 1.0
    assert result.recall_at_3 >= result.recall_at_1
    assert result.plot_path is not None
    assert Path(result.plot_path).exists()
    assert (plot_dir / "metrics.json").exists()
    assert len(result.confusion_matrix) == len(result.label_names)


def test_evaluate_labeled_images_direct(tmp_path: Path) -> None:
    monuments = load_monuments_from_seed(limit=3)
    fetcher = WikimediaSeedFetcher(output_dir=tmp_path / "raw", mock=True)
    fetched = fetcher.fetch_all(monuments, max_images=2)
    labeled = [(r.monument_id, p) for r in fetched for p in r.paths]

    bench = RetrievalBenchmark(
        encoder=create_encoder(force_fake=True, embedding_dim=32),
        plot_dir=tmp_path / "out",
    )
    result = bench.evaluate_labeled_images(labeled, plot_name="cm.png")
    payload = result.to_dict()
    assert payload["n_queries"] == 6
    assert "recall_at_1" in payload


def test_run_cli_benchmark_smoke() -> None:
    result = run_cli_benchmark(limit_monuments=3, images_per_monument=2)
    assert result.n_gallery == 6
