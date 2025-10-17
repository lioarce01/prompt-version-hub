"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, token } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = () => {
      if (!isAuthenticated && !token) {
        router.replace("/login");
      } else {
        setIsChecking(false);
      }
    };

    // Small delay to allow token to be restored from localStorage
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [isAuthenticated, token, router]);

  // Show loading while checking authentication
  if (isChecking || (!isAuthenticated && !token)) {
    return (
      <div className="min-h-screen bg-background dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark">
      <Header />
      <Sidebar />

      {/* Main content with offset for header and sidebar */}
      <main className="ml-64 mt-14 min-h-[calc(100vh-3.5rem)]">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
