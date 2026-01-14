"use client";

import { MadeWithDyad } from "@/components/made-with-dyad";
import { useAuth } from "@/contexts/AuthContextProvider";
import { UserRole } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { hrmUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!hrmUser) {
      // Redirect unauthenticated users to login
      router.push('/login');
      return;
    }

    // Redirect authenticated users based on role
    switch (hrmUser.role) {
      case UserRole.HR:
        router.push('/hr');
        break;
      case UserRole.SITE_INCHARGE:
        router.push('/site');
        break;
      case UserRole.EMPLOYEE:
        router.push('/employee');
        break;
      default:
        // Fallback or error page if role is undefined/unknown
        router.push('/login');
        break;
    }
  }, [hrmUser, isLoading, router]);

  if (isLoading || hrmUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading application...</p>
      </div>
    );
  }

  // Should not be reached if redirection works, but necessary for React component return
  return null;
}