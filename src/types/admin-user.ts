export type AdminUserStatus = "active" | "suspended";

/** Quyền dạng `resource:action` — đủ để dựng cây phân quyền trong UI */
export type Permission =
  | "dashboard:view"
  | "product:view"
  | "product:edit"
  | "order:view"
  | "order:edit"
  | "customer:view"
  | "customer:edit"
  | "warehouse:view"
  | "warehouse:edit"
  | "post:view"
  | "post:edit"
  | "admin:manage";

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  memberCount: number;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  status: AdminUserStatus;
  lastLoginAt: string;
  createdAt: string;
}

export const PERMISSION_LABEL: Record<Permission, string> = {
  "dashboard:view": "Xem tổng quan",
  "product:view": "Xem sản phẩm",
  "product:edit": "Sửa sản phẩm",
  "order:view": "Xem đơn hàng",
  "order:edit": "Xử lý đơn hàng",
  "customer:view": "Xem khách hàng",
  "customer:edit": "Sửa khách hàng",
  "warehouse:view": "Xem kho",
  "warehouse:edit": "Nhập/xuất kho",
  "post:view": "Xem bài viết",
  "post:edit": "Sửa bài viết",
  "admin:manage": "Quản trị hệ thống",
};

export const ADMIN_USER_STATUS_LABEL: Record<AdminUserStatus, string> = {
  active: "Đang hoạt động",
  suspended: "Tạm khoá",
};
