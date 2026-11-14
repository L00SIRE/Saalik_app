"""Pre-departure retrieval benchmark on real Commons photos.

Encodes the gallery (CLIP pyramid views cached per photo), tunes the two-stage
geo-visual ranker on a tuning split, scores augmented and leave-one-photo-out
queries, and exports the vector bundle, the mobile visual index, the benchmark
report and the field capture checklist.
"""

from __future__ import annotations

import base64
import hashlib
import json
import sys
import zlib
from collections import Counter
from dataclasses import replace
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml_pipeline.augmentation.heritage_augmenter import AugmentationConfig, HeritageAugmenter
from ml_pipeline.embeddings.geo_visual_ranker import (
    NEIGHBOR_RADIUS_M,
    GeoVisualRanker,
    RankerConfig,
    haversine_m,
    instance_weights,
)
from ml_pipeline.embeddings.multimodal_encoder import PYRAMID_WEIGHTS, TorchVisionEncoder, create_encoder, fuse_views
from ml_pipeline.quality_gate.image_validator import ImageValidator, QualityThresholds

MODEL_ID = TorchVisionEncoder.MODEL_IDS["clip"]
RAW = ROOT / "ml_pipeline" / "seed_scraper" / "raw_images"
SEED = ROOT / "data" / "nepal_heritage_seed"
ZONES = SEED / "zones"
OUT = SEED / "precomputed_index"
REPORT = SEED / "PRE_NEPAL_VECTOR_BENCHMARK.md"
CHECKLIST = SEED / "NEPAL_FIELD_CAPTURE_PRIORITY.md"
FRONTEND_INDEX = ROOT / "frontend" / "saalik-mobile" / "src" / "data" / "visualIndex.json"
CACHE = Path(__file__).resolve().parent / ".cache"
PRIORITY = {
    "kathmandu_durbar",
    "patan_durbar",
    "bhaktapur_durbar",
    "swayambhunath",
    "boudhanath",
    "pashupatinath",
}

GPS_NOISE_M = 25.0
STANDOFF_M = (10.0, 35.0)
NEAR_DUPLICATE_COSINE = 0.95
THIN_GALLERY = 4
THIN_MARGIN = 0.02
LATENCY_CALLS = 50
EXTRA_ANGLES = ("LEFT_45", "RIGHT_45", "CLOSE_UP_ICONOGRAPHY", "WIDE_COURTYARD_CONTEXT")

# Tuning grid, ordered so that ties resolve to the least intervention.
NOISY_WEIGHTS = (1.0, 0.95, 0.9, 0.8, 0.6, 0.35)
GEO_SIGMAS_M = (60.0, 40.0, 25.0, 15.0)
TEXT_WEIGHTS = (0.0, 0.01, 0.02, 0.03, 0.04, 0.06)
GEO_WEIGHTS = (0.0, 0.02, 0.04, 0.06, 0.08, 0.12)

Query = Tuple[int, str, np.ndarray, Sequence[int]]  # monument index, photo path, vector, gallery rows to drop


def contrastive_prompt(meta: dict) -> str:
    cues = meta["cues"]
    materials = ", ".join(str(item).replace("_", " ") for item in cues.get("primaryMaterials") or [])
    guardians = ", ".join(cues.get("guardianVahanas") or []) or "no animal guardians"
    tiers = cues.get("roofTiers") or 0
    roof = f"{tiers}-tiered roof" if tiers else "no tiered pagoda roof"
    tip = cues.get("disambiguationTip") or ""
    return f"{meta['name']}. {roof}. Materials: {materials}. Guardians: {guardians}. {tip}"[:220]


def concept_prompts(meta: dict) -> List[str]:
    cues = meta["cues"]
    materials = ", ".join(str(m).replace("_", " ") for m in cues.get("primaryMaterials") or [])
    guardians = ", ".join(cues.get("guardianVahanas") or [])
    features = "; ".join((cues.get("distinguishingFeatures") or [])[:3])
    tiers = cues.get("roofTiers") or 0
    roof = f"{tiers}-tiered roof" if tiers else "no tiered pagoda roof"
    name = meta["name"]
    zone = meta["zoneName"]
    return [
        f"photo of {name} in {zone}, Nepal, {roof}, {materials}"[:220],
        f"{name}: {features}"[:220],
        f"{name} guardians and iconography: {guardians or features}"[:220],
        (cues.get("disambiguationTip") or f"{name} {meta['type']}")[:220],
    ]


def load_monuments() -> Dict[str, dict]:
    meta: Dict[str, dict] = {}
    for path in sorted(ZONES.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        zone_id = str(payload.get("zoneId") or path.stem)
        if zone_id not in PRIORITY:
            continue
        zone_name = (payload.get("names") or {}).get("en") or zone_id
        for item in payload.get("monuments", []):
            stop = item.get("walkingTourStop") or {}
            meta[item["id"]] = {
                "name": item["names"]["en"],
                "zone": zone_id,
                "zoneName": zone_name,
                "type": item.get("monumentType", ""),
                "lat": item["geo"]["lat"],
                "lng": item["geo"]["lng"],
                "sequence": int(stop.get("sequence") or 999),
                "cues": item.get("visualCues") or {},
                "angles": [row["angle"] for row in (item.get("fieldPhotoSpec") or {}).get("angles") or []],
            }
    return meta


def passing_images(validator: ImageValidator, names: Dict[str, dict]) -> Tuple[List[Tuple[str, Path]], List[dict]]:
    rows = []
    kept: List[Tuple[str, Path]] = []
    for monument_dir in sorted(p for p in RAW.iterdir() if p.is_dir() and p.name in names):
        for image_path in sorted(monument_dir.iterdir()):
            if image_path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                continue
            if image_path.name.startswith("mock_"):
                continue
            rel = image_path.relative_to(ROOT).as_posix()
            try:
                report = validator.validate(image_path)
            except Exception as exc:  # noqa: BLE001
                rows.append({"path": rel, "passed": False, "error": str(exc)})
                continue
            rows.append(
                {
                    "monumentId": monument_dir.name,
                    "path": rel,
                    "passed": report.passed,
                    "overall": round(report.overall_score, 4),
                    "laplacian": round(report.laplacian_variance, 2),
                    "failures": list(report.failures),
                }
            )
            if report.passed or report.overall_score >= 0.45:
                kept.append((monument_dir.name, image_path))
    return kept, rows


def cached_views(encoder, path: Path) -> np.ndarray:
    """CLIP pyramid views of a photo (rows 0-3) and of its augmented field query (rows 4-7)."""
    rel = path.relative_to(ROOT).as_posix()
    stat = path.stat()
    key = hashlib.sha1(f"{MODEL_ID}|{rel}|{stat.st_size}|{stat.st_mtime_ns}".encode("utf-8")).hexdigest()
    cache_file = CACHE / f"{key}.npy"
    if cache_file.exists():
        return np.load(cache_file)
    image = Image.open(path).convert("RGB")
    image.thumbnail((512, 512))
    # Seeded per photo so the occlusion and tilt do not depend on encoding order.
    augmenter = HeritageAugmenter(
        AugmentationConfig(seed=zlib.crc32(rel.encode("utf-8")), apply_shadow_recovery=False)
    )
    views = np.concatenate([encoder.encode_views(image), encoder.encode_views(augmenter.apply(image))])
    np.save(cache_file, views)
    return views


def simulated_fix(rel: str, true_ll: Sequence[float], standoff: bool) -> Tuple[float, float]:
    """Per-photo GPS fix: the monument +/- 25 m per axis, optionally after a 10-35 m standoff."""
    rng = np.random.default_rng(zlib.crc32(rel.encode("utf-8")))
    east, north = rng.uniform(-GPS_NOISE_M, GPS_NOISE_M, size=2)
    if standoff:
        distance, bearing = rng.uniform(*STANDOFF_M), rng.uniform(0.0, 2 * np.pi)
        east += distance * np.sin(bearing)
        north += distance * np.cos(bearing)
    lat, lng = true_ll
    return lat + north / 111_320.0, lng + east / (111_320.0 * np.cos(np.radians(lat)))


def evaluate(
    queries: Sequence[Query],
    gallery: Tuple[List[str], np.ndarray, np.ndarray, np.ndarray, np.ndarray],
    weights: np.ndarray,
    config: RankerConfig,
    gps: Optional[str],
) -> Tuple[dict, List[Tuple[int, List[dict]]]]:
    """Rank every query with the shared ranker. ``gps`` is None, "noise" or "standoff"."""
    ids, coords, text, vectors, owner = gallery
    outcomes = []
    for label, rel, query, drop in queries:
        keep = np.ones(len(owner), dtype=bool)
        keep[list(drop)] = False
        ranker = GeoVisualRanker(ids, coords, text, vectors[keep], owner[keep], weights[keep], config)
        fix = simulated_fix(rel, coords[label], gps == "standoff") if gps else None
        outcomes.append((label, ranker.rank(query, fix)))
    ranks = [
        next((rank for rank, match in enumerate(matches, 1) if match["monumentId"] == ids[label]), None)
        for label, matches in outcomes
    ]
    count = len(ranks)
    metrics = {
        "recallAt1": sum(rank == 1 for rank in ranks) / count,
        "recallAt3": sum(rank is not None for rank in ranks) / count,
        "mrr": sum(1.0 / rank for rank in ranks if rank) / count,
        "queries": count,
    }
    return metrics, outcomes


def angle_slots(vectors: np.ndarray, weights: np.ndarray) -> Dict[str, List[float]]:
    """ESTABLISHING_FRONT is the weighted prototype; further angles are the most mutually distinct photos."""
    prototype = weights @ vectors
    prototype = prototype / np.linalg.norm(prototype)
    slots = {"ESTABLISHING_FRONT": [round(float(x), 4) for x in prototype]}
    # Farthest-point selection favors outliers, so downweighted photos are not eligible.
    pool = vectors[weights == weights.max()]
    if len(pool) < 2:
        return slots
    closest = pool @ prototype
    for angle in EXTRA_ANGLES[: len(pool)]:
        pick = int(np.argmin(closest))
        slots[angle] = [round(float(x), 4) for x in pool[pick]]
        closest = np.maximum(closest, pool @ pool[pick])
    return slots


def measure_embed_latency(samples: Sequence[Tuple[Path, Sequence[float]]]) -> Tuple[float, str]:
    """Warm median of the worker's /embed handler time (decode, quality gate, encode, rank) and its device."""
    from ml_pipeline import inference_server as worker

    worker.warmup()
    elapsed = []
    for path, (lat, lng) in samples:
        body = worker.EmbedBody(imageBase64=base64.b64encode(path.read_bytes()).decode("ascii"), lat=lat, lng=lng)
        elapsed.append(worker.embed(body)["elapsedMs"])
    return float(np.median(elapsed)), worker.health()["device"]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    names = load_monuments()
    ids = sorted(names)
    index = {monument_id: m for m, monument_id in enumerate(ids)}
    validator = ImageValidator(QualityThresholds(require_gps=False, min_laplacian_variance=40.0, min_overall_score=0.4))
    kept, quality_rows = passing_images(validator, names)
    (OUT / "quality_gate.jsonl").write_text(
        "\n".join(json.dumps(row) for row in quality_rows) + ("\n" if quality_rows else ""),
        encoding="utf-8",
    )
    if len(kept) < 2:
        raise SystemExit(f"Need real photos in {RAW}; found {len(kept)} usable images")

    encoder = create_encoder(backend="clip", force_fake=False)
    device = encoder._impl.device  # type: ignore[attr-defined]
    print(f"encoder backend={encoder.backend} device={device}; {len(kept)} photos", flush=True)
    views = [cached_views(encoder, path) for _, path in kept]
    # Vectors are rounded as exported, so the benchmark scores exactly what the bundle ships.
    photos = np.round(np.stack([fuse_views(v[:4]) for v in views]), 4)
    augmented = np.stack([fuse_views(v[4:]) for v in views])
    owner = np.array([index[label] for label, _ in kept])
    rels = [path.relative_to(ROOT).as_posix() for _, path in kept]

    print(f"encoding cue text for {len(ids)} monuments", flush=True)
    text = np.round(np.stack([encoder.encode_text(contrastive_prompt(names[mid])) for mid in ids]), 4)
    coords = np.array([[names[mid]["lat"], names[mid]["lng"]] for mid in ids])
    confusable = [
        [index[other] for other in names[mid]["cues"].get("confusableWith") or [] if other in index] for mid in ids
    ]
    zero_shot = [m for m in range(len(ids)) if m not in set(owner.tolist())]
    prototypes = []
    for m in zero_shot:
        mean = np.mean([encoder.encode_text(prompt) for prompt in concept_prompts(names[ids[m]])], axis=0)
        prototypes.append(np.round(mean / np.linalg.norm(mean), 4))
    vectors = np.concatenate([photos, np.array(prototypes, dtype=np.float32).reshape(-1, photos.shape[1])])
    gallery = (ids, coords, text, vectors, np.concatenate([owner, np.array(zero_shot, dtype=int)]))
    sources = [path.name for _, path in kept] + ["zero_shot_text"] * len(zero_shot)

    def gallery_weights(noisy_weight: float) -> np.ndarray:
        photo_weights = instance_weights(photos, owner, text, coords, confusable, noisy_weight)
        return np.concatenate([photo_weights, np.ones(len(zero_shot))])

    def leave_out(i: int) -> Query:
        # The query photo and same-monument near-duplicates (re-uploads of one frame) leave the gallery.
        same = np.flatnonzero(owner == owner[i])
        return int(owner[i]), rels[i], photos[i], same[photos[same] @ photos[i] >= NEAR_DUPLICATE_COSINE]

    groups = [np.flatnonzero(owner == m) for m in np.unique(owner)]
    groups = [rows for rows in groups if len(rows) >= 2]
    held_out = [leave_out(rows[0]) for rows in groups]
    tuning = [leave_out(i) for rows in groups for i in rows[1:]]
    augmented_queries: List[Query] = [(int(owner[i]), rels[i], augmented[i], ()) for i in range(len(kept))]

    # Tuned only on non-first photos under the standoff GPS model; the held-out first photos are never seen here.
    weights_by_noisy = {noisy: gallery_weights(noisy) for noisy in NOISY_WEIGHTS}
    grid = [
        RankerConfig(text_weight=t, geo_weight=g, geo_sigma_m=s, noisy_weight=n)
        for n in NOISY_WEIGHTS
        for s in GEO_SIGMAS_M
        for t in TEXT_WEIGHTS
        for g in GEO_WEIGHTS
    ]

    def tuning_score(config: RankerConfig) -> Tuple[float, float]:
        metrics, _ = evaluate(tuning, gallery, weights_by_noisy[config.noisy_weight], config, "standoff")
        return metrics["recallAt1"], metrics["mrr"]

    print(f"tuning {len(grid)} configurations on {len(tuning)} queries", flush=True)
    config = max(grid, key=tuning_score)
    weights = weights_by_noisy[config.noisy_weight]
    print(f"tuned {config}", flush=True)

    def score(queries: Sequence[Query], gps: Optional[str], cfg: RankerConfig = config):
        return evaluate(queries, gallery, weights, cfg, gps)

    tuning_metrics, _ = score(tuning, "standoff")
    visual, visual_outcomes = score(augmented_queries, None)
    geo, geo_outcomes = score(augmented_queries, "noise")
    loo, loo_outcomes = score(held_out, "noise")
    ablation = {
        "Stage 1 only": score(held_out, "noise", replace(config, text_weight=0.0, geo_weight=0.0))[0],
        "Stage 1 + text z-score": score(held_out, "noise", replace(config, geo_weight=0.0))[0],
        "Stage 1 + geometric prior": score(held_out, "noise", replace(config, text_weight=0.0))[0],
        "Full two-stage": loo,
    }
    all_photos, all_outcomes = score(held_out + tuning, "noise")
    standoff, _ = score(held_out, "standoff")

    ranker = GeoVisualRanker(*gallery, weights, config)
    bundle = {
        "model": MODEL_ID,
        "device": device,
        "dim": int(photos.shape[1]),
        "pyramidWeights": list(PYRAMID_WEIGHTS),
        "imageCount": len(kept),
        "monumentCount": len(ids),
        "zeroShotCount": len(zero_shot),
        "recallAt1": visual["recallAt1"],
        "recallAt3": visual["recallAt3"],
        "mrr": visual["mrr"],
        "geoRecallAt1": geo["recallAt1"],
        "geoRecallAt3": geo["recallAt3"],
        "geoMrr": geo["mrr"],
        "looRecallAt1": loo["recallAt1"],
        "looRecallAt3": loo["recallAt3"],
        "looMrr": loo["mrr"],
        "looQueries": loo["queries"],
        "looAblation": ablation,
        "looAllPhotos": all_photos,
        "looStandoff": standoff,
        "looTuningSplit": tuning_metrics,
        **ranker.to_bundle(sources),
    }
    # Written before the latency run so the worker loads the gallery it will serve.
    (OUT / "vector_bundle.json").write_text(json.dumps(bundle), encoding="utf-8")
    step = max(1, len(kept) // LATENCY_CALLS)
    latency_ms, latency_device = measure_embed_latency(
        [(path, coords[index[label]]) for label, path in kept[::step][:LATENCY_CALLS]]
    )
    bundle["encodeLatencyMsP50"] = round(latency_ms, 2)
    bundle["encodeLatencyDevice"] = latency_device
    (OUT / "vector_bundle.json").write_text(json.dumps(bundle), encoding="utf-8")

    FRONTEND_INDEX.write_text(
        json.dumps(
            {
                "model": MODEL_ID,
                "dim": bundle["dim"],
                "monuments": {
                    monument_id: angle_slots(ranker.vectors[ranker.owner == m], ranker.weights[ranker.owner == m])
                    for m, monument_id in enumerate(ids)
                },
            }
        ),
        encoding="utf-8",
    )

    photo_counts = Counter(owner.tolist())
    noisy_photos = int((weights[: len(kept)] < 1.0).sum()) if config.noisy_weight < 1.0 else 0
    write_report(
        names, ids, bundle, config, noisy_photos, len(tuning), len(grid),
        [(visual, visual_outcomes), (geo, geo_outcomes), (loo, loo_outcomes)],
        ablation, all_photos, standoff, tuning_metrics,
    )
    write_field_checklist(names, ids, coords, photo_counts, all_outcomes)
    print(json.dumps({key: value for key, value in bundle.items() if key not in {"monuments"}}, indent=2))


def confusions(ids: List[str], outcomes: Sequence[Tuple[int, List[dict]]]) -> Counter:
    return Counter(
        (ids[label], matches[0]["monumentId"])
        for label, matches in outcomes
        if matches and matches[0]["monumentId"] != ids[label]
    )


def write_report(
    names: Dict[str, dict],
    ids: List[str],
    bundle: dict,
    config: RankerConfig,
    noisy_photos: int,
    tuning_queries: int,
    grid_size: int,
    tables: Sequence[Tuple[dict, List[Tuple[int, List[dict]]]]],
    ablation: Dict[str, dict],
    all_photos: dict,
    standoff: dict,
    tuning_metrics: dict,
) -> None:
    def row(label: str, metrics: dict) -> str:
        return (
            f"| {label} | {metrics['queries']} | {metrics['recallAt1']:.3f} "
            f"| {metrics['recallAt3']:.3f} | {metrics['mrr']:.3f} |"
        )

    header = ["| Evaluation | Queries | Recall@1 | Recall@3 | MRR |", "| --- | --- | --- | --- | --- |"]

    def confusion_table(outcomes: Sequence[Tuple[int, List[dict]]]) -> List[str]:
        pairs = confusions(ids, outcomes)
        if not pairs:
            return ["No cross-monument confusions on this set.", ""]
        out = ["| Query monument | Mistaken for | Times | Zones |", "| --- | --- | --- | --- |"]
        for (src, dst), count in pairs.most_common(15):
            out.append(
                f"| {names[src]['name']} | {names[dst]['name']} | {count} "
                f"| {names[src]['zone']} → {names[dst]['zone']} |"
            )
        return out + [""]

    (visual, visual_outcomes), (geo, geo_outcomes), (loo, loo_outcomes) = tables
    zero_shot = [names[mid]["name"] for mid in ids if bundle["monuments"][mid]["instances"][0]["source"] == "zero_shot_text"]
    pyramid = " + ".join(
        f"{weight:.2f} {view}"
        for weight, view in zip(PYRAMID_WEIGHTS, ("full frame", "center 70%", "center 50%", "mirrored center 70%"))
    )
    lines = [
        "# Pre-Nepal visual vector benchmark",
        "",
        "Generated by `ml_pipeline/benchmarks/evaluate_retrieval.py`. Do not edit by hand.",
        "",
        "## Method",
        "",
        f"Model `{bundle['model']}` ({bundle['dim']}-d, L2-normalized) on Apple `{bundle['device']}`. "
        f"Every image is encoded as a center-biased pyramid in one batched forward pass: {pyramid}. "
        f"The gallery is instance-level: each of the {bundle['imageCount']} photos keeps its own vector, "
        f"and a photo that matches the CLIP cue prompt of a neighboring confuser (listed in `confusableWith` "
        f"or within {NEIGHBOR_RADIUS_M:.0f} m) better than its own counts {config.noisy_weight:.2f}x "
        f"({noisy_photos} photos). {bundle['monumentCount']} monuments are indexed, "
        f"{bundle['zeroShotCount']} of them zero-shot.",
        "",
        f"Ranking has two stages, implemented once in `ml_pipeline/embeddings/geo_visual_ranker.py` and used by "
        f"both this benchmark and the inference worker. Stage 1 keeps the monuments within {config.radius_m:.0f} m "
        f"of the GPS fix (all of them without a fix), scores each as {config.max_blend:.2f} x its best photo + "
        f"{1 - config.max_blend:.2f} x the mean of its best two, and passes the top {config.top_n} on. Stage 2 adds "
        f"{config.text_weight:.2f} x the z-scored CLIP similarity between the query and each candidate's contrastive "
        f"cue prompt and {config.geo_weight:.2f} x a Gaussian proximity prior (sigma {config.geo_sigma_m:.0f} m) on the "
        f"distance from the fix to each candidate, both normalized across those {config.top_n} candidates. "
        "The query is never fused with its own label.",
        "",
        "MRR counts the reciprocal rank inside the three returned matches, and zero when the monument is not among them.",
        "",
        "## (a) Pure visual retrieval (no GPS)",
        "",
        "One augmented copy of every gallery photo (monsoon overcast, lower-frame occlusion, perspective tilt) is the query. "
        "The original stays in the gallery, so this measures robustness to field conditions, not to a new photographer.",
        "",
        *header,
        row("Augmented queries, no GPS", visual),
        "",
        *confusion_table(visual_outcomes),
        "## (b) Hybrid geo-visual retrieval",
        "",
        f"Same augmented queries. The simulated GPS fix is the true monument location +/- {GPS_NOISE_M:.0f} m of uniform "
        f"noise per axis, seeded by the photo path. Candidates farther than {config.radius_m:.0f} m are dropped.",
        "",
        *header,
        row("Augmented queries, GPS", geo),
        "",
        *confusion_table(geo_outcomes),
        "## (c) Leave-one-photo-out hybrid geo-visual retrieval",
        "",
        f"For each of the {loo['queries']} monuments with at least two photos, the first photo in sorted order is the "
        f"query and is removed from the gallery, together with any photo of the same monument whose cosine to the query "
        f"is {NEAR_DUPLICATE_COSINE} or higher (a re-upload of the same frame). No augmentation. "
        f"GPS as in (b). These first photos are held out: the tuner never scores them.",
        "",
        *header,
        row("Held-out first photos (headline)", loo),
        "",
        "Ablation on the same held-out queries:",
        "",
        *header,
        *(row(label, metrics) for label, metrics in ablation.items()),
        "",
        "Other leave-one-out rows:",
        "",
        *header,
        row("All photos, every photo takes a turn (includes the tuning split)", all_photos),
        row(
            f"Photographer standoff: held-out queries, fix moved {STANDOFF_M[0]:.0f}-{STANDOFF_M[1]:.0f} m "
            "from the monument before the noise",
            standoff,
        ),
        row("Tuning split: non-first photos, standoff GPS (tuned on, not a result)", tuning_metrics),
        "",
        "Confusions on the held-out queries:",
        "",
        *confusion_table(loo_outcomes),
        "## Tuning protocol",
        "",
        f"The Stage 2 weights, the noisy-photo downweight and the prior width were chosen by a grid search over "
        f"{grid_size} configurations that maximizes Recall@1 (ties: MRR, then the least intervention) on {tuning_queries} "
        f"leave-one-out queries taken only from photos other than each monument's first sorted photo. "
        f"Those tuning queries use the standoff GPS model, so the prior is not fitted to a fix centered on the monument. "
        f"The headline in (c) uses only the held-out first photos; the tuning split scored "
        f"{tuning_metrics['recallAt1']:.3f} and the held-out queries {loo['recallAt1']:.3f}.",
        "",
        "## Encode latency",
        "",
        f"Warm median **{bundle['encodeLatencyMsP50']:.1f} ms** per `/embed` call on `{bundle['encodeLatencyDevice']}`, "
        f"measured over {LATENCY_CALLS} gallery photos through the worker's handler: base64 and JPEG decode, 512 px "
        "thumbnail, quality gate, the four-view CLIP encode and the two-stage ranking. HTTP transport is not included.",
        "",
        "## Zero-shot coverage",
        "",
        "These monuments have no reference photo. Their only gallery vector is the mean of four CLIP text prompts "
        "(roof, materials, guardians, disambiguation tip), which scores far below any photo match, so they surface "
        "only when no photographed monument is in range: " + (", ".join(zero_shot) if zero_shot else "none") + ".",
        "",
        "## Caveats",
        "",
        "- Commons photos by the same uploader can remain in the gallery when one of them is the query. The "
        "near-duplicate guard removes re-uploads of one frame, not a second frame from the same visit.",
        "- Monument coordinates are desk-research approximations. The geometric prior, and the simulated fix that is "
        "drawn around those same coordinates, need field-verified GPS before the prior's gain can be trusted on site.",
        "- The tuning split and the held-out queries come from the same monuments and share gallery photos; "
        "only the query photos are disjoint.",
        "",
    ]
    REPORT.write_text("\n".join(lines), encoding="utf-8")


def write_field_checklist(
    names: Dict[str, dict],
    ids: List[str],
    coords: np.ndarray,
    photo_counts: Counter,
    outcomes: Sequence[Tuple[int, List[dict]]],
) -> None:
    def entry(monument_id: str) -> List[str]:
        meta = names[monument_id]
        count = photo_counts[ids.index(monument_id)]
        return [
            f"- [ ] Stop {meta['sequence']}: **{meta['name']}** ({count} reference photo{'' if count == 1 else 's'})",
            "  - Angles: " + "  ".join(f"[ ] {angle}" for angle in meta["angles"]),
        ]

    def by_zone(monument_ids: Sequence[str]) -> List[str]:
        out: List[str] = []
        for zone in sorted({names[mid]["zone"] for mid in monument_ids}):
            rows = sorted((mid for mid in monument_ids if names[mid]["zone"] == zone), key=lambda mid: names[mid]["sequence"])
            out += [f"### {names[rows[0]]['zoneName']}", ""]
            for monument_id in rows:
                out += entry(monument_id)
            out.append("")
        return out

    confused: Counter = Counter()
    thin: Counter = Counter()
    for label, matches in outcomes:
        if not matches:
            continue
        if matches[0]["monumentId"] != ids[label]:
            confused[(ids[label], matches[0]["monumentId"])] += 1
        elif len(matches) > 1 and matches[0]["score"] - matches[1]["score"] < THIN_MARGIN:
            thin[(ids[label], matches[1]["monumentId"])] += 1
    pairs = sorted(set(confused) | set(thin), key=lambda pair: (-confused[pair], -thin[pair], pair))

    lines = [
        "# Nepal field capture priority",
        "",
        "Generated by `ml_pipeline/benchmarks/evaluate_retrieval.py`. Print this. Shoot Tier 1 first, then the "
        "distinguishing shots in Tier 2, then Tier 3, and take a GPS reading at every monument in the GPS list.",
        "",
        "## Tier 1: no reference photo yet",
        "",
        *by_zone([mid for m, mid in enumerate(ids) if photo_counts[m] == 0]),
        "## Tier 2: pairs still confused or thinly separated after Stage 2",
        "",
        f"From the all-photos leave-one-out run. A thin margin is a correct match that led the runner-up by less than "
        f"{THIN_MARGIN} in score.",
        "",
    ]
    for src, dst in pairs:
        tip = names[src]["cues"].get("disambiguationTip") or "No distinguishing tip recorded; shoot the facade detail."
        lines.append(
            f"- [ ] **{names[src]['name']}** vs **{names[dst]['name']}** "
            f"(mistaken {confused[(src, dst)]}x, thin margin {thin[(src, dst)]}x). Shot at {names[src]['name']}: {tip}"
        )
    if not pairs:
        lines.append("No pair was confused or thinly separated in this run.")
    lines += [
        "",
        f"## Tier 3: thin gallery (fewer than {THIN_GALLERY} photos)",
        "",
        *by_zone([mid for m, mid in enumerate(ids) if 0 < photo_counts[m] < THIN_GALLERY]),
        f"## GPS list: nearest neighbor closer than {NEIGHBOR_RADIUS_M:.0f} m",
        "",
        "Coordinates here are desk research. Record a field-verified GPS reading at each of these, standing at the monument.",
        "",
    ]
    close = []
    for m, monument_id in enumerate(ids):
        distances = haversine_m(coords[m], coords)
        distances[m] = np.inf
        nearest = int(np.argmin(distances))
        if distances[nearest] < NEIGHBOR_RADIUS_M:
            close.append((float(distances[nearest]), monument_id, ids[nearest]))
    for distance, monument_id, nearest_id in sorted(close):
        lines.append(f"- [ ] **{names[monument_id]['name']}**: {distance:.0f} m from {names[nearest_id]['name']}")
    lines += [
        "",
        "## Remaining monuments, walking order",
        "",
        *by_zone([mid for m, mid in enumerate(ids) if photo_counts[m] >= THIN_GALLERY]),
    ]
    CHECKLIST.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
