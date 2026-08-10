/**
 * Biến thể, biến thể (option) và thành phần combo.
 *
 * Tách khỏi `products.ts` vì đây là resource riêng (`/variants/...`), có
 * permission riêng (`inventory.manage` cho điều chỉnh tồn kho) và vòng đời
 * riêng — master đã tạo xong rồi mới thao tác tới biến thể.
 */
import type {
  BundleInventoryPolicy,
  BundleItem,
  LowStockVariant,
  ProductOption,
  ProductOptionValue,
  ProductVariant,
  VariantAvailability,
  VariantProductRef,
} from "@/types/variant";

import { apiFetch } from "./client";
import { buildFormData, type ImageInput } from "./formData";
import {
  asArray,
  asBoolean,
  asNumber,
  asOptionalEnum,
  asOptionalNumber,
  asOptionalString,
  asRecord,
  asString,
  asStringArray,
} from "./parse";

const BUNDLE_POLICIES = ["derived_from_components", "own_stock"] as const;

/* ---------- Mapper ---------- */

export function toOptionValue(value: unknown): ProductOptionValue {
  const record = asRecord(value);
  return {
    id: asString(record.id),
    value: asString(record.value),
    position: asNumber(record.position),
  };
}

export function toOption(value: unknown): ProductOption {
  const record = asRecord(value);
  return {
    id: asString(record.id),
    name: asString(record.name),
    position: asNumber(record.position),
    values: asArray(record.values ?? record.optionValues).map(toOptionValue),
  };
}

function toProductRef(value: unknown): VariantProductRef | undefined {
  const record = asRecord(value);
  const id = asString(record.id);
  if (!id) return undefined;

  return {
    id,
    name: asString(record.name),
    thumbnail: asOptionalString(record.thumbnail),
    productType: asOptionalString(record.productType),
  };
}

export function toVariant(value: unknown): ProductVariant {
  const record = asRecord(value);

  return {
    id: asString(record.id),
    productId: asString(record.productId ?? asRecord(record.product).id),
    name: asString(record.name),
    sku: asString(record.sku),
    barcode: asOptionalString(record.barcode),
    price: asNumber(record.price),
    compareAtPrice: asOptionalNumber(record.compareAtPrice),
    costPrice: asOptionalNumber(record.costPrice),
    stock: asNumber(record.stock),
    lowStockThreshold: asNumber(record.lowStockThreshold),
    weightGrams: asOptionalNumber(record.weightGrams),
    thumbnail: asOptionalString(record.thumbnail),
    images: asStringArray(record.images),
    position: asNumber(record.position),
    isDefault: asBoolean(record.isDefault),
    isActive: asBoolean(record.isActive, true),
    trackInventory: asBoolean(record.trackInventory, true),
    bundleInventoryPolicy: asOptionalEnum(record.bundleInventoryPolicy, BUNDLE_POLICIES),
    soldCount: asNumber(record.soldCount),
    optionValues: asArray(record.optionValues).map(toOptionValue),
  };
}

export function toLowStockVariant(value: unknown): LowStockVariant {
  const record = asRecord(value);
  return { ...toVariant(value), product: toProductRef(record.product) };
}

export function toBundleItem(value: unknown): BundleItem {
  const record = asRecord(value);
  const component = asRecord(record.componentVariant ?? record.component);

  return {
    id: asString(record.id),
    bundleVariantId: asString(record.bundleVariantId),
    componentVariantId: asString(record.componentVariantId ?? component.id),
    quantity: asNumber(record.quantity, 1),
    position: asNumber(record.position),
    isOptional: asBoolean(record.isOptional),
    componentVariant: component.id
      ? { ...toVariant(component), product: toProductRef(component.product) }
      : undefined,
  };
}

export function toAvailability(value: unknown): VariantAvailability {
  const record = asRecord(value);

  return {
    variantId: asString(record.variantId),
    // `null` mang nghĩa "không giới hạn", khác hẳn 0 — không được rơi về 0
    available: record.available === null ? null : asOptionalNumber(record.available) ?? null,
    limitedBy: asArray(record.limitedBy).map((item) => {
      const limit = asRecord(item);
      return {
        variantId: asString(limit.variantId),
        sku: asString(limit.sku),
        stock: asNumber(limit.stock),
        quantity: asNumber(limit.quantity, 1),
      };
    }),
  };
}

/* ---------- Payload ---------- */

/** `CreateVariantDto` */
export interface VariantPayload {
  name?: string;
  sku?: string;
  barcode?: string;
  price?: number;
  compareAtPrice?: number;
  costPrice?: number;
  stock?: number;
  lowStockThreshold?: number;
  weightGrams?: number;
  position?: number;
  isDefault?: boolean;
  isActive?: boolean;
  trackInventory?: boolean;
  bundleInventoryPolicy?: BundleInventoryPolicy;
  /** Chỉ dùng khi TẠO — `PATCH /variants/:id` không nhận trường này */
  optionValueIds?: string[];
  thumbnail?: string;
  images?: string[];
}

export interface OptionInput {
  name: string;
  position?: number;
  values: { value: string; position?: number }[];
}

export interface BundleItemInput {
  componentVariantId: string;
  quantity?: number;
  position?: number;
  isOptional?: boolean;
}

/* ---------- Biến thể ---------- */

export function listProductVariants(productId: string) {
  return apiFetch<unknown>(`/products/${productId}/variants`).then((payload) =>
    asArray(payload).map(toVariant),
  );
}

export function fetchVariant(id: string) {
  return apiFetch<unknown>(`/variants/${id}`).then(toVariant);
}

/**
 * `POST /products/{id}/variants` — thêm một biến thể lẻ.
 *
 * Sản phẩm đã khai option thì `optionValueIds` bắt buộc và phải phủ **đúng
 * một giá trị cho mỗi option**; thiếu hoặc thừa đều bị backend trả 400.
 */
export function createVariant(productId: string, payload: VariantPayload) {
  return apiFetch<unknown>(`/products/${productId}/variants`, {
    method: "POST",
    body: payload,
  }).then(toVariant);
}

/**
 * `PATCH /variants/{id}` — contract chỉ khai `multipart/form-data` nên luôn
 * gửi FormData, kể cả khi không đổi ảnh.
 *
 * Không đổi được tổ hợp option của biến thể đã tồn tại (xoá rồi tạo lại), và
 * không đặt được `stock` cho combo `derived_from_components`.
 */
export function updateVariant(id: string, payload: VariantPayload, images?: ImageInput[]) {
  return apiFetch<unknown>(`/variants/${id}`, {
    method: "PATCH",
    body: buildFormData({ ...payload }, images),
  }).then(toVariant);
}

export function deleteVariant(id: string) {
  return apiFetch<void>(`/variants/${id}`, { method: "DELETE" });
}

/** Một dòng trong payload sửa hàng loạt — field không gửi thì giữ nguyên */
export interface BulkVariantUpdateItem extends VariantPayload {
  id: string;
}

/**
 * `PATCH /products/{id}/variants` — sửa hàng loạt biến thể cùng sản phẩm
 * trong **một transaction** (giá/kho/`position`/cờ mặc định…), dùng cho bảng
 * biến thể thay vì gọi `PATCH /variants/:id` từng dòng. Không nhận file ảnh —
 * ảnh riêng vẫn qua `updateVariant`. Trả về **toàn bộ** biến thể của sản
 * phẩm sau khi sửa, giống `generateVariants`, nên tin thẳng response được.
 */
export function bulkUpdateVariants(productId: string, items: BulkVariantUpdateItem[]) {
  return apiFetch<unknown>(`/products/${productId}/variants`, {
    method: "PATCH",
    body: { variants: items },
  }).then((payload) => asArray(payload).map(toVariant));
}

/**
 * `POST /products/{id}/variants/generate` — sinh biến thể cho mọi tổ hợp
 * option chưa có. Idempotent: tổ hợp đã tồn tại được bỏ qua, và response trả
 * về **toàn bộ** biến thể của sản phẩm nên gọi xong là vẽ lại được cả bảng.
 */
export function generateVariants(
  productId: string,
  payload: { skuPrefix: string; price: number; stock?: number },
) {
  return apiFetch<unknown>(`/products/${productId}/variants/generate`, {
    method: "POST",
    body: payload,
  }).then((result) => asArray(result).map(toVariant));
}

/**
 * `PATCH /variants/{id}/stock` — điều chỉnh tồn kho theo `delta` (âm để trừ),
 * kèm `reason` để vào nhật ký hoạt động. Cần quyền `inventory.manage`, khác
 * với `product.manage` của các thao tác còn lại.
 */
export function adjustVariantStock(id: string, payload: { delta: number; reason?: string }) {
  return apiFetch<unknown>(`/variants/${id}/stock`, {
    method: "PATCH",
    body: payload,
  }).then(toVariant);
}

/** `GET /variants/low-stock` — contract không có tham số phân trang nào */
export function listLowStockVariants() {
  return apiFetch<unknown>("/variants/low-stock").then((payload) =>
    asArray(payload).map(toLowStockVariant),
  );
}

/* ---------- Option ---------- */

export function fetchProductOptions(productId: string) {
  return apiFetch<unknown>(`/products/${productId}/options`).then((payload) =>
    asArray(payload).map(toOption),
  );
}

/**
 * `PUT /products/{id}/options` — **thay thế toàn bộ**.
 *
 * Body theo OpenAPI là `{ options: [...] }` với `values` là mảng object
 * `{ value, position }` (tài liệu `product-creation-flows.md` §4 mô tả dạng
 * mảng phẳng chuỗi — đã lỗi thời).
 *
 * Bị từ chối 400 nếu payload bỏ mất một giá trị đang có biến thể sử dụng, nên
 * UI phải chặn trước bằng cách đếm biến thể đang dùng từng giá trị.
 */
export function setProductOptions(productId: string, options: OptionInput[]) {
  return apiFetch<unknown>(`/products/${productId}/options`, {
    method: "PUT",
    body: {
      options: options.map((option, index) => ({
        name: option.name,
        position: option.position ?? index,
        values: option.values.map((value, valueIndex) => ({
          value: value.value,
          position: value.position ?? valueIndex,
        })),
      })),
    },
  }).then((payload) => asArray(payload).map(toOption));
}

/* ---------- Combo ---------- */

export function fetchBundleItems(bundleVariantId: string) {
  return apiFetch<unknown>(`/variants/${bundleVariantId}/bundle-items`).then((payload) =>
    asArray(payload).map(toBundleItem),
  );
}

/**
 * `PUT /variants/{id}/bundle-items` — thay thế toàn bộ thành phần.
 * Body theo OpenAPI là `{ items: [...] }`, không phải mảng phẳng.
 */
export function setBundleItems(bundleVariantId: string, items: BundleItemInput[]) {
  return apiFetch<unknown>(`/variants/${bundleVariantId}/bundle-items`, {
    method: "PUT",
    body: {
      items: items.map((item, index) => ({
        componentVariantId: item.componentVariantId,
        quantity: item.quantity ?? 1,
        position: item.position ?? index,
        isOptional: item.isOptional ?? false,
      })),
    },
  }).then((payload) => asArray(payload).map(toBundleItem));
}

export function fetchVariantAvailability(bundleVariantId: string) {
  return apiFetch<unknown>(`/variants/${bundleVariantId}/availability`).then(toAvailability);
}
