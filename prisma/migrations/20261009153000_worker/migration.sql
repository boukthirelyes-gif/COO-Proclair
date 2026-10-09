CREATE TABLE "WorkerControl" (
 "id" TEXT NOT NULL DEFAULT 'omega-dispatch',
 "enabled" BOOLEAN NOT NULL DEFAULT false,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "WorkerControl_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WorkerJob" (
 "id" TEXT NOT NULL,
 "key" TEXT NOT NULL,
 "date" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING',
 "attempts" INTEGER NOT NULL DEFAULT 0,
 "maxAttempts" INTEGER NOT NULL DEFAULT 3,
 "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "planId" TEXT,
 "lastError" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "completedAt" TIMESTAMP(3),
 CONSTRAINT "WorkerJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkerJob_key_key" ON "WorkerJob"("key");
CREATE INDEX "WorkerJob_status_availableAt_idx" ON "WorkerJob"("status", "availableAt");
