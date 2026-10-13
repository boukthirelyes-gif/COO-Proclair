CREATE TABLE "RotorImportRun" (
 "id" TEXT PRIMARY KEY, "status" TEXT NOT NULL DEFAULT 'READY', "start" TIMESTAMPTZ NOT NULL, "end" TIMESTAMPTZ NOT NULL,
 "kinds" TEXT[] NOT NULL, "checkpoints" JSONB NOT NULL, "createdBy" TEXT NOT NULL,
 "leaseToken" TEXT, "leaseUntil" TIMESTAMPTZ, "nextRetryAt" TIMESTAMPTZ, "errorCode" TEXT,
 "attempts" INTEGER NOT NULL DEFAULT 0, "version" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "completedAt" TIMESTAMPTZ,
 CONSTRAINT "RotorImportRun_range" CHECK ("end">"start" AND "end"-"start"<=interval '32 days'),
 CONSTRAINT "RotorImportRun_status" CHECK ("status" IN ('READY','RUNNING','PAUSED','COMPLETE','LIMIT_REACHED'))
);
CREATE INDEX "RotorImportRun_createdAt_idx" ON "RotorImportRun"("createdAt");
CREATE TABLE "RotorImportItem" (
 "runId" TEXT NOT NULL REFERENCES "RotorImportRun"("id"), "kind" TEXT NOT NULL, "externalId" TEXT NOT NULL,
 "page" INTEGER NOT NULL, "contentHash" TEXT NOT NULL, "rawPayload" JSONB NOT NULL, "normalized" JSONB NOT NULL,
 "previousMirror" JSONB, "change" TEXT NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY ("runId","kind","externalId"),
 CONSTRAINT "RotorImportItem_kind" CHECK ("kind" IN ('CUSTOMER','JOB','VISIT')),
 CONSTRAINT "RotorImportItem_change" CHECK ("change" IN ('NEW','UPDATED','UNCHANGED'))
);
CREATE INDEX "RotorImportItem_runId_kind_page_idx" ON "RotorImportItem"("runId","kind","page");
ALTER TABLE "RotorMirrorRecord" ADD COLUMN "rawPayload" JSONB, ADD COLUMN "contentHash" TEXT, ADD COLUMN "lastImportRunId" TEXT;
