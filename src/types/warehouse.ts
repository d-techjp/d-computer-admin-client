/**
 * Dữ liệu tồn kho **mock** của dashboard (biểu đồ + thẻ thống kê). Tồn kho thật
 * nằm ở `types/inventory.ts` (`GET /inventory/stock`), tính theo biến thể chứ
 * không theo sản phẩm — nhập/xuất kho dùng nhóm type đó.
 *
 * `StockLevel` là thang chung cho cả hai: `StockLevelTag` hiển thị thống nhất.
 */
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
