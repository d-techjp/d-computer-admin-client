import type { SelectOption } from "@/types/common";
import type { Brand, Category, Product, ProductSpec, ProductStatus } from "@/types/product";

import { apiFetch, type QueryValue } from "./client";
import {
  parseListResponse,
  toListQuery,
  type ApiListParams,
  type ApiListResult,
} from "./pagination";

export interface ListProductsParams extends ApiListParams {
  categoryId?: string;
  includeSubCategories?: boolean;
  brandId?: string;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isFeatured?: boolean;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return fallback;
}

function toSpecs(value: unknown): ProductSpec[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const record = asRecord(item);
        return { label: asString(record.label), value: asString(record.value) };
      })
      .filter((item) => item.label || item.value);
  }

  const record = asRecord(value);
  return Object.entries(record).map(([label, specValue]) => ({
    label,
    value: String(specValue ?? ""),
  }));
}

function toImages(record: Record<string, unknown>) {
  const images = Array.isArray(record.images)
    ? record.images.filter((item): item is string => typeof item === "string")
    : [];
  const thumbnail = asString(record.thumbnail ?? record.thumbnailUrl ?? record.imageUrl);
  return thumbnail && !images.includes(thumbnail) ? [thumbnail, ...images] : images;
}

export function toProduct(value: unknown): Product {
  const record = asRecord(value);
  const category = asRecord(record.category);
  const brand = asRecord(record.brand);

  return {
    id: asString(record.id),
    name: asString(record.name),
    sku: asString(record.sku),
    brandId: asString(record.brandId ?? brand.id),
    brandName: asString(record.brandName ?? brand.name),
    categoryId: asString(record.categoryId ?? category.id),
    categoryName: asString(record.categoryName ?? category.name),
    price: asNumber(record.price),
    cost: asNumber(record.cost ?? record.costPrice),
    stock: asNumber(record.stock),
    status: asString(record.status, "draft") as ProductStatus,
    specs: toSpecs(record.specifications ?? record.specs),
    images: toImages(record),
    description: asString(record.description ?? record.shortDescription),
    createdAt: asString(record.createdAt ?? record.created_at, new Date(0).toISOString()),
  };
}

export function toCategory(value: unknown): Category {
  const record = asRecord(value);
  const parent = asRecord(record.parent);

  return {
    id: asString(record.id),
    name: asString(record.name),
    slug: asString(record.slug),
    parentId: asString(record.parentId ?? parent.id) || undefined,
    parentName: asString(record.parentName ?? parent.name) || undefined,
    productCount: asNumber(record.productCount ?? record.productsCount),
    createdAt: asString(record.createdAt ?? record.created_at, new Date(0).toISOString()),
  };
}

export function toBrand(value: unknown): Brand {
  const record = asRecord(value);

  return {
    id: asString(record.id),
    name: asString(record.name),
    slug: asString(record.slug),
    country: asString(record.country),
    productCount: asNumber(record.productCount ?? record.productsCount),
    createdAt: asString(record.createdAt ?? record.created_at, new Date(0).toISOString()),
  };
}

export function listProducts(params: ListProductsParams) {
  const query: Record<string, QueryValue> = {
    ...toListQuery(params),
    categoryId: params.categoryId,
    includeSubCategories: params.includeSubCategories,
    brandId: params.brandId,
    status: params.status,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    inStock: params.inStock,
    isFeatured: params.isFeatured,
  };

  return apiFetch<unknown>("/api/v1/products", { query }).then((payload) =>
    parseListResponse(payload, toProduct, {
      page: params.page,
      pageSize: params.limit,
    }),
  );
}

export function deleteProduct(id: string) {
  return apiFetch<void>(`/api/v1/products/${id}`, { method: "DELETE" });
}

export function listCategories(params: ApiListParams & { isActive?: boolean } = { page: 1, limit: 100 }) {
  return apiFetch<unknown>("/api/v1/categories", {
    query: { ...toListQuery(params), isActive: params.isActive },
  }).then((payload) =>
    parseListResponse(payload, toCategory, {
      page: params.page,
      pageSize: params.limit,
    }),
  );
}

export function listBrands(params: ApiListParams & { isActive?: boolean } = { page: 1, limit: 100 }) {
  return apiFetch<unknown>("/api/v1/brands", {
    query: { ...toListQuery(params), isActive: params.isActive },
  }).then((payload) =>
    parseListResponse(payload, toBrand, {
      page: params.page,
      pageSize: params.limit,
    }),
  );
}

export function categoryOptionsFrom(categories: Category[]): SelectOption[] {
  return categories.map((item) => ({
    label: item.parentName ? `${item.parentName} > ${item.name}` : item.name,
    value: item.id,
  }));
}

export function brandOptionsFrom(brands: Brand[]): SelectOption[] {
  return brands.map((item) => ({ label: item.name, value: item.id }));
}

export function toProductListResult(
  payload: unknown,
  fallback: { page: number; pageSize: number },
) {
  return parseListResponse(payload, toProduct, fallback) satisfies ApiListResult<Product>;
}
