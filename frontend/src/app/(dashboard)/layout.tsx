"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, token, logout } = useAuth();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated && !token) {
      router.push("/login");
    }
  }, [isAuthenticated, token, router]);

  // Show nothing while checking auth
  if (!isAuthenticated && !token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header */}
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard">
            <h1 className="text-xl font-semibold">Prompt Version Hub</h1>
          </Link>
          <Button variant="ghost" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
