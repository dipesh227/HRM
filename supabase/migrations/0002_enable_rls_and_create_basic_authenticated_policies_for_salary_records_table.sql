ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated access to salary_records" ON public.salary_records 
FOR ALL TO authenticated USING (true) WITH CHECK (true);