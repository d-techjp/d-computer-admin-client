import type { OrderStatus } from "./order";

/** Một chỉ số kèm so sánh với kỳ liền trước cùng độ dài */
export interface DashboardMetric {
  value: number;
  previousValue: number;
  /** % thay đổi so với kỳ trước */
  trend: number;
}

export interface DashboardSummary {
  revenue: DashboardMetric;
  orderCount: DashboardMetric;
  newCustomerCount: DashboardMetric;
  averageOrderValue: number;
  /** Số biến thể sắp hết hàng ở thời điểm hiện tại — không theo khoảng thời gian */
  lowStockCount: number;
}

export interface DashboardRevenuePoint {
  /** `YYYY-MM-DD` theo múi giờ cửa hàng do backend quyết định */
  date: string;
  revenue: number;
  orderCount: number;
}

export interface DashboardStatusSlice {
  status: OrderStatus;
  count: number;
}

export interface DashboardTopProduct {
  /** null khi sản phẩm gốc đã bị xoá — tên vẫn còn do order_items lưu snapshot */
  productId: string | null;
  productName: string;
  revenue: number;
  quantity: number;
}

export interface DashboardOverview {
  from: string;
  to: string;
  timeZone: string;
  summary: DashboardSummary;
  /** Liên tục theo ngày: ngày không có đơn vẫn có mặt với giá trị 0 */
  revenueByDay: DashboardRevenuePoint[];
  /** Đếm TẤT CẢ đơn trong khoảng theo trạng thái, kể cả đã huỷ */
  statusBreakdown: DashboardStatusSlice[];
  topProducts: DashboardTopProduct[];
}
