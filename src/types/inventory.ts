/**
 * Kho hàng — bám theo nhóm `Admin - Inventory Stock` / `Admin - Inventory
 * Transactions` trong `openapi/openapi.yaml`.
 *
 * Khác với `types/warehouse.ts` (dữ liệu mock của dashboard, còn dùng cho biểu
 * đồ), đây là dữ liệu thật từ backend: tồn kho tính **theo biến thể** chứ
 * không theo sản phẩm, và mọi thay đổi tồn kho đều để lại một dòng giao dịch.
 */
import type { StockLevel } from "./warehouse";

export type InventoryTransactionType = "in" | "out";

export type InventoryReasonCode =
  | "purchase"
  | "return_from_customer"
  | "order_sale"
  | "order_cancelled"
  | "damaged"
  | "lost"
  | "stocktake_adjustment"
  | "other";

/** `order` = do đơn hàng tự sinh, `manual` = admin tự tạo ở màn kho */
export type InventoryReferenceType = "order" | "manual";

export const INVENTORY_REASON_LABEL: Record<InventoryReasonCode, string> = {
  purchase: "Nhập mua hàng",
  return_from_customer: "Khách trả hàng",
  order_sale: "Bán theo đơn",
  order_cancelled: "Hoàn kho do huỷ đơn",
  damaged: "Hàng lỗi/hỏng",
  lost: "Thất thoát",
  stocktake_adjustment: "Điều chỉnh kiểm kê",
  other: "Khác",
};

export const INVENTORY_REFERENCE_TYPE_LABEL: Record<InventoryReferenceType, string> = {
  order: "Từ đơn hàng",
  manual: "Thủ công",
};

export const INVENTORY_TRANSACTION_TYPE_LABEL: Record<InventoryTransactionType, string> = {
  in: "Nhập kho",
  out: "Xuất kho",
};

export const INVENTORY_REASON_CODES = Object.keys(
  INVENTORY_REASON_LABEL,
) as InventoryReasonCode[];

/**
 * Lý do cho phép khi **tự tạo** giao dịch: `CreateInventoryImportDto` /
 * `CreateInventoryExportDto` chỉ nhận đúng các mã này. `order_sale` và
 * `order_cancelled` do luồng đơn hàng sinh ra, không nhập tay được.
 */
export const INVENTORY_IMPORT_REASONS: readonly InventoryReasonCode[] = [
  "purchase",
  "return_from_customer",
  "stocktake_adjustment",
  "other",
];

export const INVENTORY_EXPORT_REASONS: readonly InventoryReasonCode[] = [
  "damaged",
  "lost",
  "stocktake_adjustment",
  "other",
];

/**
 * Lý do dùng để **lọc** sổ kho — rộng hơn danh sách tạo tay ở trên vì sổ còn
 * chứa giao dịch do đơn hàng sinh ra (`order_sale`, `order_cancelled`).
 */
export const INVENTORY_FILTER_REASONS: Record<
  InventoryTransactionType,
  readonly InventoryReasonCode[]
> = {
  in: ["purchase", "return_from_customer", "order_cancelled", "stocktake_adjustment", "other"],
  out: ["order_sale", "damaged", "lost", "stocktake_adjustment", "other"],
};

/** Một dòng của `GET /inventory/stock` — tồn kho hiện tại của một biến thể */
export interface InventoryStockItem {
  variantId: string;
  sku: string;
  /** Nhãn tổ hợp option ("16GB / 512GB"); sản phẩm không có biến thể thì trùng tên sản phẩm */
  variantName: string;
  productId?: string;
  productName: string;
  thumbnail?: string;
  stock: number;
  /** Ngưỡng cảnh báo sắp hết; `0` = không cảnh báo */
  lowStockThreshold: number;
  /** Tổng đã nhập từ trước tới nay */
  totalIn: number;
  /** Tổng đã bán từ trước tới nay */
  totalSold: number;
  /** `false` cho dịch vụ / hàng đặt trước — bán được kể cả khi hết tồn */
  trackInventory: boolean;
  updatedAt?: string;
}

/** Một dòng của `GET /inventory/transactions` — sổ nhập-xuất kho */
export interface InventoryTransaction {
  id: string;
  variantId: string;
  sku: string;
  variantName: string;
  productId?: string;
  productName: string;
  type: InventoryTransactionType;
  /** Luôn là số dương; chiều tăng/giảm nằm ở `type` */
  quantity: number;
  stockBefore?: number;
  stockAfter?: number;
  reasonCode: InventoryReasonCode;
  referenceType: InventoryReferenceType;
  referenceId?: string;
  /** Mã đơn hàng khi `referenceType = order`, backend trả kèm thì hiển thị luôn */
  referenceCode?: string;
  note?: string;
  performedById?: string;
  performedByName?: string;
  createdAt: string;
}

/**
 * Mức tồn của một dòng kho. Dùng chung thang `StockLevel` với dashboard để
 * `StockLevelTag` hiển thị thống nhất toàn app.
 *
 * Biến thể không quản kho (`trackInventory = false`) luôn coi là còn hàng —
 * tồn `0` với dịch vụ không phải là cảnh báo.
 */
export function inventoryStockLevelOf(
  item: Pick<InventoryStockItem, "stock" | "lowStockThreshold" | "trackInventory">,
): StockLevel {
  if (!item.trackInventory) return "in_stock";
  if (item.stock <= 0) return "out_of_stock";
  if (item.lowStockThreshold > 0 && item.stock <= item.lowStockThreshold) {
    return "low_stock";
  }
  return "in_stock";
}
