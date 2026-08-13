export type AdminUserStatus = "active" | "inactive" | "banned";

/** Contract trả permission code dạng chuỗi (`product.manage`, `user.admin.manage`, ...). */
export type Permission = string;

export interface AdminRole {
  id: string;
  code: string;
  name: string;
  description: string;
  permissions: Permission[];
  memberCount: number;
  isSystem?: boolean;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  roleCode: string;
  roleName: string;
  status: AdminUserStatus;
  lastLoginAt?: string;
  createdAt: string;
}

export const PERMISSION_LABEL: Record<string, string> = {
  "dashboard.view": "Xem tổng quan",
  "product.manage": "Quản lý sản phẩm",
  "product.category.manage": "Quản lý danh mục",
  "product.brand.manage": "Quản lý thương hiệu",
  "product.carousel.manage": "Quản lý carousel sản phẩm",
  "orders.manage": "Quản lý đơn hàng",
  "user.customer.manage": "Quản lý khách hàng",
  "user.admin.manage": "Quản lý quản trị viên",
  "user.role.manage": "Quản lý phân quyền",
  "inventory.manage": "Quản lý kho",
  "articles.manage": "Quản lý bài viết",
  "logs.view": "Xem nhật ký",
};

export const ADMIN_USER_STATUS_LABEL: Record<AdminUserStatus, string> = {
  active: "Đang hoạt động",
  inactive: "Ngừng hoạt động",
  banned: "Bị khoá",
};
