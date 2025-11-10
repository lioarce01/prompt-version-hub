/**
 * Authentication Service
 *
 * Handles all authentication operations using Supabase Auth
 */

import { getSupabaseBrowserClient } from '../supabase/client';
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

export class AuthService {
  private supabase = getSupabaseBrowserClient();

  /**
   * Register a new user
   */
  async register({ email, password, role = 'editor' }: RegisterParams): Promise<AuthUser> {
    // Sign up the user with Supabase Auth
    const { data: authData, error: authError } = await this.supabase.auth.signUp({
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
    const { data: userData, error: userError } = await this.supabase
      .from('users')
      .update({ role })
      .eq('id', authData.user.id)
      .select()
      .single();

    if (userError) {
      throw new Error(userError.message);
    }

    return userData;
  }

  /**
   * Login with email and password
   */
  async login({ email, password }: LoginParams): Promise<AuthUser> {
    const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
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
    const { data: userData, error: userError } = await this.supabase
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
  async logout(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data: userData, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return userData;
  }

  /**
   * Get the current session
   */
  async getSession() {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  /**
   * Refresh the access token
   */
  async refreshToken() {
    const { data, error } = await this.supabase.auth.refreshSession();
    if (error) {
      throw new Error(error.message);
    }
    return data.session;
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: userData } = await this.supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        callback(userData);
      } else {
        callback(null);
      }
    });
  }
}

export const authService = new AuthService();
