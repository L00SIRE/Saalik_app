"""Two-stage geo-visual monument ranker shared by the benchmark and the CLIP worker.

Stage 1 scores each monument near the GPS fix by its best-matching gallery photos.
Stage 2 re-ranks the leading candidates with CLIP text evidence and a GPS proximity prior.
Pure numpy, so the worker and the tests load it without torch.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import List, Optional, Sequence

import numpy as np

NEIGHBOR_RADIUS_M = 40.0


@dataclass(frozen=True)
class RankerConfig:
    text_weight: float  # Stage 2 weight of the z-scored query-to-cue-text similarity
    geo_weight: float  # Stage 2 weight of the proximity prior
    geo_sigma_m: float  # width of the Gaussian proximity prior
    noisy_weight: float  # similarity multiplier for photos that favor a neighbor's cue prompt
    radius_m: float = 150.0  # Stage 1 candidate radius around the GPS fix
    top_n: int = 5  # candidates passed to Stage 2
    max_blend: float = 0.7  # Stage 1 share of the best photo; the rest is the mean of the best two


def haversine_m(fix: Sequence[float], coords: np.ndarray) -> np.ndarray:
    """Great-circle distance in meters from one (lat, lng) to each row of ``coords``."""
    lat1, lng1 = np.radians(fix[0]), np.radians(fix[1])
    lat2, lng2 = np.radians(coords[:, 0]), np.radians(coords[:, 1])
    h = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lng2 - lng1) / 2) ** 2
    return 2 * 6_371_000.0 * np.arcsin(np.sqrt(np.minimum(1.0, h)))


def instance_weights(
    vectors: np.ndarray,
    owner: np.ndarray,
    text: np.ndarray,
    coords: np.ndarray,
    confusable: Sequence[Sequence[int]],
    noisy_weight: float,
) -> np.ndarray:
    """Weight per photo: ``noisy_weight`` when it matches a neighbor's cue prompt better than its own.

    A monument's neighbors are those in ``confusable[m]`` plus every monument within 40 m.
    """
    sims = vectors @ text.T
    neighbors = np.zeros((len(text), len(text)), dtype=bool)
    for m, listed in enumerate(confusable):
        neighbors[m] = haversine_m(coords[m], coords) <= NEIGHBOR_RADIUS_M
        neighbors[m, list(listed)] = True
        neighbors[m, m] = False
    best_neighbor = np.where(neighbors[owner], sims, -np.inf).max(axis=1)
    return np.where(best_neighbor > sims[np.arange(len(owner)), owner], noisy_weight, 1.0)


def _rounded(vec: np.ndarray) -> List[float]:
    return [round(float(x), 4) for x in vec]


@dataclass
class GeoVisualRanker:
    ids: List[str]  # monument ids
    coords: np.ndarray  # (M, 2) lat, lng
    text: np.ndarray  # (M, dim) contrastive cue-text vectors
    vectors: np.ndarray  # (N, dim) gallery instances: photos, or one zero-shot text prototype
    owner: np.ndarray  # (N,) monument index of each instance
    weights: np.ndarray  # (N,) instance weights
    config: RankerConfig

    def rank(
        self,
        query: np.ndarray,
        fix: Optional[Sequence[float]] = None,
        accuracy_m: Optional[float] = None,
        top_k: int = 3,
    ) -> List[dict]:
        cfg = self.config
        accuracy = accuracy_m or 0.0
        sims = self.weights * (self.vectors @ query)
        candidates = np.unique(self.owner)
        distances = None
        if fix is not None:
            distances = haversine_m(fix, self.coords)
            candidates = candidates[distances[candidates] <= cfg.radius_m + accuracy]
        if candidates.size == 0:
            return []

        stage1 = np.empty(len(candidates))
        for i, monument in enumerate(candidates):
            best = np.sort(sims[self.owner == monument])[-2:]
            stage1[i] = cfg.max_blend * best[-1] + (1 - cfg.max_blend) * best.mean()
        top = np.argsort(-stage1, kind="stable")[: cfg.top_n]
        candidates, stage1 = candidates[top], stage1[top]

        text_sim = self.text[candidates] @ query
        text_z = (text_sim - text_sim.mean()) / max(float(text_sim.std()), 1e-6)
        geo = np.zeros(len(candidates))
        if distances is not None:
            # Reported GPS accuracy widens the prior in quadrature.
            log_prior = -distances[candidates] ** 2 / (2 * (cfg.geo_sigma_m**2 + accuracy**2))
            prior = np.exp(log_prior - log_prior.max())
            geo = prior / prior.sum()
        score = stage1 + cfg.text_weight * text_z + cfg.geo_weight * geo

        return [
            {
                "monumentId": self.ids[candidates[i]],
                "score": float(score[i]),
                "stage1": float(stage1[i]),
                "textZ": float(text_z[i]),
                "geo": float(geo[i]),
                "distanceM": None if distances is None else float(distances[candidates[i]]),
            }
            for i in np.argsort(-score, kind="stable")[:top_k]
        ]

    def to_bundle(self, sources: Sequence[str]) -> dict:
        """Ranker section of ``vector_bundle.json``; ``sources`` names each gallery instance."""
        monuments = {}
        for m, monument_id in enumerate(self.ids):
            monuments[monument_id] = {
                "lat": float(self.coords[m, 0]),
                "lng": float(self.coords[m, 1]),
                "text": _rounded(self.text[m]),
                "instances": [
                    {"source": sources[i], "weight": float(self.weights[i]), "vector": _rounded(self.vectors[i])}
                    for i in np.flatnonzero(self.owner == m)
                ],
            }
        return {"ranker": asdict(self.config), "monuments": monuments}

    @classmethod
    def from_bundle(cls, bundle: dict) -> "GeoVisualRanker":
        monuments = bundle["monuments"]
        instances = [(m, row) for m, entry in enumerate(monuments.values()) for row in entry["instances"]]
        return cls(
            ids=list(monuments),
            coords=np.array([[entry["lat"], entry["lng"]] for entry in monuments.values()]),
            text=np.array([entry["text"] for entry in monuments.values()], dtype=np.float32),
            vectors=np.array([row["vector"] for _, row in instances], dtype=np.float32),
            owner=np.array([m for m, _ in instances]),
            weights=np.array([row["weight"] for _, row in instances]),
            config=RankerConfig(**bundle["ranker"]),
        )
