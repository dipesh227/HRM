ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated access to companies" ON public.companies 
FOR ALL TO authenticated USING (true) WITH CHECK (true);