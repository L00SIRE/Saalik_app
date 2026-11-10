-- Enable pgvector for hybrid visual + lore embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Minimal production DDL mirror of prisma/schema.prisma vector columns.
-- Full relational DDL is managed by `prisma migrate`; this file documents the
-- extension and the Unsupported("vector(N)") columns that Prisma cannot emit alone.

-- Example alter statements applied after Prisma creates base tables:
-- ALTER TABLE "MonumentVisualEmbedding" ALTER COLUMN "embedding" TYPE vector(768) USING embedding::vector;
-- ALTER TABLE "HeritageLoreChunk" ALTER COLUMN "embedding" TYPE vector(1536) USING embedding::vector;

-- IVFFlat / HNSW indexes for Stage-2 visual retrieval (tune lists after load):
-- CREATE INDEX IF NOT EXISTS monument_visual_embedding_hnsw
--   ON "MonumentVisualEmbedding" USING hnsw (embedding vector_cosine_ops);
-- CREATE INDEX IF NOT EXISTS heritage_lore_chunk_hnsw
--   ON "HeritageLoreChunk" USING hnsw (embedding vector_cosine_ops);
