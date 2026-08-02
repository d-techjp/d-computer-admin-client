export type CustomerStatus = "active" | "inactive" | "blocked";
export type CustomerTier = "normal" | "silver" | "gold" | "diamond";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  tier: CustomerTier;
  totalOrders: number;
  totalSpent: number;
  status: CustomerStatus;
  createdAt: string;
}

export const CUSTOMER_STATUS_LABEL: Record<CustomerStatus, string> = {
  active: "Đang hoạt động",
  inactive: "Ngừng hoạt động",
  blocked: "Bị khoá",
};

export const CUSTOMER_TIER_LABEL: Record<CustomerTier, string> = {
  normal: "Thường",
  silver: "Bạc",
  gold: "Vàng",
  diamond: "Kim cương",
};
