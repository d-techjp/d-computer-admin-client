"use client";

import { useMemo } from "react";

import { canAccessPath } from "@/config/permissions";
import { useAuthStore } from "@/store/useAuthStore";
import type { AppPermission } from "@/types/auth";

/**
 * Đọc permission đã lưu sau khi đăng nhập để show/hide UI.
 * Dùng ở component: `const { has } = usePermissions(); has("orders.manage")`.
 */
export function usePermissions() {
  const permissions = useAuthStore((state) => state.permissions);
  const role = useAuthStore((state) => state.role);

  return useMemo(
    () => ({
      permissions,
      role,
      has: (permission: AppPermission) => permissions.includes(permission),
      hasAny: (required: AppPermission[]) =>
        required.length === 0 || required.some((item) => permissions.includes(item)),
      hasAll: (required: AppPermission[]) =>
        required.every((item) => permissions.includes(item)),
      canAccessPath: (pathname: string) => canAccessPath(pathname, permissions),
    }),
    [permissions, role],
  );
}

export default usePermissions;
