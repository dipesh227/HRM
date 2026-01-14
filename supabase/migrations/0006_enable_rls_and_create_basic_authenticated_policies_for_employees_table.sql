ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated access to employees" ON public.employees 
FOR ALL TO authenticated USING (true) WITH CHECK (true);