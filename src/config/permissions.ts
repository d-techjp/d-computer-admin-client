/**
 * Bảng ánh xạ route ⇄ permission (`GET /api/v1/auth/permissions`).
 * Đây là nguồn duy nhất cho cả việc lọc menu và chặn truy cập trang, để menu
 * và guard không bao giờ lệch nhau.
 */
import type { AppPermission } from "@/types/auth";

import routes from "./routes";

interface RoutePermissionRule {
  /** Khớp chính xác hoặc theo tiền tố (`/products` che cả `/products/new`) */
  path: string;
  permission: AppPermission;
}

/**
 * Kho chưa có permission riêng trong contract — các trang tồn kho/nhập/xuất
 * thao tác trên `PATCH /products/{id}/stock` nên dùng chung `product.manage`.
 */
export const ROUTE_PERMISSIONS: RoutePermissionRule[] = [
  { path: routes.dashboard, permission: "dashboard.view" },

  { path: routes.users.customers.index, permission: "user.customer.manage" },
  { path: routes.users.admins.index, permission: "user.admin.manage" },
  { path: routes.users.roles.index, permission: "user.role.manage" },

  { path: routes.products.categories, permission: "product.category.manage" },
  { path: routes.products.brands, permission: "product.brand.manage" },
  { path: routes.products.index, permission: "product.manage" },

  // Rule dài hơn thắng (xem SORTED_RULES), nên tiktok tách quyền riêng khỏi
  // `/campaigns` — carousel và tiktok là hai module độc lập ở backend.
  { path: routes.campaigns.tiktok, permission: "campaign.tiktok.manage" },
  { path: routes.campaigns.index, permission: "product.carousel.manage" },

  { path: routes.orders.index, permission: "orders.manage" },
  { path: routes.warehouse.index, permission: "inventory.manage" },
  { path: routes.posts.index, permission: "articles.manage" },
  { path: routes.activityLogs, permission: "logs.view" },
];

/** Ưu tiên rule có path dài nhất để route con không bị rule cha ăn trước */
const SORTED_RULES = [...ROUTE_PERMISSIONS].sort(
  (a, b) => b.path.length - a.path.length,
);

/** Permission bắt buộc để vào `pathname`; `undefined` = không cần quyền riêng */
export function requiredPermissionFor(pathname: string): AppPermission | undefined {
  return SORTED_RULES.find(
    (rule) => pathname === rule.path || pathname.startsWith(`${rule.path}/`),
  )?.permission;
}

export function canAccessPath(pathname: string, permissions: AppPermission[]) {
  const required = requiredPermissionFor(pathname);
  return !required || permissions.includes(required);
}
