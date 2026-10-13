-- Additive, read-only Rotor / Surge SMS mirror. Does not alter Twilio tables.
CREATE TABLE "RotorInboxMessage" (
 "externalId" TEXT NOT NULL,
 "channel" TEXT NOT NULL,
 "direction" TEXT NOT NULL,
 "body" TEXT NOT NULL,
 "phone" TEXT,
 "contactId" TEXT,
 "contactType" TEXT,
 "threadId" TEXT,
 "subject" TEXT,
 "status" TEXT,
 "read" BOOLEAN NOT NULL DEFAULT false,
 "messageAt" TIMESTAMP(3) NOT NULL,
 "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "RotorInboxMessage_pkey" PRIMARY KEY ("externalId")
);
CREATE INDEX "RotorInboxMessage_messageAt_idx" ON "RotorInboxMessage"("messageAt");
CREATE INDEX "RotorInboxMessage_phone_messageAt_idx" ON "RotorInboxMessage"("phone", "messageAt");
