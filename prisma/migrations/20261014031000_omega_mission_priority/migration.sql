ALTER TABLE "OmegaMission" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 2 CHECK ("priority" BETWEEN 0 AND 3);
UPDATE "OmegaMission" SET "priority"=CASE "rule"
 WHEN 'OVERDUE_VISIT' THEN 0 WHEN 'LEAD_CALLBACK' THEN 1
 WHEN 'UNCONFIRMED_VISIT' THEN 2 ELSE 3 END;
CREATE INDEX "OmegaMission_status_priority_createdAt_id_idx" ON "OmegaMission"("status","priority","createdAt","id");
