-- Saalik heritage catalog: enable pgvector and create hybrid geo-visual tables.
-- CREATE EXTENSION requires superuser / rds_superuser on managed Postgres.

CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TRAVELER', 'PENDING_GUIDE', 'GUIDE', 'ADMIN');
CREATE TYPE "TourStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ARCHIVED');
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');
CREATE TYPE "ZoneDesignation" AS ENUM ('UNESCO_MONUMENT_ZONE', 'SATELLITE_HERITAGE_TOWNS');
CREATE TYPE "CaptureAngle" AS ENUM ('ESTABLISHING_FRONT', 'LEFT_45', 'RIGHT_45', 'CLOSE_UP_ICONOGRAPHY', 'WIDE_COURTYARD_CONTEXT');
CREATE TYPE "LoreCategory" AS ENUM ('HISTORY_DYNASTY', 'ARCHITECTURE_CRAFTSMANSHIP', 'ICONOGRAPHY_SYMBOLISM', 'LIVING_RITUALS_FOLKLORE', 'CONSERVATION_RESTORATION');
CREATE TYPE "VerificationStatus" AS ENUM ('EDITORIAL_DRAFT', 'FIELD_VERIFIED', 'CUSTODIAN_APPROVED');
CREATE TYPE "CaptureSubmissionStatus" AS ENUM ('PENDING', 'UPLOADING', 'RETRY_SCHEDULED', 'UPLOADED', 'FAILED');
CREATE TYPE "LightingTag" AS ENUM ('DIRECT_SUN', 'COURTYARD_SHADOW', 'OVERCAST', 'DUSK_LAMP');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'TRAVELER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "GuideProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearsExperience" INTEGER NOT NULL DEFAULT 1,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTours" INTEGER NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "autoAccept" BOOLEAN NOT NULL DEFAULT true,
    "maxDailyTours" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GuideProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuideProfile_userId_key" ON "GuideProfile"("userId");

CREATE TABLE "HeritageZone" (
    "id" TEXT NOT NULL,
    "zoneCode" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameNe" TEXT NOT NULL,
    "romanized" TEXT,
    "designation" "ZoneDesignation" NOT NULL,
    "centroidLat" DOUBLE PRECISION NOT NULL,
    "centroidLng" DOUBLE PRECISION NOT NULL,
    "zoneRadiusM" INTEGER NOT NULL DEFAULT 400,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HeritageZone_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HeritageZone_zoneCode_key" ON "HeritageZone"("zoneCode");

CREATE TABLE "WalkingTour" (
    "id" TEXT NOT NULL,
    "tourCode" TEXT NOT NULL,
    "guideProfileId" TEXT,
    "zoneId" TEXT,
    "title" TEXT NOT NULL,
    "titleNe" TEXT,
    "description" TEXT NOT NULL,
    "startPoint" TEXT NOT NULL,
    "bestStartTime" TEXT,
    "meetingLat" DOUBLE PRECISION,
    "meetingLng" DOUBLE PRECISION,
    "stopMonumentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalDistanceM" INTEGER NOT NULL DEFAULT 0,
    "totalDurationMinutes" INTEGER NOT NULL DEFAULT 0,
    "maxGroupSize" INTEGER NOT NULL DEFAULT 12,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" "TourStatus" NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WalkingTour_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalkingTour_tourCode_key" ON "WalkingTour"("tourCode");

CREATE TABLE "TourBooking" (
    "id" TEXT NOT NULL,
    "walkingTourId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "tipAmount" DOUBLE PRECISION,
    "tipCurrency" TEXT,
    "notes" TEXT,
    "statusHistory" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TourBooking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TourBooking_walkingTourId_status_idx" ON "TourBooking"("walkingTourId", "status");
CREATE INDEX "TourBooking_userId_status_idx" ON "TourBooking"("userId", "status");

CREATE TABLE "Monument" (
    "id" TEXT NOT NULL,
    "monumentCode" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "nodePath" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameNe" TEXT NOT NULL,
    "romanized" TEXT,
    "monumentType" TEXT NOT NULL,
    "tradition" TEXT NOT NULL,
    "dynasty" TEXT,
    "century" TEXT,
    "foundingYearCE" INTEGER,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "elevationM" DOUBLE PRECISION NOT NULL DEFAULT 1300,
    "geofenceRadiusM" INTEGER NOT NULL DEFAULT 40,
    "roofTiers" INTEGER,
    "primaryMaterials" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "distinguishingFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confusableWith" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "disambiguationTip" TEXT,
    "audioHookScript" TEXT,
    "nepaliSummary" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'EDITORIAL_DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Monument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Monument_monumentCode_key" ON "Monument"("monumentCode");
CREATE INDEX "Monument_zoneId_idx" ON "Monument"("zoneId");
CREATE INDEX "Monument_lat_lng_idx" ON "Monument"("lat", "lng");
CREATE INDEX "Monument_nodePath_idx" ON "Monument"("nodePath");

-- Visual embeddings: 768-d DINOv2/SigLIP reference vectors
CREATE TABLE "MonumentVisualEmbedding" (
    "id" TEXT NOT NULL,
    "monumentId" TEXT NOT NULL,
    "angle" "CaptureAngle" NOT NULL,
    "lightingTag" TEXT,
    "embedding" vector(768) NOT NULL,
    "sourceUri" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MonumentVisualEmbedding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonumentVisualEmbedding_monumentId_angle_key" ON "MonumentVisualEmbedding"("monumentId", "angle");
CREATE INDEX "MonumentVisualEmbedding_monumentId_idx" ON "MonumentVisualEmbedding"("monumentId");
-- IVFFlat / HNSW indexes should be created after bulk load:
-- CREATE INDEX monument_visual_embedding_hnsw ON "MonumentVisualEmbedding" USING hnsw (embedding vector_cosine_ops);

-- Lore chunks: 1536-d text embeddings with hierarchical node paths
CREATE TABLE "HeritageLoreChunk" (
    "id" TEXT NOT NULL,
    "monumentId" TEXT NOT NULL,
    "chunkCode" TEXT NOT NULL,
    "nodePath" TEXT NOT NULL,
    "category" "LoreCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sourceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "citationUrls" TEXT[] DEFAULT ARRAY['https://www.sumandangal.com/']::TEXT[],
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "embedding" vector(1536) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HeritageLoreChunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HeritageLoreChunk_chunkCode_key" ON "HeritageLoreChunk"("chunkCode");
CREATE INDEX "HeritageLoreChunk_monumentId_category_idx" ON "HeritageLoreChunk"("monumentId", "category");
CREATE INDEX "HeritageLoreChunk_nodePath_idx" ON "HeritageLoreChunk"("nodePath");

CREATE TABLE "FieldCaptureSubmission" (
    "id" TEXT NOT NULL,
    "clientCaptureId" TEXT NOT NULL,
    "monumentId" TEXT,
    "userId" TEXT,
    "zoneCode" TEXT,
    "angle" "CaptureAngle" NOT NULL,
    "photoUri" TEXT NOT NULL,
    "voiceNoteUri" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "altitudeM" DOUBLE PRECISION,
    "gpsAccuracyM" DOUBLE PRECISION,
    "headingDeg" DOUBLE PRECISION,
    "lightingTag" "LightingTag" NOT NULL DEFAULT 'OVERCAST',
    "notes" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "status" "CaptureSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "payloadHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FieldCaptureSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FieldCaptureSubmission_clientCaptureId_key" ON "FieldCaptureSubmission"("clientCaptureId");
CREATE INDEX "FieldCaptureSubmission_status_nextAttemptAt_idx" ON "FieldCaptureSubmission"("status", "nextAttemptAt");
CREATE INDEX "FieldCaptureSubmission_monumentId_idx" ON "FieldCaptureSubmission"("monumentId");

CREATE TABLE "TelemetryScanEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "monumentId" TEXT,
    "mode" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "queryLat" DOUBLE PRECISION,
    "queryLng" DOUBLE PRECISION,
    "gpsAccuracyM" DOUBLE PRECISION,
    "searchRadiusM" DOUBLE PRECISION,
    "topScore" DOUBLE PRECISION,
    "topMonumentCode" TEXT,
    "confidence" TEXT,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "clientDeviceId" TEXT,
    "appVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TelemetryScanEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TelemetryScanEvent_createdAt_idx" ON "TelemetryScanEvent"("createdAt");
CREATE INDEX "TelemetryScanEvent_monumentId_createdAt_idx" ON "TelemetryScanEvent"("monumentId", "createdAt");
CREATE INDEX "TelemetryScanEvent_queryLat_queryLng_idx" ON "TelemetryScanEvent"("queryLat", "queryLng");

-- Foreign keys
ALTER TABLE "GuideProfile" ADD CONSTRAINT "GuideProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalkingTour" ADD CONSTRAINT "WalkingTour_guideProfileId_fkey" FOREIGN KEY ("guideProfileId") REFERENCES "GuideProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WalkingTour" ADD CONSTRAINT "WalkingTour_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "HeritageZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TourBooking" ADD CONSTRAINT "TourBooking_walkingTourId_fkey" FOREIGN KEY ("walkingTourId") REFERENCES "WalkingTour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TourBooking" ADD CONSTRAINT "TourBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Monument" ADD CONSTRAINT "Monument_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "HeritageZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonumentVisualEmbedding" ADD CONSTRAINT "MonumentVisualEmbedding_monumentId_fkey" FOREIGN KEY ("monumentId") REFERENCES "Monument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HeritageLoreChunk" ADD CONSTRAINT "HeritageLoreChunk_monumentId_fkey" FOREIGN KEY ("monumentId") REFERENCES "Monument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FieldCaptureSubmission" ADD CONSTRAINT "FieldCaptureSubmission_monumentId_fkey" FOREIGN KEY ("monumentId") REFERENCES "Monument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FieldCaptureSubmission" ADD CONSTRAINT "FieldCaptureSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TelemetryScanEvent" ADD CONSTRAINT "TelemetryScanEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TelemetryScanEvent" ADD CONSTRAINT "TelemetryScanEvent_monumentId_fkey" FOREIGN KEY ("monumentId") REFERENCES "Monument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Example hybrid query (documented for operators; not executed here):
-- SELECT m."monumentCode",
--        1 - (e."embedding" <=> $1::vector) AS cosine_sim,
--        (6371000 * 2 * asin(sqrt(
--          sin(radians(m.lat - $2)/2)^2 +
--          cos(radians($2)) * cos(radians(m.lat)) * sin(radians(m.lng - $3)/2)^2
--        ))) AS distance_m
-- FROM "MonumentVisualEmbedding" e
-- JOIN "Monument" m ON m.id = e."monumentId"
-- WHERE (6371000 * 2 * asin(sqrt(
--          sin(radians(m.lat - $2)/2)^2 +
--          cos(radians($2)) * cos(radians(m.lat)) * sin(radians(m.lng - $3)/2)^2
--        ))) <= $4
-- ORDER BY e."embedding" <=> $1::vector
-- LIMIT 5;
