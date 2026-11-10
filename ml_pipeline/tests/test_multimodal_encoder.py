"""Tests for multimodal encoder (fake/deterministic path)."""

from __future__ import annotations

import os

import numpy as np
import pytest
from PIL import Image

from ml_pipeline.embeddings.multimodal_encoder import (
    DeterministicEncoder,
    MultimodalEncoder,
    create_encoder,
    extract_multi_crops,
    torch_available,
)


def test_env_forces_fake(sharp_image: Image.Image) -> None:
    os.environ["SAALIK_ML_FAKE"] = "1"
    enc = create_encoder(backend="dinov2", embedding_dim=64)
    assert enc.backend == "fake"
    vec = enc.encode_image(sharp_image)
    assert vec.shape == (64,)
    assert np.isfinite(vec).all()
    assert pytest.approx(float(np.linalg.norm(vec)), rel=1e-5) == 1.0


def test_deterministic_same_image(sharp_image: Image.Image) -> None:
    enc = DeterministicEncoder(embedding_dim=128)
    a = enc.encode_image(sharp_image)
    b = enc.encode_image(sharp_image)
    np.testing.assert_allclose(a, b)


def test_different_images_differ(sharp_image: Image.Image) -> None:
    other = Image.new("RGB", sharp_image.size, color=(10, 200, 30))
    enc = DeterministicEncoder(embedding_dim=128)
    a = enc.encode_image(sharp_image)
    b = enc.encode_image(other)
    assert float(np.linalg.norm(a - b)) > 0.05


def test_multi_crop_shapes(sharp_image: Image.Image) -> None:
    sil, detail = extract_multi_crops(sharp_image, detail_scale=0.45)
    assert sil.size == sharp_image.size
    assert detail.size[0] < sharp_image.size[0]
    assert detail.size[1] < sharp_image.size[1]

    enc = MultimodalEncoder(backend="fake", embedding_dim=96, force_fake=True)
    result = enc.encode_multi_crop(sharp_image)
    assert result.dim == 96
    assert result.silhouette_embedding.shape == (96,)
    assert result.detail_embedding.shape == (96,)
    assert result.fused_embedding.shape == (96,)
    assert pytest.approx(float(np.linalg.norm(result.fused_embedding)), rel=1e-4) == 1.0


def test_encode_batch_and_text(sharp_image: Image.Image) -> None:
    enc = create_encoder(backend="fake", embedding_dim=48, force_fake=True)
    batch = enc.encode_batch([sharp_image, sharp_image])
    assert batch.shape == (2, 48)
    text_vec = enc.encode_text("Kasthamandap Kathmandu")
    assert text_vec.shape == (48,)


def test_force_fake_even_if_torch_present(sharp_image: Image.Image) -> None:
    enc = MultimodalEncoder(backend="clip", force_fake=True, embedding_dim=32)
    assert enc.backend == "fake"
    assert enc.encode_image(sharp_image).shape == (32,)


def test_torch_available_is_bool() -> None:
    assert isinstance(torch_available(), bool)
