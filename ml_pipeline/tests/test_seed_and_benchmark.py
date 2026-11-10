import os
from pathlib import Path

os.environ["SAALIK_ML_FAKE"] = "1"
os.environ["SAALIK_SEED_MOCK"] = "1"

from ml_pipeline.benchmarks.retrieval_benchmark import RetrievalBenchmark, compute_mrr, compute_recall_at_k
from ml_pipeline.seed_scraper.wikimedia_fetcher import WikimediaSeedFetcher, load_monuments_from_seed


def test_load_monuments_from_seed_corpus():
    monuments = load_monuments_from_seed()
    assert len(monuments) >= 50
    assert any(m.zone_id == "kathmandu_durbar" for m in monuments)


def test_mock_fetcher_writes_images(tmp_path: Path):
    fetcher = WikimediaSeedFetcher(output_dir=tmp_path, mock=True)
    monuments = load_monuments_from_seed(limit=3)
    results = fetcher.fetch_all(monuments, max_images=1)
    assert len(results) == 3
    assert all(r.paths for r in results)
    assert all(p.exists() for r in results for p in r.paths)


def test_retrieval_benchmark_metrics_and_outputs(tmp_path: Path):
    assert compute_recall_at_k([1, 2, 4], 1) == 1 / 3
    assert compute_recall_at_k([1, 2, 4], 3) == 2 / 3
    assert abs(compute_mrr([1, 2, 4]) - (1 + 0.5 + 0.25) / 3) < 1e-9

    bench = RetrievalBenchmark(plot_dir=tmp_path)
    result = bench.run_from_seed(limit_monuments=4, images_per_monument=2, mock_fetch=True)
    assert result.n_queries >= 4
    assert 0.0 <= result.recall_at_1 <= 1.0
    assert 0.0 <= result.recall_at_3 <= 1.0
    assert 0.0 <= result.mrr <= 1.0
    assert result.plot_path is not None
    assert Path(result.plot_path).exists()
    assert (tmp_path / "metrics.json").exists()
