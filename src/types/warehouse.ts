export type StockMovementType = "in" | "out";
export type StockLevel = "in_stock" | "low_stock" | "out_of_stock";

export interface StockItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  categoryName: string;
  location: string;
  quantity: number;
  /** Số đã giữ chỗ cho đơn chưa giao */
  reserved: number;
  available: number;
  /** Ngưỡng cảnh báo sắp hết hàng */
  reorderPoint: number;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  code: string;
  type: StockMovementType;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  /** Nhà cung cấp (nhập) hoặc lý do xuất */
  partner: string;
  note: string;
  createdBy: string;
  createdAt: string;
}

export const STOCK_LEVEL_LABEL: Record<StockLevel, string> = {
  in_stock: "Còn hàng",
  low_stock: "Sắp hết",
  out_of_stock: "Hết hàng",
};

export function stockLevelOf(item: Pick<StockItem, "available" | "reorderPoint">): StockLevel {
  if (item.available <= 0) return "out_of_stock";
  if (item.available <= item.reorderPoint) return "low_stock";
  return "in_stock";
}
