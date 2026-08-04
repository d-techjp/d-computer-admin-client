"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Spin } from "antd";

import { requiredPermissionFor } from "@/config/permissions";
import routes from "@/config/routes";
import { useAuthHydrated, useAuthStore } from "@/store/useAuthStore";
import { canAccessAdminPortal } from "@/types/auth";

import { Forbidden } from "./Forbidden";

function FullPageLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spin size="large" />
    </div>
  );
}

/**
 * Chốt bảo vệ khu vực quản trị:
 * 1. Chưa đăng nhập (hoặc token hết hạn / bị thu hồi) ⇒ đẩy về /login kèm `next`.
 * 2. Đồng bộ lại permission từ `GET /api/v1/auth/permissions` mỗi lần vào app,
 *    để quyền vừa bị đổi ở backend có hiệu lực ngay.
 * 3. Route hiện tại cần permission mà tài khoản không có ⇒ hiện 403.
 *
 * Token nằm ở localStorage nên không thể chặn ở middleware (server không đọc
 * được); guard phía client là lớp UX, backend vẫn tự kiểm tra mọi request.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthHydrated();
  const router = useRouter();
  const pathname = usePathname();

  const accessToken = useAuthStore((state) => state.accessToken);
  const authenticated = useAuthStore((state) => state.isAuthenticated());
  const role = useAuthStore((state) => state.role);
  const permissions = useAuthStore((state) => state.permissions);

  /** Chỉ chặn render lần đầu khi trong storage chưa có permission nào */
  const [syncingPermissions, setSyncingPermissions] = useState(
    () => useAuthStore.getState().permissions.length === 0,
  );

  useEffect(() => {
    if (!hydrated || authenticated) return;
    const next = encodeURIComponent(pathname);
    router.replace(`${routes.auth.login}?next=${next}`);
  }, [hydrated, authenticated, pathname, router]);

  useEffect(() => {
    if (!hydrated || !accessToken) return;

    let alive = true;

    useAuthStore
      .getState()
      .refreshPermissions()
      .finally(() => {
        if (alive) setSyncingPermissions(false);
      });

    return () => {
      alive = false;
    };
  }, [hydrated, accessToken]);

  // Chờ đọc storage + chờ điều hướng về /login để không "nháy" nội dung admin
  if (!hydrated || !authenticated) return <FullPageLoading />;

  if (syncingPermissions && permissions.length === 0) return <FullPageLoading />;

  if (!canAccessAdminPortal(role)) {
    return <Forbidden description="Tài khoản này không thuộc nhóm được vào trang quản trị." />;
  }

  if (permissions.length === 0) {
    return <Forbidden description="Tài khoản chưa được cấp quyền nào trong trang quản trị." />;
  }

  const required = requiredPermissionFor(pathname);
  if (required && !permissions.includes(required)) return <Forbidden />;

  return <>{children}</>;
}

export default AuthGuard;
