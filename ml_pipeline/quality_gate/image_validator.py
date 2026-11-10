"""OpenCV + Pillow field-photo quality scoring for Saalik captures.

Scores Laplacian variance (blur), histogram clipping (over/underexposure),
resolution, and EXIF GPS completeness, then applies pass/fail thresholds.
"""

from __future__ import annotations

import io
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, Mapping, Optional, Tuple, Union

import cv2
import numpy as np
from PIL import Image, ExifTags

PathLike = Union[str, Path]
ImageInput = Union[PathLike, bytes, np.ndarray, Image.Image]


@dataclass(frozen=True)
class QualityThresholds:
    """Pass/fail cutoffs for field photo acceptance."""

    min_laplacian_variance: float = 80.0
    max_overexposure_ratio: float = 0.08
    max_underexposure_ratio: float = 0.12
    min_width: int = 640
    min_height: int = 480
    require_gps: bool = False
    min_overall_score: float = 0.55


@dataclass
class ImageQualityReport:
    """Structured quality scores and pass/fail decision."""

    passed: bool
    overall_score: float
    blur_score: float
    laplacian_variance: float
    overexposure_ratio: float
    underexposure_ratio: float
    exposure_score: float
    width: int
    height: int
    resolution_score: float
    has_gps: bool
    gps_completeness: float
    gps_score: float
    failures: Tuple[str, ...] = field(default_factory=tuple)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        payload = asdict(self)
        payload["failures"] = list(self.failures)
        return payload


def _load_bgr_and_pil(
    image: ImageInput,
) -> Tuple[np.ndarray, Image.Image, Optional[bytes]]:
    """Normalize heterogeneous image inputs into OpenCV BGR + Pillow RGB."""
    raw_bytes: Optional[bytes] = None

    if isinstance(image, (str, Path)):
        path = Path(image)
        raw_bytes = path.read_bytes()
        arr = np.frombuffer(raw_bytes, dtype=np.uint8)
        bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if bgr is None:
            raise ValueError(f"Unable to decode image at {path}")
        pil = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        return bgr, pil, raw_bytes

    if isinstance(image, bytes):
        raw_bytes = image
        arr = np.frombuffer(raw_bytes, dtype=np.uint8)
        bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if bgr is None:
            raise ValueError("Unable to decode image bytes")
        pil = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        return bgr, pil, raw_bytes

    if isinstance(image, Image.Image):
        pil = image.convert("RGB")
        rgb = np.asarray(pil)
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        return bgr, pil, None

    if isinstance(image, np.ndarray):
        if image.ndim == 2:
            bgr = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
            pil = Image.fromarray(image).convert("RGB")
            return bgr, pil, None
        if image.ndim == 3 and image.shape[2] == 3:
            # Assume BGR from OpenCV callers; also accept RGB via metadata flag elsewhere.
            bgr = image.copy()
            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
            pil = Image.fromarray(rgb)
            return bgr, pil, None
        raise ValueError(f"Unsupported ndarray shape: {image.shape}")

    raise TypeError(f"Unsupported image input type: {type(image)!r}")


def _laplacian_variance(bgr: np.ndarray) -> float:
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _histogram_clipping_ratios(
    bgr: np.ndarray,
    low_bin: int = 8,
    high_bin: int = 247,
) -> Tuple[float, float]:
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256]).flatten()
    total = float(hist.sum()) or 1.0
    underexposure = float(hist[:low_bin].sum() / total)
    overexposure = float(hist[high_bin:].sum() / total)
    return overexposure, underexposure


def _extract_gps(pil: Image.Image) -> Tuple[bool, float, Dict[str, Any]]:
    """Return (has_gps, completeness 0-1, raw gps payload)."""
    try:
        exif = pil.getexif()
    except Exception:  # noqa: BLE001 - Pillow can raise various EXIF errors
        return False, 0.0, {}

    if not exif:
        return False, 0.0, {}

    tag_map = {ExifTags.TAGS.get(k, k): v for k, v in exif.items()}
    gps_ifd = tag_map.get("GPSInfo")
    if not gps_ifd:
        # Pillow 10+: GPS may live in get_ifd
        try:
            gps_ifd = exif.get_ifd(0x8825)
        except Exception:  # noqa: BLE001
            gps_ifd = None

    if not gps_ifd:
        return False, 0.0, {}

    gps_named: Dict[str, Any] = {}
    for key, value in dict(gps_ifd).items():
        name = ExifTags.GPSTAGS.get(key, str(key))
        gps_named[name] = value

    required = ("GPSLatitude", "GPSLongitude", "GPSLatitudeRef", "GPSLongitudeRef")
    present = sum(1 for key in required if key in gps_named and gps_named[key])
    completeness = present / float(len(required))
    has_gps = completeness >= 1.0
    return has_gps, completeness, gps_named


def _score_blur(laplacian_variance: float, threshold: float) -> float:
    # Soft saturate around 3x the minimum threshold.
    return float(np.clip(laplacian_variance / max(threshold * 3.0, 1e-6), 0.0, 1.0))


def _score_exposure(over_ratio: float, under_ratio: float, thresholds: QualityThresholds) -> float:
    over_penalty = over_ratio / max(thresholds.max_overexposure_ratio, 1e-6)
    under_penalty = under_ratio / max(thresholds.max_underexposure_ratio, 1e-6)
    return float(np.clip(1.0 - 0.5 * (over_penalty + under_penalty), 0.0, 1.0))


def _score_resolution(width: int, height: int, thresholds: QualityThresholds) -> float:
    w_ratio = width / float(thresholds.min_width)
    h_ratio = height / float(thresholds.min_height)
    return float(np.clip(min(w_ratio, h_ratio), 0.0, 1.0))


class ImageValidator:
    """Score and gate field photographs for heritage capture quality."""

    def __init__(self, thresholds: Optional[QualityThresholds] = None) -> None:
        self.thresholds = thresholds or QualityThresholds()

    def validate(self, image: ImageInput) -> ImageQualityReport:
        bgr, pil, _raw = _load_bgr_and_pil(image)
        height, width = bgr.shape[:2]

        lap_var = _laplacian_variance(bgr)
        over_ratio, under_ratio = _histogram_clipping_ratios(bgr)
        has_gps, gps_completeness, gps_payload = _extract_gps(pil)

        blur_score = _score_blur(lap_var, self.thresholds.min_laplacian_variance)
        exposure_score = _score_exposure(over_ratio, under_ratio, self.thresholds)
        resolution_score = _score_resolution(width, height, self.thresholds)
        gps_score = gps_completeness if self.thresholds.require_gps else max(gps_completeness, 0.5)

        # Weighted blend emphasizing sharpness and exposure for field UX.
        overall = float(
            0.40 * blur_score
            + 0.30 * exposure_score
            + 0.20 * resolution_score
            + 0.10 * gps_score
        )

        failures = []
        if lap_var < self.thresholds.min_laplacian_variance:
            failures.append("blur_too_high")
        if over_ratio > self.thresholds.max_overexposure_ratio:
            failures.append("overexposed")
        if under_ratio > self.thresholds.max_underexposure_ratio:
            failures.append("underexposed")
        if width < self.thresholds.min_width or height < self.thresholds.min_height:
            failures.append("resolution_too_low")
        if self.thresholds.require_gps and not has_gps:
            failures.append("missing_gps")
        if overall < self.thresholds.min_overall_score:
            failures.append("overall_score_below_threshold")

        passed = len(failures) == 0

        return ImageQualityReport(
            passed=passed,
            overall_score=overall,
            blur_score=blur_score,
            laplacian_variance=lap_var,
            overexposure_ratio=over_ratio,
            underexposure_ratio=under_ratio,
            exposure_score=exposure_score,
            width=width,
            height=height,
            resolution_score=resolution_score,
            has_gps=has_gps,
            gps_completeness=gps_completeness,
            gps_score=gps_score,
            failures=tuple(failures),
            metadata={"gps": gps_payload},
        )


def validate_image(
    image: ImageInput,
    thresholds: Optional[QualityThresholds] = None,
) -> ImageQualityReport:
    """Convenience wrapper around :class:`ImageValidator`."""
    return ImageValidator(thresholds=thresholds).validate(image)


def thresholds_from_mapping(data: Mapping[str, Any]) -> QualityThresholds:
    """Build thresholds from a plain mapping (e.g. JSON config)."""
    known = {f.name for f in QualityThresholds.__dataclass_fields__.values()}  # type: ignore[attr-defined]
    filtered = {k: v for k, v in data.items() if k in known}
    return QualityThresholds(**filtered)
