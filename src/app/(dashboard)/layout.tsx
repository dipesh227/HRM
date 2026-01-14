"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContextProvider";
import { useRouter } from "next/navigation";
import SidebarComponent from "@/components/Sidebar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { hrmUser, isLoading } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading user session...</p>
      </div>
    );
  }

  if (!hrmUser) {
    // Should be handled by /page.tsx redirect, but good to have a fallback
    router.push('/login');
    return null;
  }

  // Mobile Layout: Sheet for Sidebar
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="flex items-center justify-between p-4 border-b bg-background">
          <h1 className="text-xl font-bold">HRM</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 sm:w-72">
              <SidebarComponent />
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 p-4 overflow-auto">
          {children}
        </main>
      </div>
    );
  }

  // Desktop Layout: Resizable Sidebar
  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="min-h-screen w-full"
    >
      <ResizablePanel defaultSize={15} minSize={10} maxSize={20}>
        <SidebarComponent />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={85}>
        <main className="p-8 h-full overflow-y-auto">
          {children}
        </main>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}