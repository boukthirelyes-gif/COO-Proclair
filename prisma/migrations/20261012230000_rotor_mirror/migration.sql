-- Keeps external Rotor records separate from locally editable CRM entities.
-- Repeated imports upsert by (kind, externalId); no deletion on partial sync.
CREATE TABLE "RotorMirrorRecord" (
  "kind" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT,
  "summary" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "customerExternalId" TEXT,
  "jobExternalId" TEXT,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RotorMirrorRecord_pkey" PRIMARY KEY ("kind", "externalId")
);
CREATE INDEX "RotorMirrorRecord_kind_syncedAt_idx" ON "RotorMirrorRecord" ("kind", "syncedAt");
CREATE INDEX "RotorMirrorRecord_kind_startsAt_idx" ON "RotorMirrorRecord" ("kind", "startsAt");
