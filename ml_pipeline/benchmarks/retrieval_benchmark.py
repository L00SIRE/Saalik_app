"""Compute Recall@K, MRR, and a confusion matrix for monument retrieval."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
from PIL import Image, ImageDraw

from ml_pipeline.embeddings.multimodal_encoder import MultimodalEncoder, create_encoder
from ml_pipeline.seed_scraper.wikimedia_fetcher import (
    MonumentSeed,
    WikimediaSeedFetcher,
    load_monuments_from_seed,
)

DEFAULT_PLOT_DIR = Path(__file__).resolve().parent / "output_plots"


@dataclass
class BenchmarkResult:
    recall_at_1: float
    recall_at_3: float
    mrr: float
    n_queries: int
    n_gallery: int
    label_names: List[str] = field(default_factory=list)
    confusion_matrix: List[List[int]] = field(default_factory=list)
    plot_path: Optional[str] = None
    details: Dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, object]:
        return asdict(self)


def compute_recall_at_k(ranks: Sequence[int], k: int) -> float:
    """``ranks`` are 1-indexed ranks of the true label (1 = top hit)."""
    if not ranks:
        return 0.0
    hits = sum(1 for r in ranks if 1 <= r <= k)
    return float(hits) / float(len(ranks))


def compute_mrr(ranks: Sequence[int]) -> float:
    if not ranks:
        return 0.0
    return float(sum(1.0 / float(r) for r in ranks if r >= 1) / len(ranks))


def cosine_similarity_matrix(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    a_n = a / np.clip(np.linalg.norm(a, axis=1, keepdims=True), 1e-12, None)
    b_n = b / np.clip(np.linalg.norm(b, axis=1, keepdims=True), 1e-12, None)
    return a_n @ b_n.T


def _save_confusion_matrix_png(
    matrix: np.ndarray,
    labels: Sequence[str],
    out_path: Path,
    cell: int = 28,
) -> Path:
    """Render a simple confusion matrix image without matplotlib."""
    n = len(labels)
    margin_left = 120
    margin_top = 40
    margin_bottom = 120
    margin_right = 20
    width = margin_left + n * cell + margin_right
    height = margin_top + n * cell + margin_bottom
    img = Image.new("RGB", (width, height), (248, 246, 242))
    draw = ImageDraw.Draw(img)

    max_val = float(matrix.max()) if matrix.size else 1.0
    max_val = max(max_val, 1.0)

    for i in range(n):
        for j in range(n):
            val = int(matrix[i, j])
            intensity = int(255 - (val / max_val) * 180)
            color = (intensity, intensity, 230 if i == j else intensity)
            x0 = margin_left + j * cell
            y0 = margin_top + i * cell
            draw.rectangle([x0, y0, x0 + cell - 1, y0 + cell - 1], fill=color, outline=(90, 90, 90))
            if val > 0:
                draw.text((x0 + 6, y0 + 6), str(val), fill=(10, 10, 10))

    for i, label in enumerate(labels):
        short = label if len(label) <= 16 else label[:14] + "…"
        draw.text((4, margin_top + i * cell + 6), short, fill=(20, 20, 20))
        # Rotate-like vertical labels approximated as truncated bottom labels.
        draw.text((margin_left + i * cell + 2, margin_top + n * cell + 8), short[:8], fill=(20, 20, 20))

    draw.text((margin_left, 8), "Predicted →", fill=(30, 30, 30))
    draw.text((4, 8), "True ↓", fill=(30, 30, 30))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path)
    return out_path


class RetrievalBenchmark:
    """End-to-end gallery/query retrieval evaluation for heritage monuments."""

    def __init__(
        self,
        encoder: Optional[MultimodalEncoder] = None,
        plot_dir: Optional[Path] = None,
    ) -> None:
        self.encoder = encoder or create_encoder(backend="fake", force_fake=True)
        self.plot_dir = Path(plot_dir) if plot_dir else DEFAULT_PLOT_DIR
        self.plot_dir.mkdir(parents=True, exist_ok=True)

    def run_from_seed(
        self,
        seed_root: Optional[Path] = None,
        image_root: Optional[Path] = None,
        limit_monuments: int = 6,
        images_per_monument: int = 2,
        mock_fetch: bool = True,
    ) -> BenchmarkResult:
        monuments = load_monuments_from_seed(seed_root=seed_root, limit=limit_monuments)
        fetcher = WikimediaSeedFetcher(output_dir=image_root, mock=mock_fetch)
        results = fetcher.fetch_all(monuments, max_images=images_per_monument)

        labeled_paths: List[Tuple[str, Path]] = []
        for monument, result in zip(monuments, results):
            for path in result.paths:
                labeled_paths.append((monument.monument_id, path))

        return self.evaluate_labeled_images(labeled_paths)

    def evaluate_labeled_images(
        self,
        labeled_paths: Sequence[Tuple[str, Path]],
        plot_name: str = "confusion_matrix.png",
    ) -> BenchmarkResult:
        if len(labeled_paths) < 2:
            raise ValueError("Need at least two labeled images for retrieval benchmark")

        labels = [lab for lab, _ in labeled_paths]
        unique_labels = sorted(set(labels))
        label_to_idx = {lab: i for i, lab in enumerate(unique_labels)}

        embeddings = []
        for _, path in labeled_paths:
            emb = self.encoder.encode_multi_crop(path).fused_embedding
            embeddings.append(emb)
        gallery = np.stack(embeddings, axis=0)
        sims = cosine_similarity_matrix(gallery, gallery)

        ranks: List[int] = []
        confusion = np.zeros((len(unique_labels), len(unique_labels)), dtype=np.int64)

        for q_idx, true_label in enumerate(labels):
            scores = sims[q_idx].copy()
            scores[q_idx] = -np.inf  # exclude self
            order = np.argsort(-scores)
            # Rank of first gallery item with the same label
            rank = None
            for r, g_idx in enumerate(order, start=1):
                if labels[int(g_idx)] == true_label:
                    rank = r
                    break
            if rank is None:
                rank = len(order)
            ranks.append(rank)

            pred_idx = int(order[0])
            confusion[label_to_idx[true_label], label_to_idx[labels[pred_idx]]] += 1

        plot_path = _save_confusion_matrix_png(
            confusion,
            unique_labels,
            self.plot_dir / plot_name,
        )

        result = BenchmarkResult(
            recall_at_1=compute_recall_at_k(ranks, 1),
            recall_at_3=compute_recall_at_k(ranks, 3),
            mrr=compute_mrr(ranks),
            n_queries=len(ranks),
            n_gallery=len(labeled_paths),
            label_names=unique_labels,
            confusion_matrix=confusion.tolist(),
            plot_path=str(plot_path),
            details={"mean_rank": float(np.mean(ranks))},
        )

        metrics_path = self.plot_dir / "metrics.json"
        metrics_path.write_text(json.dumps(result.to_dict(), indent=2), encoding="utf-8")
        return result


def run_cli_benchmark(
    limit_monuments: int = 6,
    images_per_monument: int = 2,
) -> BenchmarkResult:
    bench = RetrievalBenchmark(encoder=create_encoder(backend="fake", force_fake=True))
    return bench.run_from_seed(
        limit_monuments=limit_monuments,
        images_per_monument=images_per_monument,
        mock_fetch=True,
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run Saalik retrieval benchmark")
    parser.add_argument("--limit", type=int, default=6)
    parser.add_argument("--images-per-monument", type=int, default=2)
    args = parser.parse_args()
    out = run_cli_benchmark(limit_monuments=args.limit, images_per_monument=args.images_per_monument)
    print(json.dumps(out.to_dict(), indent=2))
