"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { logout, setUser } from "@/features/auth/authSlice";
import { useGetCurrentUserQuery } from "@/features/auth/authApi";

export function useAuth() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, token, isAuthenticated } = useAppSelector(
    (state) => state.auth
  );

  // Fetch user data when we have a token but no user info
  const { data: userData, isError } = useGetCurrentUserQuery(undefined, {
    skip: !token || !!user, // Skip if no token or user already loaded
  });

  // Update Redux state when user data is fetched
  useEffect(() => {
    if (userData && !user) {
      dispatch(setUser(userData));
    }
  }, [userData, user, dispatch]);

  // Handle auth errors (expired token, invalid token)
  useEffect(() => {
    if (isError && token) {
      // Token is invalid or expired, logout
      dispatch(logout());
      router.push("/login");
    }
  }, [isError, token, dispatch, router]);

  const handleLogout = () => {
    dispatch(logout());
    router.push("/login");
  };

  return {
    user,
    token,
    isAuthenticated,
    logout: handleLogout,
  };
}
