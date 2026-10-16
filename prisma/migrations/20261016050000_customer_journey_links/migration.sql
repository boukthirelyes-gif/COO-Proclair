-- Additive only: historical invoices, payments, signatures and commissions unchanged.
ALTER TABLE "Invoice" ADD COLUMN "sourceVisitId" TEXT;
CREATE UNIQUE INDEX "Invoice_sourceVisitId_key" ON "Invoice"("sourceVisitId");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_sourceVisitId_fkey" FOREIGN KEY ("sourceVisitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceItem" ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "taxMode" TEXT NOT NULL DEFAULT 'CUSTOM',
 ADD COLUMN "gstCents" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "qstCents" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "CommissionPolicy" (
 "id" TEXT PRIMARY KEY, "basis" TEXT NOT NULL, "application" TEXT NOT NULL,
 "timezone" TEXT NOT NULL, "tiers" JSONB NOT NULL, "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "CommissionPolicy" ("id","basis","application","timezone","tiers") VALUES
 ('SIGNED_HT_ANNUAL_V1','SIGNED_SALES_EXCLUDING_TAX','RETROACTIVE_ANNUAL_PER_SELLER','America/Toronto',
 '[{"threshold":0,"rate":20},{"threshold":10000000,"rate":25},{"threshold":20000000,"rate":30},{"threshold":30000000,"rate":35},{"threshold":40000000,"rate":40}]');
