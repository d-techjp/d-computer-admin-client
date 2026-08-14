/**
 * Nhật ký hoạt động — nhóm `Admin - Activity Logs` trong `openapi/openapi.yaml`.
 *
 * `action` và `resource` trong contract là **chuỗi tự do** (`type: string`,
 * chỉ có `example`), không phải enum: backend thêm module mới là log có giá trị
 * mới ngay mà không cần deploy lại admin. Vì vậy FE giữ chúng ở kiểu `string`
 * và chỉ dùng bảng nhãn để hiển thị đẹp những giá trị đã biết —
 * `activityActionLabel` / `activityResourceLabel` rơi về chính chuỗi gốc khi
 * gặp giá trị lạ, thay vì hiện ô trống.
 */

export type ActivityStatus = "success" | "failed";

export const ACTIVITY_STATUS_LABEL: Record<ActivityStatus, string> = {
  success: "Thành công",
  failed: "Thất bại",
};

/** Các `action` backend đang ghi — dùng cho nhãn, màu và gợi ý trong ô lọc */
export const ACTIVITY_ACTION_LABEL: Record<string, string> = {
  login: "Đăng nhập",
  login_failed: "Đăng nhập thất bại",
  logout: "Đăng xuất",
  logout_all: "Đăng xuất mọi thiết bị",
  change_password: "Đổi mật khẩu",
  create: "Tạo mới",
  update: "Cập nhật",
  delete: "Xoá",
  publish: "Xuất bản",
  unpublish: "Gỡ xuất bản",
  adjust_stock: "Điều chỉnh tồn kho",
  import: "Nhập kho",
  export: "Xuất kho",
  reorder: "Sắp xếp lại",
  assign_role: "Gán vai trò",
  assign_permissions: "Gán quyền",
  status_change: "Đổi trạng thái",
};

/** Các `resource` backend đang ghi — tương ứng từng nhóm endpoint admin */
export const ACTIVITY_RESOURCE_LABEL: Record<string, string> = {
  auth: "Xác thực",
  user: "Người dùng",
  user_role: "Vai trò người dùng",
  role: "Vai trò",
  role_permissions: "Quyền của vai trò",
  permission: "Phân quyền",
  product: "Sản phẩm",
  product_variant: "Biến thể",
  product_variant_stock: "Tồn kho biến thể",
  product_bundle_item: "Thành phần combo",
  product_description: "Mô tả sản phẩm",
  product_option: "Tuỳ chọn sản phẩm",
  category: "Danh mục",
  brand: "Thương hiệu",
  article: "Bài viết",
  order: "Đơn hàng",
  order_payment: "Thanh toán đơn hàng",
  carousel: "Carousel",
  inventory_import: "Nhập kho",
  inventory_export: "Xuất kho",
  upload: "Tệp tải lên",
};

/** Một trường đã đổi, bóc từ `metadata.changes` nếu backend có ghi */
export interface ActivityChange {
  field: string;
  before: string;
  after: string;
}

export interface ActivityLog {
  id: string;
  /** Người thực hiện; vắng mặt với thao tác do hệ thống tự chạy */
  userId?: string;
  userName: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  resource: string;
  /** Id bản ghi bị tác động — dùng để lọc "mọi thao tác trên sản phẩm X" */
  resourceId?: string;
  status: ActivityStatus;
  description?: string;
  /** Lý do thất bại, chỉ có khi `status = failed` */
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  changes: ActivityChange[];
  /** Phần dữ liệu kèm theo còn lại — hiển thị nguyên dạng JSON ở drawer chi tiết */
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export function activityActionLabel(action: string) {
  return ACTIVITY_ACTION_LABEL[action] ?? action;
}

export function activityResourceLabel(resource: string) {
  return ACTIVITY_RESOURCE_LABEL[resource] ?? resource;
}
