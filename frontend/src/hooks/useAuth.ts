"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { logout, setUser, setToken } from "@/features/auth/authSlice";
import {
  useGetCurrentUserQuery,
  useRefreshTokenMutation,
} from "@/features/auth/authApi";

interface JwtPayload {
  exp: number;
  sub: string;
  role: string;
}

export function useAuth() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, token, isAuthenticated } = useAppSelector(
    (state) => state.auth
  );

  const [refreshToken] = useRefreshTokenMutation();

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

  // Auto-refresh token 5 minutes before expiration
  useEffect(() => {
    if (!token) return;

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const expiresAt = decoded.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      const refreshAt = timeUntilExpiry - 5 * 60 * 1000; // 5 minutes before expiry

      if (refreshAt > 0) {
        const timer = setTimeout(async () => {
          try {
            const response = await refreshToken().unwrap();
            dispatch(setToken(response.access_token));
          } catch (error) {
            console.error("Auto-refresh failed:", error);
            dispatch(logout());
            router.push("/login");
          }
        }, refreshAt);

        return () => clearTimeout(timer);
      } else {
        // Token already expired or will expire very soon, try to refresh immediately
        refreshToken()
          .unwrap()
          .then((response) => {
            dispatch(setToken(response.access_token));
          })
          .catch(() => {
            dispatch(logout());
            router.push("/login");
          });
      }
    } catch (error) {
      console.error("Failed to decode token:", error);
      dispatch(logout());
      router.push("/login");
    }
  }, [token, dispatch, router, refreshToken]);

  // Handle auth errors (expired token, invalid token)
  useEffect(() => {
    if (isError && token) {
      // Try to refresh token before logging out
      refreshToken()
        .unwrap()
        .then((response) => {
          dispatch(setToken(response.access_token));
        })
        .catch(() => {
          // Refresh failed, logout
          dispatch(logout());
          router.push("/login");
        });
    }
  }, [isError, token, dispatch, router, refreshToken]);

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
