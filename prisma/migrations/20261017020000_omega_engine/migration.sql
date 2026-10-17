CREATE TABLE "OmegaEngineOperation" (
 "id" TEXT PRIMARY KEY,"actorId" TEXT NOT NULL,"key" TEXT NOT NULL,"payloadHash" TEXT NOT NULL,
 "title" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'AWAITING_APPROVAL',"taskId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"completedAt" TIMESTAMP(3),
 CONSTRAINT "OmegaEngineOperation_status_check" CHECK ("status" IN ('AWAITING_APPROVAL','CONFIRMED'))
);
CREATE UNIQUE INDEX "OmegaEngineOperation_actorId_key_key" ON "OmegaEngineOperation"("actorId","key");
CREATE UNIQUE INDEX "OmegaEngineOperation_taskId_key" ON "OmegaEngineOperation"("taskId");
CREATE INDEX "OmegaEngineOperation_actorId_createdAt_idx" ON "OmegaEngineOperation"("actorId","createdAt");
CREATE TABLE "OmegaInternalTask" (
 "id" TEXT PRIMARY KEY,"title" TEXT NOT NULL,"createdBy" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'OPEN',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "OmegaInternalTask_createdBy_status_createdAt_idx" ON "OmegaInternalTask"("createdBy","status","createdAt");
ALTER TABLE "OmegaEngineOperation" ADD CONSTRAINT "OmegaEngineOperation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "OmegaInternalTask"("id") ON DELETE RESTRICT;
