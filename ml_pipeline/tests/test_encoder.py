import os

import numpy as np
from PIL import Image

os.environ["SAALIK_ML_FAKE"] = "1"

from ml_pipeline.embeddings.multimodal_encoder import (
    create_encoder,
    extract_multi_crops,
)


def test_multi_crop_shapes():
    img = Image.new("RGB", (200, 160), color=(30, 90, 40))
    silhouette, detail = extract_multi_crops(img)
    assert silhouette.size == (200, 160)
    assert detail.size[0] <= 200
    assert detail.size[1] <= 160


def test_fake_encoder_is_deterministic_and_normalized():
    enc = create_encoder(backend="fake")
    img = Image.new("RGB", (128, 128), color=(12, 34, 56))
    a = enc.encode_multi_crop(img)
    b = enc.encode_multi_crop(img)
    assert a.dim == b.dim
    assert np.allclose(a.fused_embedding, b.fused_embedding)
    assert abs(float(np.linalg.norm(a.fused_embedding)) - 1.0) < 1e-5
