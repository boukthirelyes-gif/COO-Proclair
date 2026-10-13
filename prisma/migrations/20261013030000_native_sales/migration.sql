CREATE TABLE "SalesPipeline" ("id" TEXT PRIMARY KEY,"name" TEXT NOT NULL);
CREATE TABLE "SalesStage" (
 "id" TEXT PRIMARY KEY,"pipelineId" TEXT NOT NULL REFERENCES "SalesPipeline"("id"),
 "name" TEXT NOT NULL,"position" INTEGER NOT NULL,"kind" TEXT NOT NULL DEFAULT 'OPEN' CHECK ("kind" IN ('OPEN','WON','LOST')),
 UNIQUE ("pipelineId","position")
);
INSERT INTO "SalesPipeline" VALUES ('proclair-sales','Ventes Proclair — pipeline natif');
INSERT INTO "SalesStage" VALUES
 ('proclair-qualify','proclair-sales','À qualifier',0,'OPEN'),
 ('proclair-contact','proclair-sales','Contact établi',1,'OPEN'),
 ('proclair-followup','proclair-sales','À relancer',2,'OPEN'),
 ('proclair-won','proclair-sales','Gagné',3,'WON'),
 ('proclair-lost','proclair-sales','Perdu',4,'LOST');
CREATE TABLE "Lead" (
 "id" TEXT PRIMARY KEY,"name" TEXT NOT NULL,"email" TEXT,"phone" TEXT,"address" TEXT,
 "notes" TEXT NOT NULL DEFAULT '',"source" TEXT NOT NULL DEFAULT 'MANUAL',"tags" TEXT[] NOT NULL,
 "valueCents" INTEGER NOT NULL DEFAULT 0 CHECK ("valueCents">=0),
 "probability" INTEGER NOT NULL DEFAULT 0 CHECK ("probability" BETWEEN 0 AND 100),
 "status" TEXT NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE','DO_NOT_CONTACT','CONVERTED')),
 "followUpAt" TIMESTAMP(3),"ownerId" TEXT REFERENCES "AppUser"("id"),
 "pipelineId" TEXT NOT NULL REFERENCES "SalesPipeline"("id"),"stageId" TEXT NOT NULL REFERENCES "SalesStage"("id"),
 "sourcePinId" TEXT UNIQUE REFERENCES "ProspectPin"("id"),"convertedCustomerId" TEXT REFERENCES "Customer"("id"),
 "conversionChoice" TEXT,"convertedAt" TIMESTAMP(3),"idempotencyKey" TEXT NOT NULL UNIQUE,"payloadHash" TEXT NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 1,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Lead_ownerId_status_followUpAt_idx" ON "Lead"("ownerId","status","followUpAt");
-- Administrators already have all rights by role. Other existing accounts keep their explicit restrictions.
UPDATE "AppUser" SET "permissions"=array_cat("permissions",ARRAY['leads.read','leads.write','leads.all']) WHERE "role"='ADMIN';
