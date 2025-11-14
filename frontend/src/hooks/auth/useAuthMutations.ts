/**
 * Auth Mutation Hooks
 *
 * TanStack Query mutations for authentication actions (login, register, logout).
 * Includes optimistic updates for immediate UI feedback.
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { auth_keys } from '@/lib/api/auth-keys';
import {
  login_with_password,
  register_user,
  logout_user,
  type LoginParams,
  type RegisterParams,
  type AuthUser,
} from '@/lib/api/auth';

/**
 * Login mutation hook
 */
export function use_login_mutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: LoginParams) => login_with_password(params),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: auth_keys.session() });
    },
    onSuccess: (userData) => {
      // Update the auth query cache with user data
      queryClient.setQueryData<AuthUser | null>(auth_keys.session(), userData);
    },
    onError: (error) => {
      console.error('Login error:', error);
      // Clear auth cache on error
      queryClient.setQueryData<AuthUser | null>(auth_keys.session(), null);
    },
  });
}

/**
 * Register mutation hook
 */
export function use_register_mutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: RegisterParams) => register_user(params),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: auth_keys.session() });
    },
    onSuccess: (userData) => {
      // Update the auth query cache with user data
      queryClient.setQueryData<AuthUser | null>(auth_keys.session(), userData);
    },
    onError: (error) => {
      console.error('Register error:', error);
      // Clear auth cache on error
      queryClient.setQueryData<AuthUser | null>(auth_keys.session(), null);
    },
  });
}

/**
 * Logout mutation hook
 */
export function use_logout_mutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout_user,
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: auth_keys.session() });

      // Optimistically clear the user
      queryClient.setQueryData<AuthUser | null>(auth_keys.session(), null);
    },
    onSuccess: () => {
      // Clear all queries on logout
      queryClient.clear();

      // Ensure auth is set to null
      queryClient.setQueryData<AuthUser | null>(auth_keys.session(), null);
    },
    onError: (error, _, context) => {
      console.error('Logout error:', error);
    },
  });
}
