CREATE TYPE "VisitStatus" AS ENUM ('PENDING','PROPOSED','CONFIRMED','SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED','RESCHEDULED','NO_ACCESS','FAILED','NEEDS_FOLLOWUP');

CREATE TABLE "Customer" (
 "legacyId" INTEGER,
 "legacyCompany" TEXT,
 "legacyStatus" TEXT,
 "id" TEXT NOT NULL PRIMARY KEY,
 "name" TEXT NOT NULL,
 "email" TEXT,
 "phone" TEXT,
 "notes" TEXT NOT NULL DEFAULT '',
 "version" INTEGER NOT NULL DEFAULT 1,
 "sourceSystem" TEXT NOT NULL DEFAULT 'PROCLAIR',
 "rotorExternalId" TEXT,
 "syncStatus" TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
 "lastSyncedAt" TIMESTAMP(3),
 "lastSyncError" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Property" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "customerId" TEXT NOT NULL,
 "address" TEXT NOT NULL,
 "latitude" DOUBLE PRECISION,
 "longitude" DOUBLE PRECISION,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Contract" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "customerId" TEXT NOT NULL,
 "propertyId" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "service" TEXT NOT NULL,
 "totalVisits" INTEGER NOT NULL,
 "priceCents" INTEGER NOT NULL,
 "active" BOOLEAN NOT NULL DEFAULT true,
 "version" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Job" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "customerId" TEXT NOT NULL,
 "propertyId" TEXT NOT NULL,
 "contractId" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Technician" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "name" TEXT NOT NULL,
 "active" BOOLEAN NOT NULL DEFAULT true,
 "dailyTarget" INTEGER NOT NULL DEFAULT 4,
 "fridayTarget" INTEGER NOT NULL DEFAULT 2
);

CREATE TABLE "Visit" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "customerId" TEXT NOT NULL,
 "propertyId" TEXT NOT NULL,
 "contractId" TEXT NOT NULL,
 "jobId" TEXT NOT NULL,
 "technicianId" TEXT,
 "service" TEXT NOT NULL,
 "status" "VisitStatus" NOT NULL DEFAULT 'PENDING',
 "durationMinutes" INTEGER NOT NULL,
 "actualDurationMinutes" INTEGER,
 "startsAt" TIMESTAMP(3),
 "endsAt" TIMESTAMP(3),
 "priceCents" INTEGER NOT NULL,
 "notes" TEXT NOT NULL DEFAULT '',
 "passageNumber" INTEGER NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 1,
 "sourceSystem" TEXT NOT NULL DEFAULT 'PROCLAIR',
 "rotorExternalId" TEXT,
 "syncStatus" TEXT NOT NULL DEFAULT 'LOCAL_ONLY',
 "lastSyncedAt" TIMESTAMP(3),
 "lastSyncError" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "AuditEvent" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "actorId" TEXT NOT NULL,
 "actorRole" TEXT NOT NULL,
 "action" TEXT NOT NULL,
 "entityType" TEXT NOT NULL,
 "entityId" TEXT NOT NULL,
 "before" JSONB,
 "after" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "OmegaPlan" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "date" TEXT NOT NULL,
 "proposals" JSONB NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PREVIEW',
 "version" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "appliedAt" TIMESTAMP(3),
 "idempotencyKey" TEXT,
 "result" JSONB
);

CREATE TABLE "LegacyTask" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "legacyId" INTEGER NOT NULL,
 "title" TEXT NOT NULL,
 "due" TEXT NOT NULL,
 "done" BOOLEAN NOT NULL
);

CREATE UNIQUE INDEX "Customer_legacyId_key" ON "Customer"("legacyId");

CREATE UNIQUE INDEX "Customer_rotorExternalId_key" ON "Customer"("rotorExternalId");

CREATE UNIQUE INDEX "Technician_name_key" ON "Technician"("name");

CREATE UNIQUE INDEX "Visit_rotorExternalId_key" ON "Visit"("rotorExternalId");

CREATE UNIQUE INDEX "Visit_contractId_passageNumber_key" ON "Visit"("contractId", "passageNumber");

CREATE INDEX "Visit_technicianId_startsAt_idx" ON "Visit"("technicianId", "startsAt");

CREATE INDEX "AuditEvent_entityId_createdAt_idx" ON "AuditEvent"("entityId", "createdAt");

CREATE UNIQUE INDEX "OmegaPlan_idempotencyKey_key" ON "OmegaPlan"("idempotencyKey");

CREATE UNIQUE INDEX "LegacyTask_legacyId_key" ON "LegacyTask"("legacyId");

ALTER TABLE "Property" ADD CONSTRAINT "Property_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Contract" ADD CONSTRAINT "Contract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Contract" ADD CONSTRAINT "Contract_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Job" ADD CONSTRAINT "Job_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Job" ADD CONSTRAINT "Job_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Job" ADD CONSTRAINT "Job_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Visit" ADD CONSTRAINT "Visit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Visit" ADD CONSTRAINT "Visit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Visit" ADD CONSTRAINT "Visit_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Visit" ADD CONSTRAINT "Visit_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Visit" ADD CONSTRAINT "Visit_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
