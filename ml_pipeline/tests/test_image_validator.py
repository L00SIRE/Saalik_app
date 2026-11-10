"""Tests for the field photo quality gate."""

from __future__ import annotations

import io

import numpy as np
import pytest
from PIL import Image

from ml_pipeline.quality_gate.image_validator import (
    ImageValidator,
    QualityThresholds,
    validate_image,
)


def test_sharp_image_passes(sharp_image: Image.Image) -> None:
    report = validate_image(sharp_image)
    assert report.laplacian_variance > 80
    assert report.width == 640
    assert report.height == 480
    assert report.resolution_score == 1.0
    assert "blur_too_high" not in report.failures
    assert report.passed is True
    payload = report.to_dict()
    assert "overall_score" in payload
    assert isinstance(payload["failures"], list)


def test_blurry_image_fails_blur_gate(blurry_image: Image.Image) -> None:
    thresholds = QualityThresholds(min_laplacian_variance=120.0, min_overall_score=0.0)
    report = ImageValidator(thresholds).validate(blurry_image)
    assert report.laplacian_variance < thresholds.min_laplacian_variance
    assert "blur_too_high" in report.failures
    assert report.passed is False


def test_overexposure_detection(overexposed_image: Image.Image) -> None:
    report = validate_image(
        overexposed_image,
        thresholds=QualityThresholds(max_overexposure_ratio=0.05, min_overall_score=0.0),
    )
    assert report.overexposure_ratio > 0.05
    assert "overexposed" in report.failures


def test_underexposure_detection(underexposed_image: Image.Image) -> None:
    report = validate_image(
        underexposed_image,
        thresholds=QualityThresholds(max_underexposure_ratio=0.05, min_overall_score=0.0),
    )
    assert report.underexposure_ratio > 0.05
    assert "underexposed" in report.failures


def test_resolution_gate() -> None:
    tiny = Image.new("RGB", (120, 90), color=(100, 120, 140))
    report = validate_image(tiny, thresholds=QualityThresholds(min_overall_score=0.0))
    assert "resolution_too_low" in report.failures
    assert report.resolution_score < 1.0


def test_gps_required_without_exif(sharp_image: Image.Image) -> None:
    thresholds = QualityThresholds(require_gps=True, min_overall_score=0.0)
    report = ImageValidator(thresholds).validate(sharp_image)
    assert report.has_gps is False
    assert report.gps_completeness == 0.0
    assert "missing_gps" in report.failures


def test_validate_from_path_and_bytes(tmp_jpeg, jpeg_bytes) -> None:
    from_path = validate_image(tmp_jpeg)
    from_bytes = validate_image(jpeg_bytes)
    assert from_path.width == from_bytes.width
    assert from_path.height == from_bytes.height
    assert from_path.laplacian_variance == pytest.approx(from_bytes.laplacian_variance, rel=0.05)


def test_validate_numpy_bgr(sharp_image: Image.Image) -> None:
    import cv2

    rgb = np.asarray(sharp_image)
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    report = validate_image(bgr)
    assert report.passed is True


def test_exif_gps_completeness_partial() -> None:
    """When GPS IFD is absent, completeness is zero; synthetic EXIF optional."""
    img = Image.new("RGB", (800, 600), color=(90, 100, 110))
    # Draw edges so blur gate passes.
    for x in range(0, 800, 10):
        for y in range(600):
            if (x // 10) % 2 == 0:
                img.putpixel((x, y), (200, 190, 180))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    report = validate_image(buf.getvalue())
    assert report.gps_completeness == 0.0
    assert report.has_gps is False
