"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HRMUser } from '@/types';
import { fetchHRMUser } from '@/lib/user-data';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  hrmUser: HRMUser | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [hrmUser, setHrmUser] = useState<HRMUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleSession = async (session: Session | null) => {
    setSession(session);
    const supabaseUser = session?.user ?? null;
    setUser(supabaseUser);

    if (supabaseUser) {
      const hrmData = await fetchHRMUser(supabaseUser.id);
      setHrmUser(hrmData);
    } else {
      setHrmUser(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        handleSession(session);
        if (event === 'SIGNED_IN') {
          toast.success("Welcome back!");
        }
      } else if (event === 'SIGNED_OUT') {
        handleSession(null);
        toast.info("You have been signed out.");
      } else if (event === 'USER_UPDATED') {
        // Re-fetch user data if profile is updated
        if (session?.user) {
          handleSession(session);
        }
      }
    });

    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, hrmUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
};