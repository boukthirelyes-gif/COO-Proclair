-- Existing invoices/payments remain LIVE; legacy demonstration checkouts remain TEST and non-ledger.
ALTER TABLE "Invoice" ADD COLUMN "paymentMode" TEXT NOT NULL DEFAULT 'LIVE';
ALTER TABLE "StripeCheckout" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'TEST', ADD COLUMN "enterprise" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "paymentIntentId" TEXT;
CREATE UNIQUE INDEX "StripeCheckout_mode_paymentIntentId_key" ON "StripeCheckout"("mode","paymentIntentId");
ALTER TABLE "Payment" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'LIVE', ADD COLUMN "stripeCheckoutId" TEXT;
CREATE UNIQUE INDEX "Payment_stripeCheckoutId_key" ON "Payment"("stripeCheckoutId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_stripeCheckoutId_fkey" FOREIGN KEY ("stripeCheckoutId") REFERENCES "StripeCheckout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "StripeRefund" ("id" TEXT PRIMARY KEY,"mode" TEXT NOT NULL,"paymentId" TEXT NOT NULL REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"providerRefundId" TEXT,"amountCents" INTEGER NOT NULL CHECK ("amountCents">0),"status" TEXT NOT NULL DEFAULT 'REQUESTED',"reason" TEXT NOT NULL,"idempotencyKey" TEXT NOT NULL UNIQUE,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL);
CREATE UNIQUE INDEX "StripeRefund_mode_providerRefundId_key" ON "StripeRefund"("mode","providerRefundId");
CREATE INDEX "StripeRefund_paymentId_status_idx" ON "StripeRefund"("paymentId","status");
CREATE TABLE "StripeEventReceipt" ("id" TEXT PRIMARY KEY,"mode" TEXT NOT NULL,"stripeEventId" TEXT NOT NULL,"kind" TEXT NOT NULL,"payloadHash" TEXT NOT NULL,"snapshot" JSONB NOT NULL,"receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE("mode","stripeEventId"));
CREATE INDEX "StripeEventReceipt_mode_receivedAt_idx" ON "StripeEventReceipt"("mode","receivedAt");
CREATE TABLE "StripeEventDecision" ("id" TEXT PRIMARY KEY,"receiptId" TEXT NOT NULL REFERENCES "StripeEventReceipt"("id") ON DELETE RESTRICT,"outcome" TEXT NOT NULL,"code" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "StripeEventDecision_receiptId_createdAt_idx" ON "StripeEventDecision"("receiptId","createdAt");
CREATE FUNCTION proclair_immutable_stripe_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Stripe event history is immutable'; END; $$;
CREATE TRIGGER "stripe_receipt_immutable" BEFORE UPDATE OR DELETE ON "StripeEventReceipt" FOR EACH ROW EXECUTE FUNCTION proclair_immutable_stripe_history();
CREATE TRIGGER "stripe_decision_immutable" BEFORE UPDATE OR DELETE ON "StripeEventDecision" FOR EACH ROW EXECUTE FUNCTION proclair_immutable_stripe_history();

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paymentMode_check" CHECK ("paymentMode" IN ('TEST','LIVE'));
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_mode_check" CHECK (mode IN ('TEST','LIVE'));
ALTER TABLE "StripeCheckout" ADD CONSTRAINT "StripeCheckout_mode_check" CHECK (mode IN ('TEST','LIVE'));
ALTER TABLE "StripeRefund" ADD CONSTRAINT "StripeRefund_mode_check" CHECK (mode IN ('TEST','LIVE'));
