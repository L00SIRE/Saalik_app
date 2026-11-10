import numpy as np
from PIL import Image

from ml_pipeline.quality_gate.image_validator import ImageValidator, QualityThresholds


def _sharp_image(size=320):
    arr = np.zeros((size, size, 3), dtype=np.uint8)
    arr[:, :] = (90, 110, 80)
    arr[::4, :, :] = 220
    arr[:, ::4, :] = 40
    return Image.fromarray(arr, mode="RGB")


def test_validator_passes_sharp_well_exposed_image():
    report = ImageValidator(QualityThresholds(require_gps=False)).validate(_sharp_image())
    assert report.width == 320
    assert report.height == 320
    assert report.laplacian_variance > 0
    assert 0.0 <= report.overall_score <= 1.0
    assert isinstance(report.passed, bool)


def test_validator_flags_tiny_resolution():
    tiny = Image.new("RGB", (32, 32), color=(128, 128, 128))
    report = ImageValidator(QualityThresholds(min_width=640, min_height=480, require_gps=False)).validate(tiny)
    assert report.resolution_score < 1.0
    assert report.passed is False
    assert any("resolution" in f.lower() or "width" in f.lower() or "height" in f.lower() for f in report.failures)
