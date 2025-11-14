/**
 * Session Refresh Hook
 *
 * Automatically refreshes auth session before JWT expiration.
 * Uses background query to keep session alive.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { use_auth_state } from './useAuthQuery';
import { refresh_auth_session, get_session } from '@/lib/api/auth';
import { useEffect, useState } from 'react';

const REFRESH_BUFFER_MS = 60 * 1000; // Refresh 1 minute before expiration

export function use_session_refresh() {
  const { user } = use_auth_state();
  const [refreshInterval, setRefreshInterval] = useState<number | false>(false);

  // Calculate refresh interval based on session expiration
  useEffect(() => {
    if (!user) {
      setRefreshInterval(false);
      return;
    }

    const calculateRefreshInterval = async () => {
      const session = await get_session();

      if (!session?.expires_at) {
        // If no session but we have user, something is wrong - refetch immediately
        setRefreshInterval(1000);
        return;
      }

      const expiresAt = new Date(session.expires_at).getTime();
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // Refresh when 80% of the session time has elapsed or 1 minute before expiry
      const refreshTime = Math.min(timeUntilExpiry * 0.8, timeUntilExpiry - REFRESH_BUFFER_MS);

      if (refreshTime > 0) {
        setRefreshInterval(refreshTime);
      } else {
        // Session is about to expire or already expired, refresh immediately
        setRefreshInterval(1000); // Refresh in 1 second
      }
    };

    calculateRefreshInterval();
  }, [user]);

  // Background query that refreshes the session
  return useQuery({
    queryKey: ['auth', 'session-refresh'],
    queryFn: async () => {
      const session = await refresh_auth_session();

      if (session?.expires_at) {
        // Recalculate refresh interval after successful refresh
        const expiresAt = new Date(session.expires_at).getTime();
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        const refreshTime = Math.min(timeUntilExpiry * 0.8, timeUntilExpiry - REFRESH_BUFFER_MS);

        if (refreshTime > 0) {
          setRefreshInterval(refreshTime);
        }
      }

      return session;
    },
    enabled: !!user && refreshInterval !== false,
    refetchInterval: refreshInterval || undefined,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}
