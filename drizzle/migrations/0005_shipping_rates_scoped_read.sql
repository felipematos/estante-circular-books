DROP POLICY IF EXISTS "rates public read" ON public.shipping_rates;
CREATE POLICY "rates public read" ON public.shipping_rates FOR SELECT TO anon, authenticated
USING (region IN ('SE','S','CO','NE','N') AND max_weight_g > 0 AND price_cents >= 0);