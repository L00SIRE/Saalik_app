"""Simulate Kathmandu Valley field capture conditions.

Transforms cover monsoon overcast lighting, courtyard shadow recovery,
lower-frame tourist/pigeon occlusion, and handheld perspective tilt.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple, Union

import cv2
import numpy as np
from PIL import Image

PathLike = Union[str, Path]
ImageInput = Union[PathLike, Image.Image, np.ndarray]


@dataclass
class AugmentationConfig:
    """Controls for heritage-domain augmentations."""

    monsoon_strength: float = 0.55
    shadow_lift: float = 0.35
    occlusion_coverage: float = 0.18
    tilt_degrees: float = 8.0
    seed: Optional[int] = 42
    apply_monsoon: bool = True
    apply_shadow_recovery: bool = True
    apply_occlusion: bool = True
    apply_tilt: bool = True


def _to_bgr(image: ImageInput) -> np.ndarray:
    if isinstance(image, (str, Path)):
        bgr = cv2.imread(str(image), cv2.IMREAD_COLOR)
        if bgr is None:
            raise ValueError(f"Unable to read image: {image}")
        return bgr
    if isinstance(image, Image.Image):
        rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
        return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    if isinstance(image, np.ndarray):
        if image.ndim == 2:
            return cv2.cvtColor(image.astype(np.uint8), cv2.COLOR_GRAY2BGR)
        if image.ndim == 3 and image.shape[2] == 3:
            return image.astype(np.uint8).copy()
        raise ValueError(f"Unsupported ndarray shape: {image.shape}")
    raise TypeError(f"Unsupported image input: {type(image)!r}")


def _to_pil(bgr: np.ndarray) -> Image.Image:
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)


class HeritageAugmenter:
    """Domain augmenter tuned for Kathmandu Valley monument photography."""

    def __init__(self, config: Optional[AugmentationConfig] = None) -> None:
        self.config = config or AugmentationConfig()
        self._rng = np.random.default_rng(self.config.seed)

    def reset_seed(self, seed: Optional[int] = None) -> None:
        value = self.config.seed if seed is None else seed
        self.config.seed = value
        self._rng = np.random.default_rng(value)

    def monsoon_overcast(self, bgr: np.ndarray, strength: Optional[float] = None) -> np.ndarray:
        """Desaturate and cool the frame to mimic monsoon cloud cover."""
        s = self.config.monsoon_strength if strength is None else float(strength)
        s = float(np.clip(s, 0.0, 1.0))
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[:, :, 1] *= 1.0 - 0.55 * s
        hsv[:, :, 2] *= 1.0 - 0.18 * s
        hsv = np.clip(hsv, 0, 255).astype(np.uint8)
        cooled = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR).astype(np.float32)
        # Mild blue cast typical of overcast valley light.
        cooled[:, :, 0] = np.clip(cooled[:, :, 0] + 18.0 * s, 0, 255)
        cooled[:, :, 2] = np.clip(cooled[:, :, 2] - 10.0 * s, 0, 255)
        # Soft haze
        haze = np.full_like(cooled, 210.0)
        out = (1.0 - 0.22 * s) * cooled + (0.22 * s) * haze
        return np.clip(out, 0, 255).astype(np.uint8)

    def courtyard_shadow_recovery(
        self,
        bgr: np.ndarray,
        lift: Optional[float] = None,
    ) -> np.ndarray:
        """Lift crushed courtyard shadows while protecting highlight bricks."""
        strength = self.config.shadow_lift if lift is None else float(lift)
        strength = float(np.clip(strength, 0.0, 1.0))
        lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
        l_channel = lab[:, :, 0]
        # Soft shadow mask for darker courtyard regions.
        shadow_mask = np.clip((120.0 - l_channel) / 120.0, 0.0, 1.0)
        lift_map = shadow_mask * (40.0 * strength)
        lab[:, :, 0] = np.clip(l_channel + lift_map, 0, 255)
        recovered = cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_LAB2BGR)
        # Mild CLAHE on luminance for local contrast recovery.
        lab2 = cv2.cvtColor(recovered, cv2.COLOR_BGR2LAB)
        clahe = cv2.createCLAHE(clipLimit=1.0 + 2.0 * strength, tileGridSize=(8, 8))
        lab2[:, :, 0] = clahe.apply(lab2[:, :, 0])
        return cv2.cvtColor(lab2, cv2.COLOR_LAB2BGR)

    def lower_frame_occlusion(
        self,
        bgr: np.ndarray,
        coverage: Optional[float] = None,
    ) -> np.ndarray:
        """Occlude the lower frame with tourist/pigeon-like blobs."""
        cov = self.config.occlusion_coverage if coverage is None else float(coverage)
        cov = float(np.clip(cov, 0.0, 0.6))
        out = bgr.copy()
        h, w = out.shape[:2]
        band_top = int(h * (1.0 - cov - 0.05))
        band_top = max(0, min(h - 1, band_top))
        n_blobs = max(2, int(4 + 10 * cov))

        for _ in range(n_blobs):
            cx = int(self._rng.integers(0, w))
            cy = int(self._rng.integers(band_top, h))
            # Mix of elongated "tourist" and compact "pigeon" ellipses.
            if self._rng.random() < 0.55:
                axes = (
                    int(self._rng.integers(max(8, w // 30), max(9, w // 12))),
                    int(self._rng.integers(max(16, h // 14), max(17, h // 6))),
                )
                color = (
                    int(self._rng.integers(20, 90)),
                    int(self._rng.integers(20, 90)),
                    int(self._rng.integers(20, 110)),
                )
            else:
                axes = (
                    int(self._rng.integers(4, max(5, w // 40))),
                    int(self._rng.integers(3, max(4, h // 50))),
                )
                gray = int(self._rng.integers(40, 160))
                color = (gray, gray, gray)
            angle = float(self._rng.uniform(-35, 35))
            cv2.ellipse(out, (cx, cy), axes, angle, 0, 360, color, thickness=-1)

        # Soft vignette blend so occlusion is not hard-cut.
        mask = np.zeros((h, w), dtype=np.float32)
        mask[band_top:, :] = 1.0
        mask = cv2.GaussianBlur(mask, (0, 0), sigmaX=max(1.0, w * 0.02))
        mask3 = np.repeat(mask[:, :, None], 3, axis=2)
        blended = out.astype(np.float32) * mask3 + bgr.astype(np.float32) * (1.0 - mask3)
        return np.clip(blended, 0, 255).astype(np.uint8)

    def perspective_tilt(
        self,
        bgr: np.ndarray,
        degrees: Optional[float] = None,
    ) -> np.ndarray:
        """Apply mild handheld perspective tilt common in courtyard captures."""
        deg = self.config.tilt_degrees if degrees is None else float(degrees)
        h, w = bgr.shape[:2]
        # Randomize tilt direction but keep magnitude near configured degrees.
        sign = 1.0 if self._rng.random() < 0.5 else -1.0
        shift = (deg / 45.0) * w * 0.12 * sign
        src = np.float32([[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]])
        dst = np.float32(
            [
                [shift, 0],
                [w - 1 - shift * 0.35, 0],
                [w - 1 + shift * 0.2, h - 1],
                [-shift * 0.4, h - 1],
            ]
        )
        matrix = cv2.getPerspectiveTransform(src, dst)
        warped = cv2.warpPerspective(
            bgr,
            matrix,
            (w, h),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REFLECT_101,
        )
        return warped

    def apply(
        self,
        image: ImageInput,
        transforms: Optional[Sequence[str]] = None,
        return_pil: bool = True,
    ) -> Union[Image.Image, np.ndarray]:
        """Apply configured (or named) transforms in a stable order."""
        order = list(transforms) if transforms is not None else self._default_order()
        bgr = _to_bgr(image)
        for name in order:
            if name == "monsoon_overcast":
                bgr = self.monsoon_overcast(bgr)
            elif name == "courtyard_shadow_recovery":
                bgr = self.courtyard_shadow_recovery(bgr)
            elif name == "lower_frame_occlusion":
                bgr = self.lower_frame_occlusion(bgr)
            elif name == "perspective_tilt":
                bgr = self.perspective_tilt(bgr)
            else:
                raise ValueError(f"Unknown transform: {name}")
        return _to_pil(bgr) if return_pil else bgr

    def augment_variants(
        self,
        image: ImageInput,
        n: int = 4,
    ) -> List[Image.Image]:
        """Produce ``n`` field-condition variants with regenerating RNG offsets."""
        variants: List[Image.Image] = []
        base_seed = self.config.seed if self.config.seed is not None else 0
        for i in range(n):
            self.reset_seed(base_seed + i * 17)
            variants.append(self.apply(image, return_pil=True))  # type: ignore[arg-type]
        self.reset_seed(base_seed)
        return variants

    def describe(self) -> Dict[str, float]:
        return {
            "monsoon_strength": self.config.monsoon_strength,
            "shadow_lift": self.config.shadow_lift,
            "occlusion_coverage": self.config.occlusion_coverage,
            "tilt_degrees": self.config.tilt_degrees,
        }

    def _default_order(self) -> List[str]:
        order: List[str] = []
        if self.config.apply_monsoon:
            order.append("monsoon_overcast")
        if self.config.apply_shadow_recovery:
            order.append("courtyard_shadow_recovery")
        if self.config.apply_occlusion:
            order.append("lower_frame_occlusion")
        if self.config.apply_tilt:
            order.append("perspective_tilt")
        return order
