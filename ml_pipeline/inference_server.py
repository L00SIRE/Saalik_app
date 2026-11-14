"""Warm CLIP worker for live camera frames.

Keeps openai/clip-vit-base-patch32 on Apple MPS (CPU fallback) and returns a
512-d L2-normalized image embedding plus the OpenCV quality-gate report.
"""

from __future__ import annotations

import base64
import io
import time
from typing import Optional

import numpy as np
import torch
import uvicorn
from fastapi import FastAPI
from PIL import Image
from pydantic import BaseModel
from transformers import CLIPModel, CLIPProcessor

from ml_pipeline.quality_gate.image_validator import ImageValidator, QualityThresholds

app = FastAPI(title="Saalik CLIP worker")
_validator = ImageValidator(QualityThresholds(require_gps=False, min_laplacian_variance=40.0))
_model: Optional[CLIPModel] = None
_processor: Optional[CLIPProcessor] = None
_device = "cpu"


def _pick_device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def _load() -> None:
    global _model, _processor, _device
    if _model is not None:
        return
    _device = _pick_device()
    _processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    _model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(_device)
    _model.eval()


class EmbedBody(BaseModel):
    imageBase64: str


@app.on_event("startup")
def warmup() -> None:
    _load()
    blank = Image.new("RGB", (224, 224), (20, 40, 30))
    _encode(blank)


def _encode(image: Image.Image) -> np.ndarray:
    assert _model is not None and _processor is not None
    inputs = _processor(images=image, return_tensors="pt")
    inputs = {key: value.to(_device) for key, value in inputs.items()}
    with torch.no_grad():
        feats = _model.get_image_features(**inputs)
    vec = feats[0].detach().float().cpu().numpy()
    norm = float(np.linalg.norm(vec)) or 1.0
    return vec / norm


@app.get("/health")
def health() -> dict:
    _load()
    return {"ok": True, "device": _device, "dim": 512}


@app.post("/embed")
def embed(body: EmbedBody) -> dict:
    _load()
    started = time.perf_counter()
    raw = base64.b64decode(body.imageBase64)
    image = Image.open(io.BytesIO(raw)).convert("RGB")
    image.thumbnail((512, 512))
    quality = _validator.validate(image).to_dict()
    vector = _encode(image)
    elapsed_ms = (time.perf_counter() - started) * 1000
    return {
        "vector": [round(float(v), 6) for v in vector.tolist()],
        "dim": int(vector.shape[0]),
        "device": _device,
        "quality": quality,
        "elapsedMs": round(elapsed_ms, 2),
    }


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8099, log_level="info")
