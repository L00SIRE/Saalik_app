"""Tests for Kathmandu Valley domain augmentation."""

from __future__ import annotations

import numpy as np
import pytest
from PIL import Image

from ml_pipeline.augmentation.heritage_augmenter import (
    AugmentationConfig,
    HeritageAugmenter,
)


def test_individual_transforms_change_pixels(sharp_image: Image.Image) -> None:
    aug = HeritageAugmenter(AugmentationConfig(seed=7))
    import cv2

    rgb = np.asarray(sharp_image)
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

    monsoon = aug.monsoon_overcast(bgr, strength=0.8)
    shadow = aug.courtyard_shadow_recovery(bgr, lift=0.7)
    occluded = aug.lower_frame_occlusion(bgr, coverage=0.25)
    tilted = aug.perspective_tilt(bgr, degrees=12.0)

    assert monsoon.shape == bgr.shape
    assert shadow.shape == bgr.shape
    assert occluded.shape == bgr.shape
    assert tilted.shape == bgr.shape
    assert not np.array_equal(monsoon, bgr)
    assert not np.array_equal(occluded, bgr)
    assert not np.array_equal(tilted, bgr)


def test_apply_full_pipeline_returns_pil(sharp_image: Image.Image) -> None:
    aug = HeritageAugmenter(AugmentationConfig(seed=11))
    out = aug.apply(sharp_image, return_pil=True)
    assert isinstance(out, Image.Image)
    assert out.size == sharp_image.size


def test_apply_named_subset(sharp_image: Image.Image) -> None:
    aug = HeritageAugmenter(AugmentationConfig(seed=3))
    out = aug.apply(
        sharp_image,
        transforms=["monsoon_overcast", "perspective_tilt"],
        return_pil=False,
    )
    assert isinstance(out, np.ndarray)
    assert out.shape[2] == 3


def test_unknown_transform_raises(sharp_image: Image.Image) -> None:
    aug = HeritageAugmenter()
    with pytest.raises(ValueError, match="Unknown transform"):
        aug.apply(sharp_image, transforms=["not_a_real_transform"])


def test_augment_variants_are_diverse(sharp_image: Image.Image) -> None:
    aug = HeritageAugmenter(AugmentationConfig(seed=42))
    variants = aug.augment_variants(sharp_image, n=3)
    assert len(variants) == 3
    arrs = [np.asarray(v) for v in variants]
    # At least one pair should differ due to seed offsets.
    diffs = [
        float(np.mean(np.abs(arrs[i].astype(np.float32) - arrs[j].astype(np.float32))))
        for i in range(len(arrs))
        for j in range(i + 1, len(arrs))
    ]
    assert max(diffs) > 0.5


def test_describe_config() -> None:
    aug = HeritageAugmenter(AugmentationConfig(monsoon_strength=0.4, tilt_degrees=5.0))
    desc = aug.describe()
    assert desc["monsoon_strength"] == 0.4
    assert desc["tilt_degrees"] == 5.0
