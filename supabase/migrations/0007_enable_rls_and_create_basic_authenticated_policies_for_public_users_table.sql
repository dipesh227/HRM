ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated access to public users table" ON public.users 
FOR ALL TO authenticated USING (true) WITH CHECK (true);