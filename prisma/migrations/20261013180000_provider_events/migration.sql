CREATE TABLE "ProviderEvent" ("id" TEXT PRIMARY KEY,"provider" TEXT NOT NULL,"kind" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "ProviderEvent_provider_createdAt_idx" ON "ProviderEvent"("provider","createdAt");
CREATE TABLE "SmsConsent" ("phone" TEXT PRIMARY KEY,"granted" BOOLEAN NOT NULL DEFAULT false,"optedOut" BOOLEAN NOT NULL DEFAULT false,"evidence" TEXT,"updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "SmsMessage" ("id" TEXT PRIMARY KEY,"providerSid" TEXT UNIQUE,"phone" TEXT NOT NULL,"direction" TEXT NOT NULL,"body" TEXT NOT NULL,"status" TEXT NOT NULL,"idempotencyKey" TEXT UNIQUE,"payloadHash" TEXT,"createdBy" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "SmsMessage_phone_createdAt_idx" ON "SmsMessage"("phone","createdAt");
CREATE TABLE "PhoneCall" ("sid" TEXT PRIMARY KEY,"phone" TEXT NOT NULL,"direction" TEXT NOT NULL,"status" TEXT NOT NULL,"durationSeconds" INTEGER,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "StripeCheckout" ("id" TEXT PRIMARY KEY,"invoiceId" TEXT NOT NULL REFERENCES "Invoice"("id"),"amountCents" INTEGER NOT NULL,"currency" TEXT NOT NULL,"sessionId" TEXT UNIQUE,"url" TEXT,"status" TEXT NOT NULL DEFAULT 'PREPARING',"idempotencyKey" TEXT NOT NULL UNIQUE,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "StripeCheckout_invoiceId_idx" ON "StripeCheckout"("invoiceId");
