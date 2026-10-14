CREATE INDEX "SmsMessage_phone_recent_idx" ON "SmsMessage" ("phone", "createdAt" DESC, "id" DESC);
CREATE INDEX "PhoneCall_phone_recent_idx" ON "PhoneCall" ("phone", "createdAt" DESC, "sid" DESC);
