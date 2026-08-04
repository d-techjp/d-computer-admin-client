import type {
  AdminRole,
  AdminUser,
  AdminUserStatus,
  Permission,
} from "@/types/admin-user";

import { faker, seedFaker } from "./utils";

/** Nhóm quyền viết tay — đây là dữ liệu cấu hình, không nên random */
export const adminRoles: AdminRole[] = [
  {
    id: "role-super-admin",
    code: "admin",
    name: "Quản trị hệ thống",
    description: "Toàn quyền trên mọi phân hệ, kể cả quản lý tài khoản quản trị",
    permissions: [
      "dashboard:view",
      "product:view",
      "product:edit",
      "order:view",
      "order:edit",
      "customer:view",
      "customer:edit",
      "warehouse:view",
      "warehouse:edit",
      "post:view",
      "post:edit",
      "admin:manage",
    ],
    memberCount: 0,
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "role-product-manager",
    code: "product-manager",
    name: "Quản lý sản phẩm",
    description: "Quản lý danh mục, thương hiệu và thông tin sản phẩm",
    permissions: ["dashboard:view", "product:view", "product:edit", "warehouse:view"],
    memberCount: 0,
    createdAt: "2025-01-08T00:00:00.000Z",
  },
  {
    id: "role-sales",
    code: "sales",
    name: "Nhân viên bán hàng",
    description: "Xử lý đơn hàng và chăm sóc khách hàng",
    permissions: ["dashboard:view", "order:view", "order:edit", "customer:view", "product:view"],
    memberCount: 0,
    createdAt: "2025-01-15T00:00:00.000Z",
  },
  {
    id: "role-warehouse",
    code: "warehouse",
    name: "Nhân viên kho",
    description: "Nhập xuất kho và kiểm kê tồn kho",
    permissions: ["warehouse:view", "warehouse:edit", "product:view"],
    memberCount: 0,
    createdAt: "2025-02-01T00:00:00.000Z",
  },
  {
    id: "role-content",
    code: "content",
    name: "Biên tập nội dung",
    description: "Soạn thảo và xuất bản bài viết",
    permissions: ["post:view", "post:edit", "product:view"],
    memberCount: 0,
    createdAt: "2025-02-20T00:00:00.000Z",
  },
  {
    id: "role-viewer",
    code: "viewer",
    name: "Chỉ xem",
    description: "Chỉ xem báo cáo, không có quyền chỉnh sửa",
    permissions: ["dashboard:view", "product:view", "order:view", "customer:view"],
    memberCount: 0,
    createdAt: "2025-03-05T00:00:00.000Z",
  },
];

const STATUS_WEIGHTS: AdminUserStatus[] = [
  ...Array<AdminUserStatus>(9).fill("active"),
  "inactive",
];

function generateAdminUsers(count: number): AdminUser[] {
  seedFaker(20260804);

  return Array.from({ length: count }, (_, index) => {
    const role = faker.helpers.arrayElement(adminRoles);

    return {
      id: `adm-${String(index + 1).padStart(3, "0")}`,
      username: `staff${index + 1}`,
      name: faker.person.fullName(),
      email: `staff${index + 1}@d-computer.vn`,
      roleCode: role.code,
      roleName: role.name,
      status: faker.helpers.arrayElement(STATUS_WEIGHTS),
      lastLoginAt: faker.date
        .recent({ days: 30, refDate: "2026-08-01" })
        .toISOString(),
      createdAt: faker.date
        .between({ from: "2025-01-01", to: "2026-06-30" })
        .toISOString(),
    } satisfies AdminUser;
  });
}

export const adminUsers = generateAdminUsers(24);

adminRoles.forEach((role) => {
  role.memberCount = adminUsers.filter(
    (user) => user.roleCode === role.code,
  ).length;
});

/** Danh sách nhóm quyền cho các ô Select (form tạo/sửa quản trị viên, bộ lọc) */
export const adminRoleOptions = adminRoles.map((role) => ({
  label: role.name,
  value: role.code,
}));

export const ALL_PERMISSIONS: Permission[] = [
  "dashboard:view",
  "product:view",
  "product:edit",
  "order:view",
  "order:edit",
  "customer:view",
  "customer:edit",
  "warehouse:view",
  "warehouse:edit",
  "post:view",
  "post:edit",
  "admin:manage",
];
