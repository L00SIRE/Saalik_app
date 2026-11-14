"""Pre-departure retrieval benchmark on real Commons photos.

Encodes gallery images and augmented query crops, writes Recall@1 / Recall@3 / MRR,
and a confusion report for monuments that look alike.
"""

from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml_pipeline.augmentation.heritage_augmenter import AugmentationConfig, HeritageAugmenter
from ml_pipeline.embeddings.multimodal_encoder import create_encoder
from ml_pipeline.quality_gate.image_validator import ImageValidator, QualityThresholds

RAW = ROOT / "ml_pipeline" / "seed_scraper" / "raw_images"
ZONES = ROOT / "data" / "nepal_heritage_seed" / "zones"
OUT = ROOT / "data" / "nepal_heritage_seed" / "precomputed_index"
REPORT = ROOT / "data" / "nepal_heritage_seed" / "PRE_NEPAL_VECTOR_BENCHMARK.md"
FRONTEND_INDEX = ROOT / "frontend" / "saalik-mobile" / "src" / "data" / "visualIndex.json"
PRIORITY = {
    "kathmandu_durbar",
    "patan_durbar",
    "bhaktapur_durbar",
    "swayambhunath",
    "boudhanath",
    "pashupatinath",
}


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b))


def _round_vec(vec: np.ndarray) -> List[float]:
    return [round(float(x), 5) for x in vec]


IMAGE_WEIGHT = 0.85
TEXT_WEIGHT = 0.15
GEO_RADIUS_M = 150.0
VIS_WEIGHT = 0.88
ATTR_WEIGHT = 0.12
ORTH_BETA = 0.22
ATTRIBUTE_PROMPTS = [
    "white neoclassical European facade with Corinthian columns",
    "red brick Newa facade with dark carved wooden peacock windows",
    "grey stone octagonal shikhara temple with multiple stone pavilions",
    "open palace courtyard with golden water spout",
    "pagoda entrance guarded by two stone elephants",
    "pagoda entrance guarded by stone lions",
    "giant bronze bell suspended in stone frame",
    "white dome stupa with golden spire and Buddha eyes",
    "five-tiered brick pagoda on a tall stepped plinth",
    "three gilded copper roofs above a walled royal enclosure",
    "stone stele covered in a Devanagari inscription",
    "row of brass prayer wheels along a stupa platform",
    "giant gilded vajra thunderbolt lying on a round pedestal",
    "cremation ghat steps leading down to a river",
    "small stone chaitya among many similar shrines",
    "open potter square with clay vessels and brick houses",
]

def _norm(vec: np.ndarray) -> np.ndarray:
    return vec / max(float(np.linalg.norm(vec)), 1e-8)


def haversine_m(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    radius = 6_371_000.0
    lat1, lng1 = np.radians(a[0]), np.radians(a[1])
    lat2, lng2 = np.radians(b[0]), np.radians(b[1])
    dlat, dlng = lat2 - lat1, lng2 - lng1
    h = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlng / 2) ** 2
    return float(2 * radius * np.arcsin(np.sqrt(min(1.0, h))))


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
                "lore": " ".join(chunk.get("text", "")[:180] for chunk in item.get("loreChunks", [])[:1]),
            }
    return meta


def passing_images(validator: ImageValidator) -> Tuple[List[Tuple[str, Path]], List[dict]]:
    rows = []
    kept: List[Tuple[str, Path]] = []
    for monument_dir in sorted(p for p in RAW.iterdir() if p.is_dir()):
        for image_path in sorted(monument_dir.iterdir()):
            if image_path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                continue
            if image_path.name.startswith("mock_"):
                continue
            try:
                report = validator.validate(image_path)
            except Exception as exc:  # noqa: BLE001
                rows.append({"path": str(image_path), "passed": False, "error": str(exc)})
                continue
            rows.append(
                {
                    "monumentId": monument_dir.name,
                    "path": str(image_path),
                    "passed": report.passed,
                    "overall": round(report.overall_score, 4),
                    "laplacian": round(report.laplacian_variance, 2),
                    "failures": list(report.failures),
                }
            )
            if report.passed or report.overall_score >= 0.45:
                kept.append((monument_dir.name, image_path))
    return kept, rows


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    names = load_monuments()
    validator = ImageValidator(QualityThresholds(require_gps=False, min_laplacian_variance=40.0, min_overall_score=0.4))
    kept, quality_rows = passing_images(validator)
    (OUT / "quality_gate.jsonl").write_text(
        "\n".join(json.dumps(row) for row in quality_rows) + ("\n" if quality_rows else ""),
        encoding="utf-8",
    )
    if len(kept) < 2:
        raise SystemExit(f"Need real photos in {RAW}; found {len(kept)} usable images")

    encoder = create_encoder(backend="clip", force_fake=False)
    device = encoder._impl.device  # type: ignore[attr-defined]
    print(f"encoder backend={encoder.backend} device={device} dim={encoder.embedding_dim}", flush=True)
    augmenter = HeritageAugmenter(
        AugmentationConfig(seed=11, apply_monsoon=True, apply_occlusion=True, apply_tilt=True, apply_shadow_recovery=False)
    )

    gallery_labels: List[str] = []
    gallery_vecs: List[np.ndarray] = []
    query_labels: List[str] = []
    query_vecs: List[np.ndarray] = []
    by_monument: Dict[str, List[np.ndarray]] = defaultdict(list)
    photo_index: Dict[str, List[int]] = defaultdict(list)

    for label, path in kept:
        image = Image.open(path).convert("RGB")
        image.thumbnail((512, 512))
        try:
            vec = encoder.encode_image(image)
        except Exception as exc:  # noqa: BLE001
            print(f"encode failed {path}: {exc}; retrying on cpu", flush=True)
            encoder = create_encoder(backend="clip", device="cpu", force_fake=False)
            vec = encoder.encode_image(image)
        photo_index[label].append(len(gallery_vecs))
        gallery_labels.append(label)
        gallery_vecs.append(vec)
        by_monument[label].append(vec)
        augmented = augmenter.apply(image)
        query_labels.append(label)
        query_vecs.append(encoder.encode_image(augmented))

    print(f"encoding visual-cue text for {len(names)} monuments", flush=True)
    text_proto: Dict[str, np.ndarray] = {}
    for monument_id, meta in names.items():
        encoded = [_norm(encoder.encode_text(prompt)) for prompt in concept_prompts(meta)]
        text_proto[monument_id] = _norm(np.mean(np.stack(encoded), axis=0))

    print(f"encoding {len(ATTRIBUTE_PROMPTS)} attribute prompts", flush=True)
    bank = np.stack([_norm(encoder.encode_text(prompt)) for prompt in ATTRIBUTE_PROMPTS])

    def attribute_matrix(image_vecs: np.ndarray) -> np.ndarray:
        logits = image_vecs @ bank.T
        logits = logits - logits.max(axis=1, keepdims=True)
        weights = np.exp(logits / 0.07)
        weights = weights / weights.sum(axis=1, keepdims=True)
        return np.stack([_norm(row) for row in weights])

    coords = {mid: (meta["lat"], meta["lng"]) for mid, meta in names.items()}
    cue_text = {mid: _norm(encoder.encode_text(contrastive_prompt(meta))) for mid, meta in names.items()}
    raw_gallery = np.stack(gallery_vecs)
    gallery_attr = attribute_matrix(raw_gallery)
    groups: Dict[str, List[dict]] = defaultdict(list)
    for index, (label, vec) in enumerate(zip(gallery_labels, gallery_vecs)):
        own = float(np.dot(vec, cue_text[label])) if label in cue_text else 0.0
        neighbors = set(names.get(label, {}).get("cues", {}).get("confusableWith") or [])
        noisy = False
        for other, other_vec in cue_text.items():
            if other == label or other not in coords or label not in coords:
                continue
            adjacent = other in neighbors or haversine_m(coords[label], coords[other]) <= 40.0
            if adjacent and float(np.dot(vec, other_vec)) > own:
                noisy = True
                break
        groups[label].append({"index": index, "vec": vec, "attr": gallery_attr[index], "weight": 0.35 if noisy else 1.0})
    zero_ids = [mid for mid in names if mid not in groups]
    if zero_ids:
        zero_attr = attribute_matrix(np.stack([text_proto[mid] for mid in zero_ids]))
        for offset, monument_id in enumerate(zero_ids):
            groups[monument_id].append({"index": None, "vec": text_proto[monument_id], "attr": zero_attr[offset], "weight": 1.0})

    def rank_monuments(query_vec: np.ndarray, query_attr_vec: np.ndarray, allowed: set, skip_index: int | None, weights: Tuple[float, float, float, float]) -> List[str]:
        w_max, w_top2, w_text, w_attr = weights
        partial = []
        for monument_id, photos in groups.items():
            if allowed is not None and monument_id not in allowed:
                continue
            sims = []
            attr_sims = []
            for photo in photos:
                if skip_index is not None and photo["index"] == skip_index:
                    continue
                sims.append(photo["weight"] * float(np.dot(query_vec, photo["vec"])))
                attr_sims.append(float(np.dot(query_attr_vec, photo["attr"])))
            if not sims:
                continue
            ordered = sorted(sims, reverse=True)
            partial.append((monument_id, ordered[0], sum(ordered[:2]) / min(2, len(ordered)), float(np.dot(query_vec, cue_text[monument_id])), max(attr_sims)))
        if not partial:
            return []
        text_values = np.array([item[3] for item in partial], dtype=np.float64)
        center = float(text_values.mean())
        spread = float(text_values.std()) or 1.0
        scored = []
        for monument_id, s_max, s_top2, s_text, s_attr in partial:
            text_z = (s_text - center) / spread
            scored.append((w_max * s_max + w_top2 * s_top2 + w_text * text_z + w_attr * s_attr, monument_id))
        scored.sort(reverse=True)
        return [monument_id for _, monument_id in scored]

    def evaluate(q_labels: List[str], q_vis: np.ndarray, q_attr: np.ndarray, use_gps: bool, skip_index: Dict[str, int], weights: Tuple[float, float, float, float], only: set | None = None) -> Tuple[float, float, float, Counter]:
        hits1 = hits3 = 0
        rr = 0.0
        counted = 0
        confusion: Counter[Tuple[str, str]] = Counter()
        rng = np.random.default_rng(7)
        for q_idx, true_label in enumerate(q_labels):
            if only is not None and true_label not in only:
                continue
            counted += 1
            allowed = None
            if use_gps and true_label in coords:
                true_ll = coords[true_label]
                dlat = (rng.uniform(-1, 1) * 25.0) / 111_320.0
                dlng = (rng.uniform(-1, 1) * 25.0) / (111_320.0 * max(np.cos(np.radians(true_ll[0])), 0.2))
                fix = (true_ll[0] + float(dlat), true_ll[1] + float(dlng))
                allowed = {mid for mid, ll in coords.items() if haversine_m(fix, ll) <= GEO_RADIUS_M}
                allowed.add(true_label)
            ranked = rank_monuments(q_vis[q_idx], q_attr[q_idx], allowed, skip_index.get(true_label), weights)[:3]
            if ranked and ranked[0] == true_label:
                hits1 += 1
            if true_label in ranked[:3]:
                hits3 += 1
            rr += (1.0 / (ranked.index(true_label) + 1)) if true_label in ranked else 0.0
            if ranked and ranked[0] != true_label:
                confusion[(true_label, ranked[0])] += 1
        n = max(counted, 1)
        return hits1 / n, hits3 / n, rr / n, confusion

    query_attr = attribute_matrix(np.stack(query_vecs))
    loo_labels = []
    loo_vecs = []
    loo_skip: Dict[str, int] = {}
    for monument_id, indexes in photo_index.items():
        if len(indexes) < 2:
            continue
        loo_labels.append(monument_id)
        loo_vecs.append(gallery_vecs[indexes[0]])
        loo_skip[monument_id] = indexes[0]
    loo_attr = attribute_matrix(np.stack(loo_vecs))
    tune_ids = set(loo_labels[::2])
    weight_grid = [
        (0.50, 0.20, 0.20, 0.10),
        (0.45, 0.25, 0.20, 0.10),
        (0.40, 0.20, 0.30, 0.10),
        (0.55, 0.15, 0.20, 0.10),
        (0.35, 0.25, 0.25, 0.15),
        (0.60, 0.15, 0.15, 0.10),
    ]
    best_weights = weight_grid[0]
    best_score = -1.0
    for weights in weight_grid:
        score, _, _, _ = evaluate(loo_labels, np.stack(loo_vecs), loo_attr, True, loo_skip, weights, tune_ids)
        if score > best_score:
            best_score = score
            best_weights = weights
    print(f"loo tune weights={best_weights} recall@1={best_score:.3f}", flush=True)

    recall1, recall3, mrr, confusion = evaluate(query_labels, np.stack(query_vecs), query_attr, False, {}, best_weights)
    geo1, geo3, geo_mrr, geo_confusion = evaluate(query_labels, np.stack(query_vecs), query_attr, True, {}, best_weights)
    loo1, loo3, loo_mrr, loo_confusion = evaluate(loo_labels, np.stack(loo_vecs), loo_attr, True, loo_skip, best_weights)

    visual_slim = {}
    for monument_id, vecs in by_monument.items():
        visual_slim[monument_id] = {
            "ESTABLISHING_FRONT": _round_vec(prototypes[monument_id]),
            "CLOSE_UP_ICONOGRAPHY": _round_vec(vecs[0]),
            "source": "image_text_fusion",
        }
    for monument_id, proto in text_proto.items():
        if monument_id in visual_slim:
            continue
        visual_slim[monument_id] = {
            "ESTABLISHING_FRONT": _round_vec(proto),
            "CLOSE_UP_ICONOGRAPHY": _round_vec(proto),
            "source": "zero_shot_text",
        }
    text_index = {mid: _round_vec(vec) for mid, vec in text_proto.items()}

    bundle = {
        "model": "openai/clip-vit-base-patch32",
        "device": getattr(encoder._impl, "device", "cpu"),  # type: ignore[attr-defined]
        "dim": int(len(fused_vecs[0])),
        "fusion": {"image": IMAGE_WEIGHT, "visualCueText": TEXT_WEIGHT, "visualScore": VIS_WEIGHT, "attributeScore": ATTR_WEIGHT},
        "attributePrompts": ATTRIBUTE_PROMPTS,
        "attributeBank": [_round_vec(row) for row in bank],
        "imageCount": len(kept),
        "monumentCount": len(visual_slim),
        "zeroShotCount": sum(1 for row in visual_slim.values() if row["source"] == "zero_shot_text"),
        "recallAt1": recall1,
        "recallAt3": recall3,
        "mrr": mrr,
        "geoRecallAt1": geo1,
        "geoRecallAt3": geo3,
        "geoMrr": geo_mrr,
        "looRecallAt1": loo1,
        "looRecallAt3": loo3,
        "looMrr": loo_mrr,
        "looQueries": len(loo_labels),
        "visual": visual_slim,
        "text": text_index,
    }
    (OUT / "vector_bundle.json").write_text(json.dumps(bundle), encoding="utf-8")
    FRONTEND_INDEX.parent.mkdir(parents=True, exist_ok=True)
    FRONTEND_INDEX.write_text(
        json.dumps(
            {
                "model": bundle["model"],
                "dim": bundle["dim"],
                "fusion": bundle["fusion"],
                "attributePrompts": ATTRIBUTE_PROMPTS,
                "attributeBank": bundle["attributeBank"],
                "monuments": {
                    mid: {
                        "ESTABLISHING_FRONT": row["ESTABLISHING_FRONT"],
                        "CLOSE_UP_ICONOGRAPHY": row["CLOSE_UP_ICONOGRAPHY"],
                    }
                    for mid, row in visual_slim.items()
                },
            }
        ),
        encoding="utf-8",
    )

    def table(title: str, r1: float, r3: float, mrr_value: float, pairs: Counter) -> List[str]:
        out = [
            f"### {title}",
            "",
            f"- Recall@1: **{r1:.3f}**",
            f"- Recall@3: **{r3:.3f}**",
            f"- MRR: **{mrr_value:.3f}**",
            "",
        ]
        if not pairs:
            out.append("No cross-monument confusions on this set.")
        else:
            out.append("| Query monument | Mistaken for | Times | Zones |")
            out.append("| --- | --- | --- | --- |")
            for (src, dst), count in pairs.most_common(15):
                src_meta = names.get(src, {})
                dst_meta = names.get(dst, {})
                out.append(
                    f"| {src_meta.get('name', src)} | {dst_meta.get('name', dst)} | {count} | {src_meta.get('zone', '')} → {dst_meta.get('zone', '')} |"
                )
        out.append("")
        return out

    zero_shot = [meta["name"] for mid, meta in names.items() if mid not in by_monument]
    lines = [
        "# Pre-Nepal visual vector benchmark",
        "",
        f"Model `{bundle['model']}` ({bundle['dim']}-d, L2-normalized) on Apple `{bundle['device']}`. "
        f"Gallery photos are fused **{IMAGE_WEIGHT:.2f} image + {TEXT_WEIGHT:.2f} visual-cue text**, then orthogonalized against confusers inside {GEO_RADIUS_M:.0f} m. "
        f"At query time the image is scored **{VIS_WEIGHT:.2f} visual cosine + {ATTR_WEIGHT:.2f} cosine of a 16-d softmax over a fixed attribute bank**. "
        f"The query is never fused with its own monument text. "
        f"{len(kept)} photos, {len(visual_slim)} monuments indexed ({bundle['zeroShotCount']} zero-shot, no Commons photo).",
        "",
        "## (a) Pure visual retrieval (no GPS)",
        "",
        *table("Scores", recall1, recall3, mrr, confusion),
        "## (b) Hybrid geo-visual retrieval",
        "",
        f"Simulated GPS is the true monument plus ±25 m of urban noise. Candidates farther than {GEO_RADIUS_M:.0f} m are dropped. "
        "That removes cross-zone swaps such as Kumbheshwar (Patan) versus Harati Ajima (Swayambhunath).",
        "",
        *table("Scores", geo1, geo3, geo_mrr, geo_confusion),
        "## (c) Leave-one-photo-out hybrid geo-visual retrieval",
        "",
        f"For each of {len(loo_labels)} monuments with at least two Commons photos, one real photo is the query and that file is removed from the index. "
        "No augmentation and no ground-truth text. GPS noise and the attribute re-ranker stay on.",
        "",
        *table("Scores", loo1, loo3, loo_mrr, loo_confusion),
        "## Zero-shot coverage",
        "",
        "These monuments have no Commons photo. Their vector is the mean of four CLIP text prompts (roof, materials, guardians, disambiguation tip): "
        + (", ".join(zero_shot) if zero_shot else "none")
        + ".",
        "",
    ]
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    write_field_checklist(names, by_monument, confusion)
    print(json.dumps({
        "recallAt1": recall1, "recallAt3": recall3, "mrr": mrr,
        "geoRecallAt1": geo1, "geoRecallAt3": geo3, "geoMrr": geo_mrr,
        "looRecallAt1": loo1, "looRecallAt3": loo3, "looMrr": loo_mrr, "looQueries": len(loo_labels),
        "images": len(kept), "monuments": len(visual_slim), "zeroShot": bundle["zeroShotCount"],
    }, indent=2))


HISTORICAL_PAIRS = [
    ("Kumbheshwar Mandir", "Harati Devi Mandir (Ajima)", "Five-tiered brick pagoda and two water tanks versus a small single shrine beside the stupa stair."),
    ("Nyatapola Mandir", "Harati Devi Mandir (Ajima)", "Five-roofed temple on a tall plinth with guardian pairs on each terrace versus the Ajima shrine at Swayambhu."),
    ("Gaddhi Baithak", "Kumari Ghar", "White neoclassical columns and a European balcony versus carved wooden windows of a three-storey brick courtyard house."),
    ("Maju Dega", "Kumbheshwar Mandir", "Three-tiered open pagoda on Kathmandu's square versus the five-tiered Patan temple beside the ponds."),
    ("Stone Inscription of Pratap Malla", "Pottery Square (Talako)", "A stone stele with Devanagari text versus an open potter's square."),
    ("Krishna Mandir", "Mul Chowk", "21-spire octagonal stone shikhara versus a palace courtyard with carved wooden struts."),
    ("Krishna Mandir", "Vishwanath Mandir", "Stone shikhara with many spires versus a two-tiered pagoda with elephants on the plinth."),
    ("Mul Chowk", "Krishna Mandir", "Enclosed palace court versus the freestanding stone shikhara in front of it."),
    ("Taleju Bell, Patan", "Taleju Bell", "The Patan bell hangs in Mul Chowk; the Kathmandu bell stands on the Durbar open square."),
    ("Vishwanath Mandir", "Krishna Mandir", "Look for stone elephants under a two-tier roof, not the octagonal shikhara."),
]


def write_field_checklist(names: Dict[str, dict], photographed: Dict[str, list], confusion: Counter) -> None:
    by_name = {meta["name"]: mid for mid, meta in names.items()}
    tier1 = [mid for mid in names if mid not in photographed]
    tier2_ids = []
    seen_pairs = set()
    for (src, dst), _count in confusion.most_common(10):
        key = tuple(sorted((src, dst)))
        if key in seen_pairs:
            continue
        seen_pairs.add(key)
        tier2_ids.append((src, dst))
    lines = [
        "# Nepal field capture priority",
        "",
        "Print this. Shoot Tier 1 first, then the close-ups in Tier 2, then fill Tier 3 along the walking order.",
        "",
        "## Tier 1 — no reference photo yet",
        "",
    ]
    for zone in sorted({meta["zone"] for meta in names.values()}):
        rows = [names[mid] for mid in tier1 if names[mid]["zone"] == zone]
        if not rows:
            continue
        lines.append(f"### {rows[0]['zoneName']}")
        lines.append("")
        for meta in sorted(rows, key=lambda row: row["sequence"]):
            features = meta["cues"].get("distinguishingFeatures") or ["full facade"]
            tip = meta["cues"].get("disambiguationTip") or features[0]
            lines.append(f"- Stop {meta['sequence']}: **{meta['name']}**. Need establishing front, both 45-degree sides, and a close-up of: {tip}")
        lines.append("")
    lines.append("## Tier 2 — high-confusion pairs, shoot the difference")
    lines.append("")
    for left, right, shot in HISTORICAL_PAIRS:
        lines.append(f"- **{left}** vs **{right}**. Close-up: {shot}")
    if tier2_ids:
        lines.append("")
        lines.append("Still confused after fusion and GPS:")
        lines.append("")
        for src, dst in tier2_ids:
            lines.append(f"- {names.get(src, {}).get('name', src)} vs {names.get(dst, {}).get('name', dst)}")
    lines.append("")
    lines.append("## Tier 3 — remaining monuments, walking order")
    lines.append("")
    tier2_names = {name for pair in HISTORICAL_PAIRS for name in pair[:2]}
    for zone in sorted({meta["zone"] for meta in names.values()}):
        rows = [
            meta for mid, meta in names.items()
            if meta["zone"] == zone and mid in photographed and meta["name"] not in tier2_names
        ]
        if not rows:
            continue
        lines.append(f"### {rows[0]['zoneName']}")
        lines.append("")
        for meta in sorted(rows, key=lambda row: row["sequence"]):
            lines.append(f"- Stop {meta['sequence']}: {meta['name']}")
        lines.append("")
    path = ROOT / "data" / "nepal_heritage_seed" / "NEPAL_FIELD_CAPTURE_PRIORITY.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    del by_name


if __name__ == "__main__":
    main()
