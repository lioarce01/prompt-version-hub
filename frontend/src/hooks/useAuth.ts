"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { logout, restoreSession } from "@/features/auth/authSlice";
import { useGetCurrentUserQuery } from "@/features/auth/authApi";

export function useAuth() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, token, isAuthenticated } = useAppSelector(
    (state) => state.auth
  );

  // Fetch current user if we have a token but no user data
  const { data: currentUser } = useGetCurrentUserQuery(undefined, {
    skip: !token || !!user,
  });

  // Update user data when fetched
  useEffect(() => {
    if (currentUser && !user) {
      // User data fetched successfully
      // The user state will be updated via setCredentials elsewhere if needed
    }
  }, [currentUser, user]);

  // Restore session from localStorage on mount
  useEffect(() => {
    if (!isAuthenticated) {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        dispatch(restoreSession({ token: storedToken }));
      }
    }
  }, [isAuthenticated, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    router.push("/login");
  };

  return {
    user: currentUser || user,
    token,
    isAuthenticated,
    logout: handleLogout,
  };
}
