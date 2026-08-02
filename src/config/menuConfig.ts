import {
  Boxes,
  FolderTree,
  LayoutDashboard,
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
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import routes from "./routes";

export interface MenuItemConfig {
  key: string;
  label: string;
  icon?: LucideIcon;
  path?: string;
  /** Để sẵn cho RBAC — chưa lọc ở v1, khớp với mục "Quản trị viên" */
  roles?: string[];
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
        label: "Phiếu nhập kho",
        icon: PackagePlus,
        path: routes.warehouse.stockIn,
      },
      {
        key: "warehouse-stock-out",
        label: "Phiếu xuất kho",
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
