# Saalik ML Pipeline

Python computer-vision and vector-indexing package for Kathmandu Valley heritage photos.

## Modules

- `quality_gate` — OpenCV/Pillow field-photo quality scoring
- `embeddings` — DINOv2 / SigLIP / CLIP encoder with deterministic fake backend; CLIP images are a
  center-biased four-view pyramid. `geo_visual_ranker.py` is the two-stage GPS + visual ranker shared by
  the benchmark and the worker
- `augmentation` — monsoon, courtyard shadow, occlusion, and tilt simulation
- `seed_scraper` — Wikimedia (or mock) open-license seed photo fetcher; `--add N --only <ids>` harvests
  more photos for named monuments
- `benchmarks` — Recall@1 / Recall@3 / MRR + confusion matrix plots; `evaluate_retrieval.py` tunes the
  ranker and writes the vector bundle, the mobile index, the benchmark report and the field checklist
- `inference_server.py` — warm CLIP worker on port 8099 (`/embed` returns the vector and ranked matches)

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

## Real model runs (from the repo root, needs torch + transformers)

```bash
ml_pipeline/.venv/bin/python ml_pipeline/benchmarks/evaluate_retrieval.py
```

```bash
ml_pipeline/.venv/bin/python -m uvicorn ml_pipeline.inference_server:app --port 8099
```

Reference photos are gitignored. `data/nepal_heritage_seed/precomputed_index/harvest_manifest.json` records
which Commons files were added, re-filed or rejected, and why.
