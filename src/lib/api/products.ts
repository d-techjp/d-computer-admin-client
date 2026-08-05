import type { SelectOption } from "@/types/common";
import type { Brand, Category, Product, ProductSpec, ProductStatus } from "@/types/product";

import { apiFetch, type QueryValue } from "./client";
import {
  compactPayload,
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

export interface ProductPayload {
  name?: string;
  slug?: string;
  sku?: string;
  shortDescription?: string;
  description?: string;
  price?: number;
  compareAtPrice?: number;
  costPrice?: number;
  stock?: number;
  lowStockThreshold?: number;
  thumbnail?: string;
  images?: string[];
  specifications?: Record<string, string>;
  status?: ProductStatus;
  isFeatured?: boolean;
  categoryId?: string;
  brandId?: string;
}

export interface ProductImageInput {
  url: string;
  file?: File;
}

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

  return apiFetch<unknown>("/products", { query }).then((payload) =>
    parseListResponse(payload, toProduct, {
      page: params.page,
      pageSize: params.limit,
    }),
  );
}

export function deleteProduct(id: string) {
  return apiFetch<void>(`/products/${id}`, { method: "DELETE" });
}

export function fetchProduct(id: string) {
  return apiFetch<unknown>(`/products/${id}`).then(toProduct);
}

function appendIfPresent(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") return;
  formData.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
}

function buildProductFormData(payload: ProductPayload, images: ProductImageInput[]) {
  const formData = new FormData();

  appendIfPresent(formData, "name", payload.name);
  appendIfPresent(formData, "slug", payload.slug);
  appendIfPresent(formData, "sku", payload.sku);
  appendIfPresent(formData, "shortDescription", payload.shortDescription);
  appendIfPresent(formData, "description", payload.description);
  appendIfPresent(formData, "price", payload.price);
  appendIfPresent(formData, "compareAtPrice", payload.compareAtPrice);
  appendIfPresent(formData, "costPrice", payload.costPrice);
  appendIfPresent(formData, "stock", payload.stock);
  appendIfPresent(formData, "lowStockThreshold", payload.lowStockThreshold);
  appendIfPresent(formData, "specifications", payload.specifications);
  appendIfPresent(formData, "status", payload.status);
  appendIfPresent(formData, "isFeatured", payload.isFeatured);
  appendIfPresent(formData, "categoryId", payload.categoryId);
  appendIfPresent(formData, "brandId", payload.brandId);

  const [thumbnail, ...gallery] = images;
  if (thumbnail?.file) {
    formData.append("thumbnailFile", thumbnail.file);
  } else {
    appendIfPresent(formData, "thumbnail", thumbnail?.url ?? payload.thumbnail);
  }

  for (const image of gallery) {
    if (image.file) {
      formData.append("imagesFiles", image.file);
    } else {
      appendIfPresent(formData, "images", image.url);
    }
  }

  return formData;
}

export function createProductMultipart(
  payload: Required<Pick<ProductPayload, "name" | "sku" | "price">> & ProductPayload,
  images: ProductImageInput[],
) {
  return apiFetch<unknown>("/products", {
    method: "POST",
    body: buildProductFormData(payload, images),
  }).then(toProduct);
}

export function updateProduct(id: string, payload: ProductPayload) {
  return apiFetch<unknown>(`/products/${id}`, {
    method: "PATCH",
    body: compactPayload(payload),
  }).then(toProduct);
}

export function updateProductMultipart(id: string, payload: ProductPayload, images: ProductImageInput[]) {
  return apiFetch<unknown>(`/products/${id}`, {
    method: "PATCH",
    body: buildProductFormData(payload, images),
  }).then(toProduct);
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

export function toProductListResult(
  payload: unknown,
  fallback: { page: number; pageSize: number },
) {
  return parseListResponse(payload, toProduct, fallback) satisfies ApiListResult<Product>;
}
