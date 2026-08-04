import {
  ACTIVITY_MODULE_LABEL,
  type ActivityAction,
  type ActivityChange,
  type ActivityLog,
  type ActivityModule,
} from "@/types/activity-log";

import { adminUsers } from "./admin-users";
import { orders } from "./orders";
import { posts } from "./posts";
import { products } from "./products";
import { faker, seedFaker } from "./utils";

/** Cặp thao tác - phân hệ hợp lệ, để nhật ký không sinh ra tổ hợp vô nghĩa */
const ACTION_BY_MODULE: Record<ActivityModule, ActivityAction[]> = {
  auth: ["login", "logout"],
  product: ["create", "update", "delete", "export"],
  order: ["update", "export"],
  customer: ["update", "delete", "export"],
  warehouse: ["create", "update", "export"],
  post: ["create", "update", "delete"],
  admin: ["create", "update", "permission_change"],
};

const MODULE_WEIGHTS: ActivityModule[] = [
  ...Array<ActivityModule>(4).fill("product"),
  ...Array<ActivityModule>(4).fill("order"),
  ...Array<ActivityModule>(3).fill("auth"),
  ...Array<ActivityModule>(2).fill("warehouse"),
  ...Array<ActivityModule>(2).fill("post"),
  "customer",
  "admin",
];

const USER_AGENTS = [
  "Chrome 141 trên macOS 15",
  "Chrome 141 trên Windows 11",
  "Safari 18 trên macOS 15",
  "Edge 141 trên Windows 11",
  "Firefox 135 trên Ubuntu 24.04",
];

/** Sinh danh sách trường thay đổi tương ứng từng phân hệ */
function buildChanges(module: ActivityModule): ActivityChange[] {
  switch (module) {
    case "product":
      return [
        {
          field: "Giá bán",
          before: `¥${faker.number.int({ min: 20, max: 180 }) * 1000}`,
          after: `¥${faker.number.int({ min: 20, max: 180 }) * 1000}`,
        },
        {
          field: "Số lượng tồn",
          before: String(faker.number.int({ min: 0, max: 80 })),
          after: String(faker.number.int({ min: 0, max: 80 })),
        },
      ];
    case "order":
      return [
        {
          field: "Trạng thái",
          before: "Chờ xác nhận",
          after: faker.helpers.arrayElement(["Đã xác nhận", "Đang giao", "Đã huỷ"]),
        },
      ];
    case "warehouse":
      return [
        {
          field: "Số lượng",
          before: String(faker.number.int({ min: 0, max: 50 })),
          after: String(faker.number.int({ min: 0, max: 120 })),
        },
      ];
    case "post":
      return [
        {
          field: "Trạng thái",
          before: "Bản nháp",
          after: "Đã đăng",
        },
      ];
    case "admin":
      return [
        {
          field: "Quyền",
          before: "Xem đơn hàng",
          after: "Xem đơn hàng, Xử lý đơn hàng",
        },
      ];
    default:
      return [];
  }
}

/** Chọn đối tượng bị tác động theo phân hệ để mô tả đọc ra có nghĩa */
function pickTarget(module: ActivityModule) {
  switch (module) {
    case "product": {
      const product = faker.helpers.arrayElement(products);
      return { id: product.id, label: product.name };
    }
    case "order": {
      const order = faker.helpers.arrayElement(orders);
      return { id: order.id, label: `Đơn ${order.code}` };
    }
    case "post": {
      const post = faker.helpers.arrayElement(posts);
      return { id: post.id, label: post.title };
    }
    case "admin": {
      const user = faker.helpers.arrayElement(adminUsers);
      return { id: user.id, label: user.name };
    }
    default:
      return undefined;
  }
}

function describe(
  action: ActivityAction,
  module: ActivityModule,
  targetLabel?: string,
): string {
  const moduleName = ACTIVITY_MODULE_LABEL[module].toLowerCase();

  switch (action) {
    case "login":
      return "Đăng nhập vào hệ thống quản trị";
    case "logout":
      return "Đăng xuất khỏi hệ thống";
    case "export":
      return `Xuất danh sách ${moduleName} ra tệp CSV`;
    case "create":
      return `Tạo mới ${moduleName}${targetLabel ? `: ${targetLabel}` : ""}`;
    case "update":
      return `Cập nhật ${moduleName}${targetLabel ? `: ${targetLabel}` : ""}`;
    case "delete":
      return `Xoá ${moduleName}${targetLabel ? `: ${targetLabel}` : ""}`;
    case "permission_change":
      return `Thay đổi phân quyền${targetLabel ? ` cho ${targetLabel}` : ""}`;
  }
}

function generateActivityLogs(count: number): ActivityLog[] {
  seedFaker(20260809);

  return Array.from({ length: count }, (_, index) => {
    const actor = faker.helpers.arrayElement(adminUsers);
    // Không đặt tên biến là `module` — trùng với biến toàn cục của bundler
    const logModule = faker.helpers.arrayElement(MODULE_WEIGHTS);
    const action = faker.helpers.arrayElement(ACTION_BY_MODULE[logModule]);
    const target = pickTarget(logModule);

    // Đăng nhập thất bại là trường hợp đáng chú ý nhất nên cho xuất hiện nhiều hơn
    const failed =
      action === "login"
        ? faker.number.int({ min: 1, max: 10 }) <= 2
        : faker.number.int({ min: 1, max: 20 }) === 1;

    return {
      id: `log-${String(index + 1).padStart(4, "0")}`,
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email ?? actor.username,
      actorRole: actor.roleName,
      action,
      module: logModule,
      description: describe(action, logModule, target?.label),
      targetLabel: target?.label,
      targetId: target?.id,
      changes:
        action === "update" || action === "permission_change"
          ? buildChanges(logModule)
          : [],
      result: failed ? "failed" : "success",
      ipAddress: faker.internet.ipv4(),
      userAgent: faker.helpers.arrayElement(USER_AGENTS),
      createdAt: faker.date
        .between({ from: "2026-05-01", to: "2026-08-01" })
        .toISOString(),
    } satisfies ActivityLog;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const activityLogs = generateActivityLogs(160);

/** Danh sách quản trị viên có trong nhật ký — dùng cho ô lọc theo người thực hiện */
export const activityActorOptions = adminUsers.map((user) => ({
  label: `${user.name} (${user.email})`,
  value: user.id,
}));
