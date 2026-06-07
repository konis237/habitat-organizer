
ALTER TABLE public.factures_eau
  ADD COLUMN IF NOT EXISTS ancien_index numeric,
  ADD COLUMN IF NOT EXISTS nouveau_index numeric,
  ADD COLUMN IF NOT EXISTS prix_unitaire numeric;
