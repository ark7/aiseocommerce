-- Migration: add_payment_sandbox_mode.sql
-- Enables sandbox mode for payment gateway testing without affecting real transactions.

ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "sandboxPaymentEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "midtransSandboxMerchantId" TEXT;
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "midtransSandboxClientKey" TEXT;
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "midtransSandboxServerKey" TEXT;
ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "flipSandboxApiKey" TEXT;

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sandboxEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "isSandbox" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "isSandbox" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ledgers" ADD COLUMN IF NOT EXISTS "isSandbox" BOOLEAN NOT NULL DEFAULT false;

