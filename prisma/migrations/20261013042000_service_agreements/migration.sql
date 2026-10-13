CREATE TABLE "ServiceAgreement" (
 "id" TEXT PRIMARY KEY, "contractId" TEXT NOT NULL UNIQUE REFERENCES "Contract"("id"),
 "salesOwnerId" TEXT REFERENCES "AppUser"("id"), "status" TEXT NOT NULL DEFAULT 'DRAFT',
 "frequency" TEXT NOT NULL, "startDate" TEXT NOT NULL, "lines" JSONB NOT NULL, "terms" JSONB NOT NULL,
 "subtotalCents" INTEGER NOT NULL CHECK ("subtotalCents">=0), "taxCents" INTEGER NOT NULL CHECK ("taxCents">=0), "totalCents" INTEGER NOT NULL CHECK ("totalCents">=0),
 "snapshot" JSONB, "documentHash" TEXT, "signer" TEXT, "signedAt" TIMESTAMPTZ, "signatureHash" TEXT,
 "pdfBytes" BYTEA, "pdfSha256" TEXT, "scheduledAt" TIMESTAMPTZ, "visitIds" TEXT[] NOT NULL DEFAULT '{}',
 "idempotencyKey" TEXT NOT NULL UNIQUE, "payloadHash" TEXT NOT NULL, "createdBy" TEXT NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT "ServiceAgreement_status" CHECK ("status" IN ('DRAFT','ISSUED','SIGNED'))
);
CREATE INDEX "ServiceAgreement_status_createdAt_idx" ON "ServiceAgreement"("status","createdAt");
CREATE TABLE "AgreementAccess" (
 "tokenHash" TEXT PRIMARY KEY, "agreementId" TEXT NOT NULL REFERENCES "ServiceAgreement"("id"),
 "expiresAt" TIMESTAMPTZ NOT NULL, "revoked" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "AgreementAccess_agreementId_idx" ON "AgreementAccess"("agreementId");
