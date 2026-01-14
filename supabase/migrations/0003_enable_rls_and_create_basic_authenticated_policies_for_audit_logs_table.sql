ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated access to audit_logs" ON public.audit_logs 
FOR ALL TO authenticated USING (true) WITH CHECK (true);