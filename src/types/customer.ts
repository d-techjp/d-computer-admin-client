export type CustomerStatus = "active" | "inactive" | "banned";
export type CustomerTier = "normal" | "silver" | "gold" | "diamond";

export interface Customer {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tier: CustomerTier;
  status: CustomerStatus;
  createdAt: string;
}

/** Số liệu mua hàng — backend tổng hợp khi mở chi tiết, không có trong danh sách */
export interface CustomerOrderStats {
  /** Số đơn đã đặt (không tính đơn online chưa trả tiền) */
  orderCount: number;
  completedCount: number;
  cancelledCount: number;
  /** Tổng tiền các đơn hoàn tất */
  totalSpent: number;
  averageOrderValue: number;
  firstOrderAt?: string;
  lastOrderAt?: string;
}

export const CUSTOMER_STATUS_LABEL: Record<CustomerStatus, string> = {
  active: "Đang hoạt động",
  inactive: "Ngừng hoạt động",
  banned: "Bị khoá",
};

export const CUSTOMER_TIER_LABEL: Record<CustomerTier, string> = {
  normal: "Thường",
  silver: "Bạc",
  gold: "Vàng",
  diamond: "Kim cương",
};
