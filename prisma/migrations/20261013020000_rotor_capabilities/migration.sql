CREATE TABLE "RotorCapabilitySnapshot" (
 "id" TEXT PRIMARY KEY, "protocolVersion" TEXT NOT NULL, "scopes" TEXT[] NOT NULL,
 "tools" JSONB NOT NULL, "fingerprint" TEXT NOT NULL, "complete" BOOLEAN NOT NULL,
 "changes" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RotorCapabilitySnapshot_createdAt_idx" ON "RotorCapabilitySnapshot"("createdAt");
CREATE TABLE "MapPinType" (
 "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "color" TEXT NOT NULL,
 "position" INTEGER NOT NULL, "active" BOOLEAN NOT NULL DEFAULT TRUE,
 "source" TEXT NOT NULL DEFAULT 'USER_PROVIDED_REFERENCE', "verifiedAt" TIMESTAMP(3)
);
INSERT INTO "MapPinType" ("id","name","color","position") VALUES
 ('d4136b6f-b622-4e4b-bcf7-4ea8ab648d5d','No Home','#808080',0),
 ('7784a6b8-d171-4882-85ec-8cd492338ae4','Not interested','#FF0000',1),
 ('9ef0060a-b7da-4d66-9b2d-1c5dc13a55fd','Interested','#fbbb09',2),
 ('b90f72bc-e93a-499a-8b27-fa0094b5db1e','Made Sale','#00FF00',3),
 ('3cf37129-8eb7-4caf-92d5-86b61ad5edb4','Never Knock','#000000',4);
ALTER TABLE "ProspectPin" ADD COLUMN "typeId" TEXT REFERENCES "MapPinType"("id");
-- Preserve each legacy workflow status and its audit history. Add the matching supplied category only.
UPDATE "ProspectPin" SET "typeId"=CASE "status"
 WHEN 'NO_HOME' THEN 'd4136b6f-b622-4e4b-bcf7-4ea8ab648d5d'
 WHEN 'NOT_INTERESTED' THEN '7784a6b8-d171-4882-85ec-8cd492338ae4'
 WHEN 'ACTIVE' THEN '9ef0060a-b7da-4d66-9b2d-1c5dc13a55fd'
 WHEN 'SOLD' THEN 'b90f72bc-e93a-499a-8b27-fa0094b5db1e'
 WHEN 'DO_NOT_CONTACT' THEN '3cf37129-8eb7-4caf-92d5-86b61ad5edb4'
 ELSE NULL END;
CREATE TABLE "RotorMapPin" (
 "externalId" TEXT PRIMARY KEY, "typeId" TEXT, "typeName" TEXT, "color" TEXT,
 "latitude" DOUBLE PRECISION NOT NULL CHECK ("latitude" BETWEEN -90 AND 90),
 "longitude" DOUBLE PRECISION NOT NULL CHECK ("longitude" BETWEEN -180 AND 180),
 "address" TEXT, "notes" TEXT, "memberId" TEXT, "customerExternalId" TEXT,
 "leadExternalId" TEXT, "occurredAt" TIMESTAMP(3), "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RotorMapPin_memberId_occurredAt_idx" ON "RotorMapPin"("memberId","occurredAt");
CREATE TABLE "RotorCapabilityGuard" (
 "name" TEXT PRIMARY KEY, "fingerprint" TEXT, "status" TEXT NOT NULL,
 "reason" TEXT, "snapshotId" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "MapPinType" ADD COLUMN "restricted" BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE "MapPinType" SET "restricted"=TRUE WHERE "id"='3cf37129-8eb7-4caf-92d5-86b61ad5edb4';
CREATE TABLE "RotorMonitorControl" (
 "id" TEXT PRIMARY KEY, "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
 "leaseUntil" TIMESTAMP(3), "nextCheckAt" TIMESTAMP(3), "lastCheckedAt" TIMESTAMP(3),
 "lastCode" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
