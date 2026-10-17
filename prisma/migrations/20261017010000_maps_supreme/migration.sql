ALTER TABLE "ProspectPin" ADD COLUMN "operationId" TEXT, ADD COLUMN "creationFingerprint" TEXT;
CREATE UNIQUE INDEX "ProspectPin_operationId_key" ON "ProspectPin"("operationId");
CREATE INDEX "ProspectPin_geo_gist" ON "ProspectPin" USING GIST (point(longitude,latitude));
CREATE TABLE "ProspectPinPhoto"("id" TEXT PRIMARY KEY,"pinId" TEXT NOT NULL REFERENCES "ProspectPin"("id"),"bytes" BYTEA NOT NULL,"mime" TEXT NOT NULL,"caption" TEXT NOT NULL,"createdBy" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "ProspectPinPhoto_pinId_createdAt_idx" ON "ProspectPinPhoto"("pinId","createdAt");
ALTER TABLE "SalesTerritory" ADD COLUMN "teamName" TEXT, ADD COLUMN "teamMemberIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ProspectPin" DROP CONSTRAINT "ProspectPin_status_check";
ALTER TABLE "ProspectPin" ADD CONSTRAINT "ProspectPin_status_check" CHECK (status IN ('SOLD','NO_HOME','NOT_INTERESTED','CALLBACK','NOT_KNOCKED','FOLLOW_UP','ACTIVE','CANCELLED','DO_NOT_CONTACT','HOT','QUOTE_SENT','APPOINTMENT','ACTIVE_CLIENT','LOST_CLIENT'));
ALTER TABLE "ProspectPin" ADD COLUMN "lastVisitedAt" TIMESTAMP(3), ADD COLUMN "visitCount" INTEGER NOT NULL DEFAULT 0 CHECK ("visitCount">=0);
