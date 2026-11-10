"""Open-licensed seed photo fetcher for Nepal heritage monuments."""

from .wikimedia_fetcher import (
    MonumentSeed,
    SeedFetchResult,
    WikimediaSeedFetcher,
    load_monuments_from_seed,
)

__all__ = [
    "MonumentSeed",
    "SeedFetchResult",
    "WikimediaSeedFetcher",
    "load_monuments_from_seed",
]
