"""PyTorch multimodal visual encoder with DINOv2 / SigLIP / CLIP backends.

Tests and CI must not download large model weights. When
``SAALIK_ML_FAKE=1`` is set, or when torch / transformers backends are
unavailable, a deterministic fake encoder with the same public interface
is used instead.
"""

from __future__ import annotations

import hashlib
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import List, Literal, Optional, Sequence, Tuple, Union

import numpy as np
from PIL import Image

PathLike = Union[str, Path]
ImageInput = Union[PathLike, Image.Image, np.ndarray]
BackendName = Literal["dinov2", "siglip", "clip", "fake"]


def _env_flag(name: str, default: str = "0") -> bool:
    return os.environ.get(name, default).strip().lower() in {"1", "true", "yes", "on"}


def torch_available() -> bool:
    try:
        import torch  # noqa: F401
        return True
    except Exception:  # noqa: BLE001
        return False


def _load_pil(image: ImageInput) -> Image.Image:
    if isinstance(image, Image.Image):
        return image.convert("RGB")
    if isinstance(image, (str, Path)):
        return Image.open(image).convert("RGB")
    if isinstance(image, np.ndarray):
        arr = image
        if arr.ndim == 2:
            return Image.fromarray(arr.astype(np.uint8), mode="L").convert("RGB")
        if arr.ndim == 3 and arr.shape[2] == 3:
            # Treat ndarray as RGB for encoder API consistency.
            return Image.fromarray(arr.astype(np.uint8), mode="RGB")
        raise ValueError(f"Unsupported ndarray shape: {arr.shape}")
    raise TypeError(f"Unsupported image input: {type(image)!r}")


def extract_multi_crops(
    image: ImageInput,
    detail_scale: float = 0.45,
) -> Tuple[Image.Image, Image.Image]:
    """Return (full silhouette crop, center iconographic detail crop)."""
    pil = _load_pil(image)
    w, h = pil.size
    # Full architectural silhouette: keep entire frame (optional slight letterbox noop).
    silhouette = pil.copy()

    side = max(1, int(min(w, h) * detail_scale))
    left = max(0, (w - side) // 2)
    top = max(0, (h - side) // 2)
    detail = pil.crop((left, top, left + side, top + side))
    return silhouette, detail


@dataclass
class MultiCropResult:
    """Embedding bundle for silhouette + detail crops."""

    silhouette_embedding: np.ndarray
    detail_embedding: np.ndarray
    fused_embedding: np.ndarray
    backend: str
    dim: int

    def as_list(self) -> List[np.ndarray]:
        return [self.silhouette_embedding, self.detail_embedding, self.fused_embedding]


def _l2_normalize(vec: np.ndarray, eps: float = 1e-12) -> np.ndarray:
    norm = float(np.linalg.norm(vec))
    if norm < eps:
        return vec.astype(np.float32)
    return (vec / norm).astype(np.float32)


def _fuse_embeddings(a: np.ndarray, b: np.ndarray, alpha: float = 0.6) -> np.ndarray:
    fused = alpha * a + (1.0 - alpha) * b
    return _l2_normalize(fused)


class BaseEncoder(ABC):
    """Shared encoder interface for fake and torch backends."""

    backend: str
    embedding_dim: int

    @abstractmethod
    def encode_image(self, image: ImageInput) -> np.ndarray:
        raise NotImplementedError

    def encode_multi_crop(self, image: ImageInput, detail_scale: float = 0.45) -> MultiCropResult:
        silhouette, detail = extract_multi_crops(image, detail_scale=detail_scale)
        sil_emb = self.encode_image(silhouette)
        det_emb = self.encode_image(detail)
        fused = _fuse_embeddings(sil_emb, det_emb)
        return MultiCropResult(
            silhouette_embedding=sil_emb,
            detail_embedding=det_emb,
            fused_embedding=fused,
            backend=self.backend,
            dim=self.embedding_dim,
        )

    def encode_batch(self, images: Sequence[ImageInput]) -> np.ndarray:
        vectors = [self.encode_image(img) for img in images]
        return np.stack(vectors, axis=0)

    def encode_text(self, text: str) -> np.ndarray:
        """Optional text pathway (SigLIP/CLIP). Fake encoder always supports it."""
        raise NotImplementedError(f"{self.backend} does not implement encode_text")


class DeterministicEncoder(BaseEncoder):
    """Hash-based deterministic encoder used for tests and offline CI.

    Produces stable L2-normalized float32 vectors from image pixel content
    (and optionally text) without downloading model weights.
    """

    def __init__(self, embedding_dim: int = 384, backend: str = "fake") -> None:
        if embedding_dim < 8:
            raise ValueError("embedding_dim must be >= 8")
        self.embedding_dim = embedding_dim
        self.backend = backend

    def _digest_to_vector(self, digest: bytes) -> np.ndarray:
        needed = self.embedding_dim
        buf = bytearray()
        counter = 0
        while len(buf) < needed * 4:
            h = hashlib.sha256(digest + counter.to_bytes(4, "little")).digest()
            buf.extend(h)
            counter += 1
        raw = np.frombuffer(bytes(buf[: needed * 4]), dtype=np.uint32).astype(np.float64)
        # Map uint32 into [-1, 1]
        centered = (raw / np.float64(2**32 - 1)) * 2.0 - 1.0
        return _l2_normalize(centered.astype(np.float32))

    def encode_image(self, image: ImageInput) -> np.ndarray:
        pil = _load_pil(image).resize((64, 64))
        pixels = np.asarray(pil, dtype=np.uint8).tobytes()
        digest = hashlib.sha256(pixels).digest()
        return self._digest_to_vector(digest)

    def encode_text(self, text: str) -> np.ndarray:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        return self._digest_to_vector(digest)


class TorchVisionEncoder(BaseEncoder):
    """Lazy-loading wrapper around DINOv2 / SigLIP / CLIP via transformers or torchvision."""

    MODEL_IDS = {
        "dinov2": "facebook/dinov2-base",
        "siglip": "google/siglip-base-patch16-224",
        "clip": "openai/clip-vit-base-patch32",
    }

    def __init__(
        self,
        backend: BackendName = "dinov2",
        device: Optional[str] = None,
        embedding_dim: Optional[int] = None,
    ) -> None:
        if backend not in self.MODEL_IDS:
            raise ValueError(f"Unsupported torch backend: {backend}")
        if not torch_available():
            raise RuntimeError("PyTorch is not available; use DeterministicEncoder / fake mode")

        import torch

        self.backend = backend
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self._torch = torch
        self._model = None
        self._processor = None
        self._embedding_dim_override = embedding_dim
        self.embedding_dim = embedding_dim or 768

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return
        try:
            from transformers import AutoImageProcessor, AutoModel, CLIPModel, CLIPProcessor
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(
                "transformers is required for torch backends; install transformers "
                "or set SAALIK_ML_FAKE=1"
            ) from exc

        model_id = self.MODEL_IDS[self.backend]
        if self.backend == "clip":
            self._processor = CLIPProcessor.from_pretrained(model_id)
            self._model = CLIPModel.from_pretrained(model_id).to(self.device)
            self._model.eval()
            self.embedding_dim = int(
                self._embedding_dim_override or self._model.config.projection_dim
            )
            return

        self._processor = AutoImageProcessor.from_pretrained(model_id)
        self._model = AutoModel.from_pretrained(model_id).to(self.device)
        self._model.eval()
        hidden = getattr(self._model.config, "hidden_size", None)
        self.embedding_dim = int(self._embedding_dim_override or hidden or 768)

    def encode_image(self, image: ImageInput) -> np.ndarray:
        self._ensure_loaded()
        assert self._model is not None and self._processor is not None
        pil = _load_pil(image)
        torch = self._torch

        with torch.no_grad():
            if self.backend == "clip":
                inputs = self._processor(images=pil, return_tensors="pt")
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
                feats = self._model.get_image_features(**inputs)
                vec = feats[0].detach().cpu().numpy().astype(np.float32)
                return _l2_normalize(vec)

            inputs = self._processor(images=pil, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            outputs = self._model(**inputs)
            if hasattr(outputs, "pooler_output") and outputs.pooler_output is not None:
                feats = outputs.pooler_output
            else:
                # DINOv2 / ViT: mean-pool last hidden state
                feats = outputs.last_hidden_state.mean(dim=1)
            vec = feats[0].detach().cpu().numpy().astype(np.float32)
            return _l2_normalize(vec)

    def encode_text(self, text: str) -> np.ndarray:
        if self.backend not in {"clip", "siglip"}:
            raise NotImplementedError(f"{self.backend} does not support text encoding")
        self._ensure_loaded()
        assert self._model is not None and self._processor is not None
        torch = self._torch

        with torch.no_grad():
            if self.backend == "clip":
                inputs = self._processor(text=[text], return_tensors="pt", padding=True)
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
                feats = self._model.get_text_features(**inputs)
                vec = feats[0].detach().cpu().numpy().astype(np.float32)
                return _l2_normalize(vec)

            # SigLIP via transformers AutoModel typically exposes get_text_features
            # when loaded as a vision-text dual encoder; fall back to hashing if absent.
            if hasattr(self._model, "get_text_features"):
                inputs = self._processor(text=[text], return_tensors="pt", padding=True)
                inputs = {k: v.to(self.device) for k, v in inputs.items() if k.startswith("input")}
                feats = self._model.get_text_features(**inputs)
                vec = feats[0].detach().cpu().numpy().astype(np.float32)
                return _l2_normalize(vec)

        # Safe fallback keeps interface usable without brittle SigLIP text wiring.
        return DeterministicEncoder(self.embedding_dim).encode_text(text)


class MultimodalEncoder(BaseEncoder):
    """Public facade selecting fake or torch backends."""

    def __init__(
        self,
        backend: BackendName = "dinov2",
        embedding_dim: int = 384,
        device: Optional[str] = None,
        force_fake: Optional[bool] = None,
    ) -> None:
        use_fake = force_fake if force_fake is not None else (
            _env_flag("SAALIK_ML_FAKE", "1" if not torch_available() else "0")
            or backend == "fake"
            or not torch_available()
        )
        if use_fake:
            self._impl: BaseEncoder = DeterministicEncoder(embedding_dim=embedding_dim, backend="fake")
        else:
            self._impl = TorchVisionEncoder(backend=backend, device=device, embedding_dim=embedding_dim)

        self.backend = self._impl.backend
        self.embedding_dim = self._impl.embedding_dim

    def encode_image(self, image: ImageInput) -> np.ndarray:
        return self._impl.encode_image(image)

    def encode_multi_crop(self, image: ImageInput, detail_scale: float = 0.45) -> MultiCropResult:
        return self._impl.encode_multi_crop(image, detail_scale=detail_scale)

    def encode_batch(self, images: Sequence[ImageInput]) -> np.ndarray:
        return self._impl.encode_batch(images)

    def encode_text(self, text: str) -> np.ndarray:
        return self._impl.encode_text(text)


def create_encoder(
    backend: BackendName = "dinov2",
    embedding_dim: int = 384,
    device: Optional[str] = None,
    force_fake: Optional[bool] = None,
) -> MultimodalEncoder:
    """Factory used by benchmarks and scrapers."""
    return MultimodalEncoder(
        backend=backend,
        embedding_dim=embedding_dim,
        device=device,
        force_fake=force_fake,
    )
