CREATE TABLE "UserInvitation" (
 "id" TEXT PRIMARY KEY,"userId" TEXT NOT NULL,"userVersion" INTEGER NOT NULL,"tokenHash" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,"usedAt" TIMESTAMP(3),"revokedAt" TIMESTAMP(3),"createdBy" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "UserInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "UserInvitation_tokenHash_key" ON "UserInvitation"("tokenHash");
CREATE INDEX "UserInvitation_userId_createdAt_idx" ON "UserInvitation"("userId","createdAt");
