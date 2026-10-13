CREATE TABLE "BusinessProfile" ("id" TEXT PRIMARY KEY DEFAULT 'proclair', "legalName" TEXT NOT NULL, "address" TEXT, "email" TEXT, "phone" TEXT, "taxInformation" TEXT, "version" INTEGER NOT NULL DEFAULT 1, "updatedAt" TIMESTAMP(3) NOT NULL);
ALTER TABLE "Invoice" ADD COLUMN "issuerSnapshot" JSONB;
ALTER TABLE "Quote" ADD COLUMN "issuerSnapshot" JSONB;
