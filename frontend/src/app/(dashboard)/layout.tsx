"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/Sidebar";

const collapsedWidth = 88;
const expandedWidth = 256;

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, token } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const sidebarWidth = useMemo(
    () => (isSidebarCollapsed ? collapsedWidth : expandedWidth),
    [isSidebarCollapsed]
  );

  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated && !token) {
        router.replace("/login");
      } else {
        setIsChecking(false);
      }
    };

    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [isAuthenticated, token, router]);

  if (isChecking || (!isAuthenticated && !token)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      <main
        className="min-h-screen transition-[padding-left] duration-300 ease-in-out"
        style={{ paddingLeft: sidebarWidth, paddingTop: 48 }}
      >
        <div className="min-h-screen px-8 pb-12 pt-0">{children}</div>
      </main>
    </div>
  );
}
