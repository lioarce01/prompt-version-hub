"use client";

import { useAuth } from "./useAuth";
import type { UserRole } from "@/types/api";

export function useRole() {
  const { user } = useAuth();
  const role: UserRole | null = user?.role || null;

  const isAdmin = role === "admin";
  const isEditor = role === "editor" || isAdmin;
  const isViewer = role === "viewer" || isEditor || isAdmin;

  // Permission helpers
  const canEdit = isAdmin || role === "editor";
  const canDelete = isAdmin;
  const canDeploy = isAdmin || role === "editor";
  const canManageUsers = isAdmin;
  const canManageABTests = isAdmin;

  return {
    role,
    isAdmin,
    isEditor,
    isViewer,
    canEdit,
    canDelete,
    canDeploy,
    canManageUsers,
    canManageABTests,
  };
}
