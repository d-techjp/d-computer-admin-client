/**
 * Danh mục và thương hiệu — tách khỏi `products.ts` vì đây là hai resource
 * độc lập (`/categories`, `/brands`), chỉ tình cờ được dùng chung ở màn sản
 * phẩm dưới dạng dropdown.
 */
import type { SelectOption } from "@/types/common";
import type { Brand, Category } from "@/types/product";

import { apiFetch } from "./client";
import { compactPayload, parseListResponse, toListQuery, type ApiListParams } from "./pagination";
import { asBoolean, asIsoDate, asNumber, asRecord, asString } from "./parse";

export interface CategoryPayload {
  name?: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface BrandPayload {
  name?: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  country?: string;
  sortOrder?: number;
  isActive?: boolean;
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
    sortOrder: asNumber(record.sortOrder),
    isActive: asBoolean(record.isActive, true),
    createdAt: asIsoDate(record.createdAt ?? record.created_at),
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
    createdAt: asIsoDate(record.createdAt ?? record.created_at),
  };
}

export function listCategories(
  params: ApiListParams & { parentId?: string; rootOnly?: boolean; isActive?: boolean } = {
    page: 1,
    limit: 100,
  },
) {
  return apiFetch<unknown>("/categories", {
    query: {
      ...toListQuery(params),
      parentId: params.parentId,
      rootOnly: params.rootOnly,
      isActive: params.isActive,
    },
  }).then((payload) =>
    parseListResponse(payload, toCategory, {
      page: params.page,
      pageSize: params.limit,
    }),
  );
}

export function getCategory(id: string) {
  return apiFetch<unknown>(`/categories/${id}`).then(toCategory);
}

export function createCategory(payload: Required<Pick<CategoryPayload, "name">> & CategoryPayload) {
  return apiFetch<unknown>("/categories", {
    method: "POST",
    body: compactPayload(payload),
  }).then(toCategory);
}

export function updateCategory(id: string, payload: CategoryPayload) {
  return apiFetch<unknown>(`/categories/${id}`, {
    method: "PATCH",
    body: compactPayload(payload),
  }).then(toCategory);
}

export function deleteCategory(id: string) {
  return apiFetch<void>(`/categories/${id}`, { method: "DELETE" });
}

export function reorderCategories(items: { id: string; sortOrder: number }[]) {
  return apiFetch<void>("/categories/reorder", {
    method: "PATCH",
    body: { items },
  });
}

export function listBrands(params: ApiListParams & { isActive?: boolean } = { page: 1, limit: 100 }) {
  return apiFetch<unknown>("/brands", {
    query: { ...toListQuery(params), isActive: params.isActive },
  }).then((payload) =>
    parseListResponse(payload, toBrand, {
      page: params.page,
      pageSize: params.limit,
    }),
  );
}

export function createBrand(payload: Required<Pick<BrandPayload, "name">> & BrandPayload) {
  return apiFetch<unknown>("/brands", {
    method: "POST",
    body: compactPayload(payload),
  }).then(toBrand);
}

export function updateBrand(id: string, payload: BrandPayload) {
  return apiFetch<unknown>(`/brands/${id}`, {
    method: "PATCH",
    body: compactPayload(payload),
  }).then(toBrand);
}

export function deleteBrand(id: string) {
  return apiFetch<void>(`/brands/${id}`, { method: "DELETE" });
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

/** Nạp sẵn dropdown danh mục + thương hiệu cho các form sản phẩm */
export async function loadCatalogOptions() {
  const [categories, brands] = await Promise.all([
    listCategories({ page: 1, limit: 100, sortBy: "name", sortOrder: "ASC", isActive: true }),
    listBrands({ page: 1, limit: 100, sortBy: "name", sortOrder: "ASC", isActive: true }),
  ]);

  return {
    categoryOptions: categoryOptionsFrom(categories.data),
    brandOptions: brandOptionsFrom(brands.data),
  };
}
