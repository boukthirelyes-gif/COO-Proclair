CREATE TABLE "SecuritySessionEpoch" ("id" TEXT PRIMARY KEY,"version" INTEGER NOT NULL DEFAULT 0,"updatedAt" TIMESTAMP(3) NOT NULL);
ALTER TABLE "SecuritySessionEpoch" ADD CONSTRAINT "SecuritySessionEpoch_version_check" CHECK ("version">=0);
