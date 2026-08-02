/** Loại thao tác được ghi nhận trong nhật ký */
export type ActivityAction =
  | "login"
  | "logout"
  | "create"
  | "update"
  | "delete"
  | "export"
  | "permission_change";

/** Phân hệ nơi thao tác diễn ra */
export type ActivityModule =
  | "auth"
  | "product"
  | "order"
  | "customer"
  | "warehouse"
  | "post"
  | "admin";

export type ActivityResult = "success" | "failed";

export interface ActivityChange {
  field: string;
  before: string;
  after: string;
}

export interface ActivityLog {
  id: string;
  /** Người thực hiện */
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: ActivityAction;
  module: ActivityModule;
  /** Mô tả ngắn hiển thị ở bảng */
  description: string;
  /** Đối tượng bị tác động, vd "Sản phẩm ASUS ROG Strix G16" */
  targetLabel?: string;
  targetId?: string;
  /** Danh sách trường đã thay đổi — chỉ có với thao tác cập nhật */
  changes: ActivityChange[];
  result: ActivityResult;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export const ACTIVITY_ACTION_LABEL: Record<ActivityAction, string> = {
  login: "Đăng nhập",
  logout: "Đăng xuất",
  create: "Tạo mới",
  update: "Cập nhật",
  delete: "Xoá",
  export: "Xuất dữ liệu",
  permission_change: "Đổi phân quyền",
};

export const ACTIVITY_MODULE_LABEL: Record<ActivityModule, string> = {
  auth: "Xác thực",
  product: "Sản phẩm",
  order: "Đơn hàng",
  customer: "Khách hàng",
  warehouse: "Kho",
  post: "Bài viết",
  admin: "Quản trị",
};

export const ACTIVITY_RESULT_LABEL: Record<ActivityResult, string> = {
  success: "Thành công",
  failed: "Thất bại",
};
