ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated access to sites" ON public.sites 
FOR ALL TO authenticated USING (true) WITH CHECK (true);