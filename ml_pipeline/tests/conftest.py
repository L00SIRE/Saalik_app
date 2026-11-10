"""Shared fixtures for ml_pipeline tests."""

from __future__ import annotations

import io
import os
import sys
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

# Ensure repo root is importable when pytest is invoked as
# `pytest ml_pipeline/tests/` from the Saalik_app root.
_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

# Force fake encoder path for the entire test suite.
os.environ.setdefault("SAALIK_ML_FAKE", "1")
os.environ.setdefault("SAALIK_SEED_MOCK", "1")


@pytest.fixture
def sharp_image() -> Image.Image:
    """High-contrast synthetic image with strong edges (high Laplacian variance)."""
    arr = np.zeros((480, 640, 3), dtype=np.uint8)
    arr[:, :] = (40, 60, 80)
    # Checkerboard for sharp gradients
    for y in range(0, 480, 20):
        for x in range(0, 640, 20):
            if ((x // 20) + (y // 20)) % 2 == 0:
                arr[y : y + 20, x : x + 20] = (220, 210, 200)
    return Image.fromarray(arr, mode="RGB")


@pytest.fixture
def blurry_image(sharp_image: Image.Image) -> Image.Image:
    from PIL import ImageFilter

    return sharp_image.filter(ImageFilter.GaussianBlur(radius=8))


@pytest.fixture
def overexposed_image() -> Image.Image:
    arr = np.full((480, 640, 3), 252, dtype=np.uint8)
    return Image.fromarray(arr, mode="RGB")


@pytest.fixture
def underexposed_image() -> Image.Image:
    arr = np.full((480, 640, 3), 4, dtype=np.uint8)
    return Image.fromarray(arr, mode="RGB")


@pytest.fixture
def tmp_jpeg(tmp_path: Path, sharp_image: Image.Image) -> Path:
    path = tmp_path / "sample.jpg"
    sharp_image.save(path, format="JPEG", quality=95)
    return path


@pytest.fixture
def jpeg_bytes(sharp_image: Image.Image) -> bytes:
    buf = io.BytesIO()
    sharp_image.save(buf, format="JPEG", quality=95)
    return buf.getvalue()
