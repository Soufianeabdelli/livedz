-- Enforce the stock invariant: available = stock - reserved >= 0
ALTER TABLE "Variant"
  ADD CONSTRAINT "variant_stock_nonneg"      CHECK ("stock" >= 0),
  ADD CONSTRAINT "variant_reserved_nonneg"   CHECK ("reserved" >= 0),
  ADD CONSTRAINT "variant_reserved_le_stock" CHECK ("reserved" <= "stock");