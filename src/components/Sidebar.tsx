"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Sidebar, SidebarItem, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { navItems } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContextProvider";
import { UserRole } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

const SidebarComponent = () => {
  const { hrmUser } = useAuth();
  const pathname = usePathname();

  if (!hrmUser) return null;

  const userRole = hrmUser.role as UserRole;

  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to log out.");
      console.error(error);
    } else {
      // AuthContextProvider handles the toast.info("You have been signed out.")
    }
  };

  return (
    <Sidebar className="h-full">
      <SidebarHeader className="p-4 border-b">
        <h1 className="text-xl font-bold text-sidebar-primary">HRM System</h1>
        <p className="text-sm text-sidebar-foreground/70">{hrmUser.role}</p>
      </SidebarHeader>
      
      <div className="flex-1 overflow-y-auto p-2">
        {filteredNavItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <SidebarItem 
              icon={<item.icon className="h-5 w-5" />}
              isActive={pathname.startsWith(item.href) && item.href !== '/'}
            >
              {item.title}
            </SidebarItem>
          </Link>
        ))}
      </div>

      <SidebarFooter className="p-2 border-t">
        <SidebarItem 
          icon={<LogOut className="h-5 w-5" />}
          onClick={handleLogout}
          className="cursor-pointer text-destructive hover:bg-destructive/10"
        >
          Logout
        </SidebarItem>
      </SidebarFooter>
    </Sidebar>
  );
};

export default SidebarComponent;