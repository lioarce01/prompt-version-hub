/**
 * Re-export auth hooks from AuthContext
 *
 * This file exists for backwards compatibility.
 * All auth logic is now handled by AuthContext using Supabase directly.
 */

export { useAuth, useUserId } from "@/contexts/AuthContext";
