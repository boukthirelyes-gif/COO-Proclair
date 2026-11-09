-- Preserve unit identifiers and punctuation. This is an address identity, not a
-- geocoding claim: aliases such as "rue"/"r." still need explicit review.
-- A generated value also protects rows written by imports and backfills existing
-- pins without modifying their status, ownership or history.
ALTER TABLE "ProspectPin" ADD COLUMN "contactAddressKey" TEXT
  GENERATED ALWAYS AS (
    lower(btrim(regexp_replace(normalize("address", NFKC), '[[:space:]]+', ' ', 'g')))
  ) STORED NOT NULL;

-- Addresses may contain 1 000 UTF-8 characters and exceed the B-tree entry limit.
-- Hash indexes keep fixed-sized entries for equality lookups; PostgreSQL still
-- rechecks the complete text value, so hash collisions do not merge identities.
CREATE INDEX "ProspectPin_contactAddressKey_idx" ON "ProspectPin" USING HASH ("contactAddressKey");
