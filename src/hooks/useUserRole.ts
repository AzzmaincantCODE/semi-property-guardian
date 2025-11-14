import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type UserRole = 'admin' | 'manager' | 'user' | null;

export const useUserRole = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const session = (await supabase.auth.getSession()).data.session;
    const id = session?.user?.id || null;
    setUserId(id);
    if (id) {
      const { data } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', id)
        .maybeSingle();
      setFullName((data as any)?.full_name || null);
      setRole((data as any)?.role || null);
    } else {
      setFullName(null);
      setRole(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);

  return { userId, fullName, role, loading, isAdmin: role === 'admin' };
};


