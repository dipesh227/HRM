ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view their own notifications" ON public.notifications 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to insert their own notifications" ON public.notifications 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to update their own notifications" ON public.notifications 
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to delete their own notifications" ON public.notifications 
FOR DELETE TO authenticated USING (auth.uid() = user_id);