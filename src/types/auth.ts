/**
 * Kiểu dữ liệu bám theo contract OpenAPI (`openapi.yaml`) của D-Computer Service API
 * — nhóm tag `Auth`. Đổi tên DTO sang danh từ ngắn cho phía client nhưng giữ
 * nguyên tên field để map 1-1 với response của backend.
 */

/** `AuthUserDto.role` / `PermissionsResponseDto.role` */
export type AuthRole = "admin" | "staff" | "customer";

/** Enum permission trong `PermissionsResponseDto.permissions` */
export type AppPermission =
  | "dashboard.view"
  | "user.customer.manage"
  | "user.admin.manage"
  | "user.role.manage"
  | "product.manage"
  | "product.category.manage"
  | "product.brand.manage"
  | "articles.manage"
  | "orders.manage"
  | "inventory.manage"
  | "logs.view";

export const APP_PERMISSIONS: readonly AppPermission[] = [
  "dashboard.view",
  "user.customer.manage",
  "user.admin.manage",
  "user.role.manage",
  "product.manage",
  "product.category.manage",
  "product.brand.manage",
  "articles.manage",
  "orders.manage",
  "inventory.manage",
  "logs.view",
] as const;

export const APP_PERMISSION_LABEL: Record<AppPermission, string> = {
  "dashboard.view": "Xem tổng quan",
  "user.customer.manage": "Quản lý khách hàng",
  "user.admin.manage": "Quản lý quản trị viên",
  "user.role.manage": "Quản lý phân quyền",
  "product.manage": "Quản lý sản phẩm & tồn kho",
  "product.category.manage": "Quản lý danh mục",
  "product.brand.manage": "Quản lý thương hiệu",
  "articles.manage": "Quản lý bài viết",
  "orders.manage": "Quản lý đơn hàng",
  "inventory.manage": "Quản lý kho",
  "logs.view": "Xem nhật ký hoạt động",
};

export const AUTH_ROLE_LABEL: Record<AuthRole, string> = {
  admin: "Quản trị viên",
  staff: "Nhân viên",
  customer: "Khách hàng",
};

/** `AuthUserDto` */
export interface AuthUser {
  id: string;
  username: string;
  /** Contract khai báo dạng object nullable — backend trả chuỗi hoặc null */
  email?: string | null;
  fullName: string;
  role: AuthRole;
}

/**
 * `GET /auth/profile` trả về đầy đủ hơn `AuthUserDto` (contract không mô tả
 * schema cho endpoint này) — khai báo phần dùng tới, các field khác bỏ qua.
 */
export interface UserProfile extends AuthUser {
  phone?: string | null;
  avatarUrl?: string | null;
  status?: string;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** `LoginDto` */
export interface LoginPayload {
  username: string;
  password: string;
}

/** `AuthResponseDto` */
export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  /** Số giây còn hiệu lực của access token */
  expiresIn: number;
  user: AuthUser;
}

/** `PermissionsResponseDto` */
export interface PermissionsResponse {
  role: AuthRole;
  permissions: AppPermission[];
}

/** `ChangePasswordDto` */
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/** Role được phép vào trang quản trị — `customer` chỉ dùng cho storefront */
export const ADMIN_PORTAL_ROLES: readonly AuthRole[] = ["admin", "staff"];

export function canAccessAdminPortal(role: AuthRole | undefined | null) {
  return !!role && ADMIN_PORTAL_ROLES.includes(role);
}
