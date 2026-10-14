CREATE TABLE "OmegaSupervisorControl" (
 "id" TEXT PRIMARY KEY DEFAULT 'native-supervisor',
 "enabled" BOOLEAN NOT NULL DEFAULT false,
 "rules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 "cursors" JSONB NOT NULL DEFAULT '{}',
 "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version">0),
 "updatedAt" TIMESTAMP(3) NOT NULL,
 "lastRunAt" TIMESTAMP(3)
);
CREATE TABLE "OmegaMission" (
 "id" TEXT PRIMARY KEY,
 "dedupeKey" TEXT NOT NULL UNIQUE,
 "rule" TEXT NOT NULL CHECK ("rule" IN ('OVERDUE_VISIT','UNCONFIRMED_VISIT','UNSCHEDULED_VISIT','LEAD_CALLBACK')),
 "sourceId" TEXT NOT NULL,
 "fingerprint" TEXT NOT NULL,
 "label" TEXT NOT NULL,
 "detail" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT','APPROVED','DONE','DISMISSED')),
 "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version">0),
 "reviewedBy" TEXT,
 "note" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 "closedAt" TIMESTAMP(3)
);
CREATE INDEX "OmegaMission_status_createdAt_id_idx" ON "OmegaMission"("status","createdAt","id");
CREATE INDEX "OmegaMission_rule_sourceId_idx" ON "OmegaMission"("rule","sourceId");
