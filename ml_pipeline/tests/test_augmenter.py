import numpy as np
from PIL import Image

from ml_pipeline.augmentation.heritage_augmenter import AugmentationConfig, HeritageAugmenter


def test_augmenter_preserves_shape_and_applies_pipeline():
    img = Image.new("RGB", (160, 120), color=(100, 120, 90))
    aug = HeritageAugmenter(AugmentationConfig(seed=7))
    out = aug.apply(img)
    assert isinstance(out, Image.Image)
    assert out.size == (160, 120)


def test_augmenter_variants_differ_with_seed_controls():
    img = Image.new("RGB", (100, 100), color=(80, 80, 80))
    a = HeritageAugmenter(AugmentationConfig(seed=1, apply_tilt=True)).apply(img)
    b = HeritageAugmenter(AugmentationConfig(seed=99, apply_tilt=True)).apply(img)
    assert np.asarray(a).shape == np.asarray(b).shape
    variants = HeritageAugmenter(AugmentationConfig(seed=3)).augment_variants(img, n=3)
    assert len(variants) == 3
