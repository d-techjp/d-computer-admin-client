"use client";

import { usePermissions } from "@/hooks/usePermissions";
import type { AppPermission } from "@/types/auth";

interface PermissionGateProps {
  /** Một quyền, hoặc danh sách quyền (mặc định: chỉ cần 1 trong số đó) */
  permission: AppPermission | AppPermission[];
  /** Bắt buộc có đủ toàn bộ quyền trong danh sách */
  requireAll?: boolean;
  /** Hiển thị khi không đủ quyền — mặc định ẩn hoàn toàn */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Ẩn/hiện một mảnh UI (nút thao tác, tab, cột bảng...) theo permission đã lưu.
 * Đây chỉ là lớp UX — backend vẫn là nơi chặn thật.
 */
export function PermissionGate({
  permission,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasAny, hasAll } = usePermissions();
  const required = Array.isArray(permission) ? permission : [permission];
  const allowed = requireAll ? hasAll(required) : hasAny(required);

  return <>{allowed ? children : fallback}</>;
}

export default PermissionGate;
