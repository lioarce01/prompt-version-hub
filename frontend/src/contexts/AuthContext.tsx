"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { authService, type AuthUser } from "@/lib/services/auth.service";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial user
    authService
      .getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
      })
      .catch((error) => {
        console.error("Error fetching user:", error);
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Listen to auth state changes
    const { data: authListener } = authService.onAuthStateChange(
      (newUser) => {
        setUser(newUser);
        setIsLoading(false);
      }
    );

    // Cleanup subscription
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const user = await authService.login({ email, password });
    setUser(user);
  };

  const register = async (email: string, password: string) => {
    const user = await authService.register({ email, password });
    setUser(user);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useUserId(): string | null {
  const { user } = useAuth();
  return user?.id || null;
}
