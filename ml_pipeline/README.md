# Saalik ML Pipeline

Python computer-vision and vector-indexing package for Kathmandu Valley heritage photos.

## Modules

- `quality_gate` — OpenCV/Pillow field-photo quality scoring
- `embeddings` — DINOv2 / SigLIP / CLIP encoder with deterministic fake backend
- `augmentation` — monsoon, courtyard shadow, occlusion, and tilt simulation
- `seed_scraper` — Wikimedia (or mock) open-license seed photo fetcher
- `benchmarks` — Recall@1 / Recall@3 / MRR + confusion matrix plots

## Quick start

```bash
cd ml_pipeline
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt --no-cache-dir
export SAALIK_ML_FAKE=1
pytest tests/ -q
```

Set `SAALIK_ML_FAKE=0` and install optional torch extras only when you intentionally want real model weights.
