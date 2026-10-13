CREATE TABLE "SalesTerritory" (
 "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "color" TEXT NOT NULL, "points" JSONB NOT NULL,
 "ownerId" TEXT REFERENCES "AppUser"("id"), "active" BOOLEAN NOT NULL DEFAULT true,
 "version" INTEGER NOT NULL DEFAULT 1, "createdBy" TEXT NOT NULL,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "SalesTerritory_ownerId_active_idx" ON "SalesTerritory"("ownerId","active");
ALTER TABLE "ProspectPin" ADD COLUMN "territoryId" TEXT REFERENCES "SalesTerritory"("id");
CREATE INDEX "ProspectPin_territoryId_idx" ON "ProspectPin"("territoryId");
