/**
 * Kho hàng — `GET /inventory/stock` và nhóm `/inventory/transactions`.
 *
 * Contract không khai response schema (`responses: { 200: {} }`) như phần lớn
 * endpoint khác của backend này, nên mapper đọc phòng thủ qua `parse.ts` và
 * chấp nhận cả dạng phẳng (`productName`) lẫn dạng lồng (`variant.product.name`)
 * — thiếu một field chỉ làm mất giá trị đó chứ không vỡ cả trang.
 *
 * Lưu ý về nghiệp vụ: hai endpoint `import`/`export` chỉ dành cho thao tác
 * **thủ công** (nhập lô mới, hàng lỗi, kiểm kê...). Bán hàng không đi qua đây —
 * đơn hàng tự trừ kho và tự ghi sổ với `referenceType = order`.
 */
import type {
  InventoryReasonCode,
  InventoryReferenceType,
  InventoryStockItem,
  InventoryTransaction,
  InventoryTransactionType,
} from "@/types/inventory";
import { INVENTORY_REASON_CODES } from "@/types/inventory";

import { apiFetch, type QueryValue } from "./client";
import {
  parseListResponse,
  toIsoEnd,
  toIsoStart,
  toListQuery,
  type ApiListParams,
} from "./pagination";
import {
  asBoolean,
  asEnum,
  asIsoDate,
  asNumber,
  asOptionalNumber,
  asOptionalString,
  asRecord,
  asString,
} from "./parse";

const TRANSACTION_TYPES = ["in", "out"] as const;
const REFERENCE_TYPES = ["order", "manual"] as const;

/** Gom tên sản phẩm/biến thể dù backend trả phẳng hay lồng trong `variant.product` */
function toProductRefs(record: Record<string, unknown>) {
  const variant = asRecord(record.variant);
  const product = asRecord(record.product ?? variant.product);

  return {
    variantId: asString(record.variantId ?? variant.id ?? record.id),
    sku: asString(record.sku ?? variant.sku),
    variantName: asString(record.variantName ?? variant.name),
    productId: asOptionalString(record.productId ?? product.id),
    productName: asString(record.productName ?? product.name),
    thumbnail: asOptionalString(record.thumbnail ?? variant.thumbnail ?? product.thumbnail),
  };
}

export function toInventoryStockItem(value: unknown): InventoryStockItem {
  const record = asRecord(value);
  const variant = asRecord(record.variant);
  const refs = toProductRefs(record);

  return {
    ...refs,
    stock: asNumber(record.stock ?? record.currentStock ?? variant.stock),
    lowStockThreshold: asNumber(record.lowStockThreshold ?? variant.lowStockThreshold),
    totalIn: asNumber(record.totalIn ?? record.totalImported),
    totalSold: asNumber(record.totalSold ?? record.totalOut ?? record.soldCount),
    trackInventory: asBoolean(record.trackInventory ?? variant.trackInventory, true),
    updatedAt: asOptionalString(record.updatedAt ?? record.updated_at),
  };
}

export function toInventoryTransaction(value: unknown): InventoryTransaction {
  const record = asRecord(value);
  const refs = toProductRefs(record);
  const performedBy = asRecord(record.performedBy ?? record.user);
  const order = asRecord(record.order ?? record.reference);

  return {
    id: asString(record.id),
    variantId: refs.variantId,
    sku: refs.sku,
    variantName: refs.variantName,
    productId: refs.productId,
    productName: refs.productName,
    type: asEnum(record.type, TRANSACTION_TYPES, "in"),
    // Backend ghi số âm cho chiều xuất ở một số nguồn dữ liệu — chiều đã nằm ở
    // `type` nên chuẩn hoá về số dương để mọi chỗ hiển thị giống nhau.
    quantity: Math.abs(asNumber(record.quantity)),
    stockBefore: asOptionalNumber(record.stockBefore),
    stockAfter: asOptionalNumber(record.stockAfter),
    reasonCode: asEnum<InventoryReasonCode>(
      record.reasonCode,
      INVENTORY_REASON_CODES,
      "other",
    ),
    referenceType: asEnum(record.referenceType, REFERENCE_TYPES, "manual"),
    referenceId: asOptionalString(record.referenceId),
    referenceCode: asOptionalString(record.referenceCode ?? order.code),
    note: asOptionalString(record.note),
    performedById: asOptionalString(record.performedById ?? performedBy.id),
    performedByName: asOptionalString(
      record.performedByName ?? performedBy.fullName ?? performedBy.username,
    ),
    createdAt: asIsoDate(record.createdAt ?? record.created_at),
  };
}

export interface ListInventoryStockParams extends ApiListParams {
  minStock?: number;
  maxStock?: number;
}

export function listInventoryStock(params: ListInventoryStockParams) {
  const query: Record<string, QueryValue> = {
    ...toListQuery(params),
    minStock: params.minStock,
    maxStock: params.maxStock,
  };

  return apiFetch<unknown>("/inventory/stock", { query }).then((payload) =>
    parseListResponse(payload, toInventoryStockItem, {
      page: params.page,
      pageSize: params.limit,
    }),
  );
}

export interface ListInventoryTransactionsParams extends ApiListParams {
  variantId?: string;
  type?: InventoryTransactionType;
  reasonCode?: InventoryReasonCode;
  referenceType?: InventoryReferenceType;
  referenceId?: string;
  performedById?: string;
  /** Ngày trần `YYYY-MM-DD`; hàm này tự nới ra đầu/cuối ngày trước khi gửi */
  from?: string;
  to?: string;
}

export function listInventoryTransactions(params: ListInventoryTransactionsParams) {
  const query: Record<string, QueryValue> = {
    ...toListQuery(params),
    variantId: params.variantId,
    type: params.type,
    reasonCode: params.reasonCode,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    performedById: params.performedById,
    from: toIsoStart(params.from),
    to: toIsoEnd(params.to),
  };

  return apiFetch<unknown>("/inventory/transactions", { query }).then((payload) =>
    parseListResponse(payload, toInventoryTransaction, {
      page: params.page,
      pageSize: params.limit,
    }),
  );
}

export interface InventoryMovementPayload {
  variantId: string;
  quantity: number;
  reasonCode: InventoryReasonCode;
  note?: string;
}

/** `POST /inventory/transactions/import` — nhập kho thủ công */
export function createInventoryImport(payload: InventoryMovementPayload) {
  return apiFetch<unknown>("/inventory/transactions/import", {
    method: "POST",
    body: payload,
  }).then(toInventoryTransaction);
}

/** `POST /inventory/transactions/export` — xuất kho thủ công, không dùng cho bán hàng */
export function createInventoryExport(payload: InventoryMovementPayload) {
  return apiFetch<unknown>("/inventory/transactions/export", {
    method: "POST",
    body: payload,
  }).then(toInventoryTransaction);
}
