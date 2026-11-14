"""Warm CLIP worker for live camera frames.

Keeps openai/clip-vit-base-patch32 on Apple MPS (CPU fallback) and returns the
512-d center-biased pyramid embedding plus the OpenCV quality-gate report. When
the precomputed vector bundle is present it also ranks the frame with the same
two-stage geo-visual ranker the benchmark scores.
"""

from __future__ import annotations

import base64
import io
import json
import time
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI
from PIL import Image
from pydantic import BaseModel

from ml_pipeline.embeddings.geo_visual_ranker import GeoVisualRanker
from ml_pipeline.embeddings.multimodal_encoder import TorchVisionEncoder
from ml_pipeline.quality_gate.image_validator import ImageValidator, QualityThresholds

BUNDLE = Path(__file__).resolve().parents[1] / "data" / "nepal_heritage_seed" / "precomputed_index" / "vector_bundle.json"

app = FastAPI(title="Saalik CLIP worker")
_validator = ImageValidator(QualityThresholds(require_gps=False, min_laplacian_variance=40.0))
_encoder = TorchVisionEncoder("clip")
_ranker: Optional[GeoVisualRanker] = None


class EmbedBody(BaseModel):
    imageBase64: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    accuracyM: Optional[float] = None
    topK: int = 3


@app.on_event("startup")
def warmup() -> None:
    global _ranker
    # Without a bundle the worker still embeds; the backend then ranks against its own index.
    if BUNDLE.exists():
        _ranker = GeoVisualRanker.from_bundle(json.loads(BUNDLE.read_text(encoding="utf-8")))
    _encoder.encode_image(Image.new("RGB", (224, 224), (20, 40, 30)))


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "device": _encoder.device,
        "dim": 512,
        "galleryMonuments": len(_ranker.ids) if _ranker else 0,
        "galleryInstances": len(_ranker.owner) if _ranker else 0,
    }


@app.post("/embed")
def embed(body: EmbedBody) -> dict:
    started = time.perf_counter()
    raw = base64.b64decode(body.imageBase64)
    image = Image.open(io.BytesIO(raw)).convert("RGB")
    image.thumbnail((512, 512))
    quality = _validator.validate(image).to_dict()
    vector = _encoder.encode_image(image)
    response = {
        "vector": [round(float(v), 6) for v in vector.tolist()],
        "dim": int(vector.shape[0]),
        "device": _encoder.device,
        "quality": quality,
    }
    if _ranker is not None:
        fix = (body.lat, body.lng) if body.lat is not None and body.lng is not None else None
        response["matches"] = _ranker.rank(vector, fix, body.accuracyM, body.topK)
    response["elapsedMs"] = round((time.perf_counter() - started) * 1000, 2)
    return response


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8099, log_level="info")
