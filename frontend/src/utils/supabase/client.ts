/**
 * Supabase Client for Client Components
 *
 * Use this client in Client Components (components with "use client" directive).
 * This client uses @supabase/ssr which automatically handles cookie-based auth.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
