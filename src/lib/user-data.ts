import { supabase } from "@/integrations/supabase/client";
import { HRMUser, UserRole } from "@/types";

export async function fetchHRMUser(userId: string): Promise<HRMUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, company_id, site_id, uan')
    .eq('id', userId)
    .single();

  if (error) {
    console.error("Error fetching HRM user data:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    email: data.email || '',
    name: data.name || 'User',
    role: data.role as UserRole,
    company_id: data.company_id || undefined,
    site_id: data.site_id || undefined,
    uan: data.uan || undefined,
  };
}