import {
  Boxes,
  FolderTree,
  GalleryHorizontalEnd,
  LayoutDashboard,
  Megaphone,
  Newspaper,
  Package,
  PackageMinus,
  KeyRound,
  PackagePlus,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  Tags,
  UserRound,
  Users,
  Video,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import type { AppPermission } from "@/types/auth";

import { requiredPermissionFor } from "./permissions";
import routes from "./routes";

export interface MenuItemConfig {
  key: string;
  label: string;
  icon?: LucideIcon;
  path?: string;
  /**
   * Permission cần có để thấy mục này (khớp `GET /api/v1/auth/permissions`).
   * Mục cha không cần khai báo: chỉ cần còn ít nhất một mục con hiện là hiện.
   */
  permission?: AppPermission;
  children?: MenuItemConfig[];
}

/**
 * Dữ liệu menu chính + menu con. Bản gốc gom nhiều mảng menu theo từng app rồi
 * merge lại; ở đây chỉ cần một mảng duy nhất cho admin e-commerce.
 */
export const menuConfig: MenuItemConfig[] = [
  {
    key: "dashboard",
    label: "Tổng quan",
    icon: LayoutDashboard,
    path: routes.dashboard,
  },
  {
    key: "users",
    label: "Quản lý người dùng",
    icon: Users,
    children: [
      {
        key: "users-customers",
        label: "Khách hàng",
        icon: UserRound,
        path: routes.users.customers.index,
      },
      {
        key: "users-admins",
        label: "Quản trị viên",
        icon: ShieldCheck,
        path: routes.users.admins.index,
      },
      {
        key: "users-roles",
        label: "Quản lý quyền",
        icon: KeyRound,
        path: routes.users.roles.index,
      },
    ],
  },
  {
    key: "products",
    label: "Quản lý sản phẩm",
    icon: Package,
    children: [
      {
        key: "products-list",
        label: "Danh sách sản phẩm",
        icon: Boxes,
        path: routes.products.index,
      },
      {
        key: "products-categories",
        label: "Danh mục",
        icon: FolderTree,
        path: routes.products.categories,
      },
      {
        key: "products-brands",
        label: "Thương hiệu",
        icon: Tags,
        path: routes.products.brands,
      },
    ],
  },
  {
    key: "campaigns",
    label: "Chiến dịch",
    icon: Megaphone,
    children: [
      {
        key: "campaigns-carousels",
        label: "Carousel sản phẩm",
        icon: GalleryHorizontalEnd,
        path: routes.campaigns.carousels,
      },
      {
        key: "campaigns-tiktok",
        label: "Tiktok",
        icon: Video,
        path: routes.campaigns.tiktok,
      },
    ],
  },
  {
    key: "orders",
    label: "Quản lý đơn hàng",
    icon: ShoppingCart,
    path: routes.orders.index,
  },
  {
    key: "warehouse",
    label: "Quản lý kho",
    icon: Warehouse,
    children: [
      {
        key: "warehouse-stock",
        label: "Tồn kho",
        icon: Boxes,
        path: routes.warehouse.index,
      },
      {
        key: "warehouse-stock-in",
        label: "Nhập kho",
        icon: PackagePlus,
        path: routes.warehouse.stockIn,
      },
      {
        key: "warehouse-stock-out",
        label: "Xuất kho",
        icon: PackageMinus,
        path: routes.warehouse.stockOut,
      },
    ],
  },
  {
    key: "posts",
    label: "Bài viết",
    icon: Newspaper,
    path: routes.posts.index,
  },
  {
    key: "activity-logs",
    label: "Nhật ký hoạt động",
    icon: ScrollText,
    path: routes.activityLogs,
  },
];

/**
 * Permission của một mục menu: ưu tiên khai báo trực tiếp, nếu không thì suy ra
 * từ bảng ROUTE_PERMISSIONS theo path — nhờ vậy menu và guard trang luôn khớp.
 */
export function permissionOf(item: MenuItemConfig): AppPermission | undefined {
  if (item.permission) return item.permission;
  return item.path ? requiredPermissionFor(item.path) : undefined;
}

/**
 * Lọc menu theo permission đã lưu sau khi đăng nhập. Mục cha bị ẩn khi không
 * còn mục con nào được phép xem.
 */
export function filterMenuByPermissions(
  items: MenuItemConfig[],
  permissions: AppPermission[],
): MenuItemConfig[] {
  return items.reduce<MenuItemConfig[]>((visible, item) => {
    if (item.children?.length) {
      const children = filterMenuByPermissions(item.children, permissions);
      if (children.length) visible.push({ ...item, children });
      return visible;
    }

    const required = permissionOf(item);
    if (!required || permissions.includes(required)) visible.push(item);
    return visible;
  }, []);
}

/**
 * Trang đích sau khi đăng nhập: mục menu đầu tiên mà tài khoản được phép vào.
 * Tài khoản không có `dashboard.view` vẫn vào được trang hợp lệ đầu tiên.
 */
export function firstAccessiblePath(permissions: AppPermission[]): string | undefined {
  const visible = filterMenuByPermissions(menuConfig, permissions);

  for (const item of visible) {
    if (item.path) return item.path;
    const child = item.children?.find((entry) => entry.path);
    if (child?.path) return child.path;
  }
  return undefined;
}

/** Làm phẳng menu để tra cứu nhanh theo path (dùng cho breadcrumb + active key) */
export interface FlatMenuEntry {
  key: string;
  label: string;
  path: string;
  parentKey?: string;
  parentLabel?: string;
}

export const flatMenu: FlatMenuEntry[] = menuConfig.flatMap((item) => {
  if (item.path) {
    return [{ key: item.key, label: item.label, path: item.path }];
  }
  return (item.children ?? [])
    .filter((child): child is MenuItemConfig & { path: string } => !!child.path)
    .map((child) => ({
      key: child.key,
      label: child.label,
      path: child.path,
      parentKey: item.key,
      parentLabel: item.label,
    }));
});

/**
 * Tìm mục menu khớp pathname hiện tại. Ưu tiên khớp dài nhất để route con
 * (vd /products/new, /orders/abc) vẫn sáng đúng mục cha.
 */
export function findActiveMenu(pathname: string): FlatMenuEntry | undefined {
  return flatMenu
    .filter(
      (entry) =>
        pathname === entry.path || pathname.startsWith(`${entry.path}/`),
    )
    .sort((a, b) => b.path.length - a.path.length)[0];
}
