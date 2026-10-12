CREATE TABLE "IntegrationSecret" ("key" TEXT PRIMARY KEY, "encryptedValue" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "OAuthReceipt" ("stateHash" TEXT PRIMARY KEY, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "OAuthReceipt_expiresAt_idx" ON "OAuthReceipt"("expiresAt");
CREATE TABLE "LoginBucket" ("id" TEXT PRIMARY KEY, "attempts" INTEGER NOT NULL DEFAULT 0, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "LoginBucket_expiresAt_idx" ON "LoginBucket"("expiresAt");
