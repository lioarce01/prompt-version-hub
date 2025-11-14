/**
 * Auth Sync Provider
 *
 * Component that sets up Supabase auth listener and automatic session refresh.
 * Must be rendered inside QueryClientProvider.
 */

'use client';

import { use_auth_sync } from '@/hooks/auth/useAuthSync';
import { use_session_refresh } from '@/hooks/auth/useSessionRefresh';

export function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  // Set up Supabase auth state listener to sync with TanStack Query cache
  use_auth_sync();

  // Set up automatic session refresh before token expiration
  use_session_refresh();

  return <>{children}</>;
}
