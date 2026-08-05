/**
 * Product master.
 *
 * Sau khi backend tách master / variant, file này **không còn đụng tới giá,
 * SKU hay tồn kho** — những thứ đó nằm ở `variants.ts`. Ở đây chỉ còn thông
 * tin trang sản phẩm: tên, ảnh, danh mục, thương hiệu, thông số dùng chung.
 */
import type {
  Product,
  ProductSpec,
  ProductStatus,
  ProductType,
} from "@/types/product";

import { apiFetch, type QueryValue } from "./client";
import { buildFormData, type ImageInput } from "./formData";
import {
  parseListResponse,
  toListQuery,
  type ApiListParams,
  type ApiListResult,
} from "./pagination";
import {
  asArray,
  asBoolean,
  asEnum,
  asIsoDate,
  asNumber,
  asOptionalNumber,
  asOptionalString,
  asRecord,
  asString,
  asStringArray,
} from "./parse";
import { toOption, toVariant, type VariantPayload } from "./variants";

const PRODUCT_STATUSES = ["draft", "active", "out_of_stock", "archived"] as const;
const PRODUCT_TYPES = ["standard", "bundle", "service"] as const;

export interface ListProductsParams extends ApiListParams {
  productType?: ProductType;
  categoryId?: string;
  includeSubCategories?: boolean;
  brandId?: string;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isFeatured?: boolean;
}

/** `CreateProductDto` / `UpdateProductDto` — phần master, không kèm ảnh */
export interface ProductPayload {
  name?: string;
  slug?: string;
  productType?: ProductType;
  shortDescription?: string;
  specifications?: Record<string, string>;
  status?: ProductStatus;
  isFeatured?: boolean;
  categoryId?: string;
  brandId?: string;
}

function toSpecs(value: unknown): ProductSpec[] {
  // Backend lưu `specifications` dạng object { label: value }; chấp nhận cả
  // dạng mảng để không vỡ với dữ liệu cũ.
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const record = asRecord(item);
        return { label: asString(record.label), value: asString(record.value) };
      })
      .filter((item) => item.label || item.value);
  }

  return Object.entries(asRecord(value)).map(([label, specValue]) => ({
    label,
    value: String(specValue ?? ""),
  }));
}

export function toProduct(value: unknown): Product {
  const record = asRecord(value);
  const category = asRecord(record.category);
  const brand = asRecord(record.brand);

  return {
    id: asString(record.id),
    name: asString(record.name),
    slug: asString(record.slug),
    productType: asEnum(record.productType, PRODUCT_TYPES, "standard"),
    status: asEnum(record.status, PRODUCT_STATUSES, "draft"),
    shortDescription: asString(record.shortDescription),
    thumbnail: asOptionalString(record.thumbnail),
    images: asStringArray(record.images),
    specs: toSpecs(record.specifications ?? record.specs),
    isFeatured: asBoolean(record.isFeatured),
    hasVariants: asBoolean(record.hasVariants),
    minPrice: asOptionalNumber(record.minPrice),
    maxPrice: asOptionalNumber(record.maxPrice),
    totalStock: asNumber(record.totalStock),
    viewCount: asNumber(record.viewCount),
    soldCount: asNumber(record.soldCount),
    categoryId: asString(record.categoryId ?? category.id),
    categoryName: asString(record.categoryName ?? category.name),
    brandId: asString(record.brandId ?? brand.id),
    brandName: asString(record.brandName ?? brand.name),
    variants: asArray(record.variants).map(toVariant),
    options: asArray(record.options).map(toOption),
    description: asOptionalString(record.description),
    createdAt: asIsoDate(record.createdAt ?? record.created_at),
  };
}

/** Ảnh gallery đầy đủ của master: thumbnail luôn đứng đầu */
export function productImagesOf(product: Pick<Product, "thumbnail" | "images">) {
  const { thumbnail, images } = product;
  return thumbnail && !images.includes(thumbnail) ? [thumbnail, ...images] : images;
}

export function listProducts(params: ListProductsParams) {
  const query: Record<string, QueryValue> = {
    ...toListQuery(params),
    productType: params.productType,
    categoryId: params.categoryId,
    includeSubCategories: params.includeSubCategories,
    brandId: params.brandId,
    status: params.status,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    inStock: params.inStock,
    isFeatured: params.isFeatured,
  };

  return apiFetch<unknown>("/products", { query }).then((payload) =>
    parseListResponse(payload, toProduct, {
      page: params.page,
      pageSize: params.limit,
    }),
  );
}

export function fetchProduct(id: string) {
  return apiFetch<unknown>(`/products/${id}`).then(toProduct);
}

export function deleteProduct(id: string) {
  return apiFetch<void>(`/products/${id}`, { method: "DELETE" });
}

/**
 * `POST /products` — **bắt buộc kèm `variants` tối thiểu 1 phần tử**: sản
 * phẩm không có biến thể là hàng không bán được, backend không có API tạo
 * sản phẩm rỗng.
 *
 * Endpoint chỉ nhận multipart nên `variants` và `specifications` phải là
 * chuỗi JSON (`buildFormData` tự stringify object).
 */
export function createProduct(
  payload: Required<Pick<ProductPayload, "name">> & ProductPayload,
  variants: VariantPayload[],
  images?: ImageInput[],
) {
  return apiFetch<unknown>("/products", {
    method: "POST",
    body: buildFormData({ ...payload, variants }, images),
  }).then(toProduct);
}

/**
 * `PATCH /products/{id}` — chỉ sửa master, **không đụng tới biến thể**.
 * Không gửi ảnh thì backend giữ nguyên ảnh hiện có.
 */
export function updateProduct(id: string, payload: ProductPayload, images?: ImageInput[]) {
  return apiFetch<unknown>(`/products/${id}`, {
    method: "PATCH",
    body: buildFormData({ ...payload }, images),
  }).then(toProduct);
}

function toDescriptionContent(value: unknown): string {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  return asString(record.description ?? record.content);
}

/**
 * `GET /products/{id}/description` — gọi riêng khi người dùng bấm sửa mô tả
 * chi tiết, tránh tải/dựng sẵn trình soạn thảo rich text (nặng) ngay từ lúc
 * mở trang chỉnh sửa sản phẩm.
 */
export function fetchProductDescription(id: string) {
  return apiFetch<unknown>(`/products/${id}/description`).then(toDescriptionContent);
}

/** `PUT /products/{id}/description` — lưu độc lập với `updateProduct` */
export function updateProductDescription(id: string, content: string) {
  return apiFetch<unknown>(`/products/${id}/description`, {
    method: "PUT",
    body: { content },
  }).then(toDescriptionContent);
}

export function toProductListResult(
  payload: unknown,
  fallback: { page: number; pageSize: number },
) {
  return parseListResponse(payload, toProduct, fallback) satisfies ApiListResult<Product>;
}
