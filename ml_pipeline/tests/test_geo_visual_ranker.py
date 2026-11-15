"""Two-stage geo-visual ranker and the pyramid views it scores (pure numpy, no torch)."""

from __future__ import annotations

import numpy as np
from PIL import Image

from ml_pipeline.embeddings.geo_visual_ranker import GeoVisualRanker, RankerConfig, instance_weights
from ml_pipeline.embeddings.multimodal_encoder import (
    PYRAMID_WEIGHTS,
    center_biased_views,
    create_encoder,
    fuse_views,
)

HERE = (27.7040, 85.3070)
LAT_PER_M = 1 / 111_320.0


def north_of_here(metres: float) -> tuple:
    return (HERE[0] + metres * LAT_PER_M, HERE[1])


def build(vectors, owner, text, coords, text_weight=0.0, geo_weight=0.0) -> GeoVisualRanker:
    return GeoVisualRanker(
        ids=[f"m{i}" for i in range(len(text))],
        coords=np.array(coords, dtype=float),
        text=np.array(text, dtype=np.float32),
        vectors=np.array(vectors, dtype=np.float32),
        owner=np.array(owner),
        weights=np.ones(len(owner)),
        config=RankerConfig(text_weight=text_weight, geo_weight=geo_weight, geo_sigma_m=25.0, noisy_weight=1.0),
    )


def top(ranker: GeoVisualRanker, query, fix=None, top_k=3) -> list:
    return [match["monumentId"] for match in ranker.rank(np.array(query, dtype=np.float32), fix, top_k=top_k)]


def test_best_photo_beats_a_monument_that_only_resembles_the_average() -> None:
    # m0 has two very different views; m1's single photo sits near m0's centroid (cosine 0.99 to it).
    ranker = build(
        vectors=[[1, 0, 0], [0, 1, 0], [0.8, 0.6, 0]],
        owner=[0, 0, 1],
        text=[[0, 0, 1], [0, 0, 1]],
        coords=[HERE, HERE],
    )
    # A centroid gallery would score m0 at 0.707 and lose to m1 at 0.8.
    assert top(ranker, [1, 0, 0])[0] == "m0"


def test_photo_that_reads_as_its_neighbour_is_downweighted() -> None:
    text = np.array([[1, 0], [0, 1], [0, 1]], dtype=np.float32)
    coords = np.array([HERE, north_of_here(20), north_of_here(5_000)])
    vectors = np.array([[1, 0], [0.2, 0.98], [0.2, 0.98]], dtype=np.float32)
    owner = np.array([0, 0, 0])
    weights = instance_weights(vectors, owner, text, coords, confusable=[[], [], []], noisy_weight=0.35)
    # The second photo matches the cue text of m1, 20 m away, better than its own.
    assert weights.tolist() == [1.0, 0.35, 0.35]

    far_only = instance_weights(vectors, owner, text[[0, 2]], coords[[0, 2]], confusable=[[], []], noisy_weight=0.35)
    assert far_only.tolist() == [1.0, 1.0, 1.0]
    listed = instance_weights(vectors, owner, text[[0, 2]], coords[[0, 2]], confusable=[[1], []], noisy_weight=0.35)
    assert listed.tolist() == [1.0, 0.35, 0.35]


def test_stage_two_text_evidence_flips_a_visual_near_tie() -> None:
    query = [0.99, 0.141, 0]
    kwargs = dict(
        vectors=[[1, 0, 0], [0.98, 0.199, 0]],
        owner=[0, 1],
        text=[query, [0, 0, 1]],
        coords=[HERE, HERE],
    )
    assert top(build(**kwargs), query)[0] == "m1"
    assert top(build(**kwargs, text_weight=0.02), query)[0] == "m0"


def test_stage_two_proximity_prior_flips_a_visual_near_tie() -> None:
    query = [0.99, 0.141, 0]
    kwargs = dict(
        vectors=[[1, 0, 0], [0.98, 0.199, 0]],
        owner=[0, 1],
        text=[[0, 0, 1], [0, 0, 1]],
        coords=[HERE, north_of_here(60)],
    )
    assert top(build(**kwargs), query, fix=HERE)[0] == "m1"
    assert top(build(**kwargs, geo_weight=0.12), query, fix=HERE)[0] == "m0"


def test_monuments_beyond_150_m_are_not_candidates() -> None:
    ranker = build(
        vectors=[[0.9, 0.436, 0], [1, 0, 0]],
        owner=[0, 1],
        text=[[0, 0, 1], [0, 0, 1]],
        coords=[HERE, north_of_here(500)],
    )
    assert top(ranker, [1, 0, 0]) == ["m1", "m0"]
    assert top(ranker, [1, 0, 0], fix=HERE) == ["m0"]
    assert ranker.rank(np.array([1, 0, 0], dtype=np.float32), north_of_here(5_000)) == []


def test_only_the_top_five_reach_stage_two() -> None:
    similarities = [0.99, 0.98, 0.97, 0.96, 0.95, 0.94]
    query = np.eye(8, dtype=np.float32)[0]
    vectors = [s * query + np.sqrt(1 - s * s) * np.eye(8, dtype=np.float32)[i + 1] for i, s in enumerate(similarities)]
    # The sixth monument has overwhelming text evidence but the weakest visual score.
    text = [np.eye(8, dtype=np.float32)[7]] * 5 + [query]
    ranker = build(vectors, list(range(6)), text, [HERE] * 6, text_weight=5.0)
    assert top(ranker, query, top_k=6) == ["m0", "m1", "m2", "m3", "m4"]


def test_bundle_round_trip_keeps_the_ranking() -> None:
    ranker = build(
        vectors=[[1, 0, 0], [0, 1, 0], [0.8, 0.6, 0]],
        owner=[0, 0, 1],
        text=[[1, 0, 0], [0, 0, 1]],
        coords=[HERE, north_of_here(40)],
        text_weight=0.01,
        geo_weight=0.12,
    )
    restored = GeoVisualRanker.from_bundle(ranker.to_bundle(["a.jpg", "b.jpg", "c.jpg"]))
    assert restored.config == ranker.config
    for query in ([1, 0, 0], [0.6, 0.8, 0]):
        assert top(restored, query, fix=HERE) == top(ranker, query, fix=HERE)


def test_pyramid_views_and_fusion() -> None:
    image = Image.linear_gradient("L").resize((200, 100)).convert("RGB")
    full, centre70, centre50, mirrored = center_biased_views(image)
    assert [view.size for view in (full, centre70, centre50, mirrored)] == [(200, 100), (140, 70), (100, 50), (140, 70)]
    assert mirrored.tobytes() == centre70.transpose(Image.Transpose.FLIP_LEFT_RIGHT).tobytes()
    assert PYRAMID_WEIGHTS == (0.35, 0.35, 0.20, 0.10)

    views = create_encoder(force_fake=True).encode_views(image)
    assert views.shape[0] == 4
    fused = fuse_views(views)
    expected = np.asarray(PYRAMID_WEIGHTS, dtype=np.float32) @ views
    assert np.allclose(fused, expected / np.linalg.norm(expected), atol=1e-6)
    assert abs(float(np.linalg.norm(fused)) - 1.0) < 1e-5
