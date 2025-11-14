/**
 * Auth Sync Hook
 *
 * Syncs Supabase auth state changes to TanStack Query cache.
 * Handles real-time auth events from Supabase (login, logout, token refresh).
 */

'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { auth_keys } from '@/lib/api/auth-keys';
import { type AuthUser } from '@/lib/api/auth';

export function use_auth_sync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    // Supabase's onAuthStateChange will fire INITIAL_SESSION event immediately
    // We rely on this instead of manually calling getSession()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // Handle different auth events
      // IMPORTANT: Don't manually fetch/set user data - let the auth query handle it
      // Just invalidate to trigger refetch
      switch (event) {
        case 'INITIAL_SESSION':
        case 'SIGNED_IN':
        case 'USER_UPDATED':
        case 'TOKEN_REFRESHED':
          queryClient.invalidateQueries({ queryKey: auth_keys.session() });
          break;

        case 'SIGNED_OUT':
          queryClient.clear();
          queryClient.setQueryData<AuthUser | null>(auth_keys.session(), null);
          break;
      }
    });

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);
}
