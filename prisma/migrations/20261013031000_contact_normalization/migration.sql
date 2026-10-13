ALTER TABLE "Customer" ADD COLUMN "normalizedEmail" TEXT GENERATED ALWAYS AS (NULLIF(lower(btrim("email")),'')) STORED;
ALTER TABLE "Customer" ADD COLUMN "normalizedPhone" TEXT GENERATED ALWAYS AS (
 NULLIF(CASE WHEN length(regexp_replace(COALESCE("phone",''),'[^0-9]','','g'))=11 AND left(regexp_replace(COALESCE("phone",''),'[^0-9]','','g'),1)='1'
 THEN right(regexp_replace(COALESCE("phone",''),'[^0-9]','','g'),10)
 ELSE regexp_replace(COALESCE("phone",''),'[^0-9]','','g') END,'')
) STORED;
CREATE INDEX "Customer_normalizedEmail_idx" ON "Customer"("normalizedEmail");
CREATE INDEX "Customer_normalizedPhone_idx" ON "Customer"("normalizedPhone");
