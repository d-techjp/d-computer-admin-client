"use client";

import Link from "next/link";
import { Button, Result } from "antd";

import { firstAccessiblePath } from "@/config/menuConfig";
import routes from "@/config/routes";
import { usePermissions } from "@/hooks/usePermissions";

/** Trang 403 khi vào route không nằm trong permission của tài khoản */
export function Forbidden({ description }: { description?: string }) {
  const { permissions } = usePermissions();
  const fallbackPath = firstAccessiblePath(permissions);

  return (
    <Result
      status="403"
      title="403"
      subTitle={
        description ??
        "Tài khoản của bạn không có quyền truy cập trang này. Liên hệ quản trị viên nếu cần mở quyền."
      }
      extra={
        fallbackPath ? (
          <Link href={fallbackPath}>
            <Button type="primary">Về trang được phép truy cập</Button>
          </Link>
        ) : (
          <Link href={routes.auth.login}>
            <Button type="primary">Đăng nhập lại</Button>
          </Link>
        )
      }
    />
  );
}

export default Forbidden;
