/**
 * Auth API Functions
 *
 * Functional API for authentication operations using Supabase Auth.
 * Designed for use with TanStack Query.
 */

import { createClient } from '@/utils/supabase/client';
import type { Database } from '../supabase/types';

export type UserRole = Database['public']['Enums']['user_role'];

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface RegisterParams {
  email: string;
  password: string;
  role?: UserRole;
}

export interface LoginParams {
  email: string;
  password: string;
}

/**
 * Register a new user
 */
export async function register_user({
  email,
  password,
  role = 'editor',
}: RegisterParams): Promise<AuthUser> {
  const supabase = createClient();

  // Sign up the user with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error('Failed to create user');
  }

  // Update the user's role in the users table
  type UsersUpdate = Database['public']['Tables']['users']['Update'];
  const updatePayload: UsersUpdate = { role };

  const { data: userData, error: userError } = await (
    supabase.from('users') as any
  )
    .update(updatePayload)
    .eq('id', authData.user.id)
    .select()
    .single();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!userData) {
    throw new Error('Failed to update user role');
  }

  return userData;
}

/**
 * Login with email and password
 */
export async function login_with_password({ email, password }: LoginParams): Promise<AuthUser> {
  const supabase = createClient();

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error('Invalid credentials');
  }

  // Get user profile from users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (userError) {
    throw new Error(userError.message);
  }

  return userData;
}

/**
 * Logout the current user
 */
export async function logout_user(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Get the current authenticated user
 * Uses getUser() which verifies the JWT is valid
 */
export async function get_current_user(): Promise<AuthUser | null> {
  const supabase = createClient();

  const { data: { user: authUser }, error } = await supabase.auth.getUser();

  if (error || !authUser) {
    return null;
  }

  // If user exists, fetch user data from database
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (userError) {
    console.error('Error fetching user from database:', userError);
    return null;
  }

  return userData;
}

/**
 * Get user data by user ID
 */
export async function get_user_by_id(userId: string): Promise<AuthUser | null> {
  const supabase = createClient();

  const { data: userData, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user from database:', error);
    return null;
  }

  return userData;
}

/**
 * Refresh the access token
 */
export async function refresh_auth_session() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

/**
 * Get the current session
 */
export async function get_session() {
  const supabase = createClient();

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Error getting session:', error);
    return null;
  }

  return session;
}
