/**
 * Carousel của campaign — CRUD phía admin (tag `Carousels`).
 *
 * Endpoint public `GET /carousels/{slug}/products` không có ở đây: đó là API
 * cho storefront gọi, admin xem thử bằng chính `GET /products` với cùng bộ
 * lọc (xem `CarouselFormModal`), nên không cần thêm một đường đọc thứ hai.
 */
import {
  CAROUSEL_DEFAULT_LIMIT,
  CAROUSEL_SORT_FIELDS,
  type Carousel,
  type CarouselFilter,
  type CarouselSortBy,
} from "@/types/carousel";
import type { ProductType } from "@/types/product";

import { carouselFilterFromQuery, carouselFilterToQuery } from "../carouselFilter";
import { apiFetch } from "./client";
import {
  compactPayload,
  parseListResponse,
  toListQuery,
  type ApiListParams,
} from "./pagination";
import {
  asArray,
  asBoolean,
  asIsoDate,
  asNumber,
  asOptionalEnum,
  asOptionalNumber,
  asOptionalString,
  asRecord,
  asString,
} from "./parse";
import { toProduct } from "./products";

const PRODUCT_TYPES: readonly ProductType[] = ["standard", "bundle", "service"];

export interface CarouselPayload {
  name?: string;
  slug?: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  filters?: CarouselFilter;
  itemLimit?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CarouselFilterFieldSchema {
  key: keyof CarouselFilter | string;
  type: "string" | "number" | "boolean" | "uuid" | "enum";
  label: string;
  description?: string;
  options?: { value: string; label: string }[];
  source?: "categories" | "brands";
}

function toFilter(value: unknown, fallbackQuery: string): CarouselFilter {
  // Backend là nguồn sự thật cho `filterQuery`; `filter` chỉ là dạng structured
  // của cùng dữ liệu đó. Thiếu `filter` thì dựng lại từ query string.
  if (!value || typeof value !== "object") return carouselFilterFromQuery(fallbackQuery);

  const record = asRecord(value);
  return {
    search: asOptionalString(record.search),
    categoryId: asOptionalString(record.categoryId),
    includeSubCategories: asBoolean(record.includeSubCategories) || undefined,
    brandId: asOptionalString(record.brandId),
    productType: asOptionalEnum(record.productType, PRODUCT_TYPES),
    minPrice: asOptionalNumber(record.minPrice),
    maxPrice: asOptionalNumber(record.maxPrice),
    inStock: asBoolean(record.inStock) || undefined,
    isFeatured: asBoolean(record.isFeatured) || undefined,
    sortBy: asOptionalEnum<CarouselSortBy>(record.sortBy, CAROUSEL_SORT_FIELDS),
    sortOrder: asOptionalEnum(record.sortOrder, ["ASC", "DESC"] as const),
  };
}

export function toCarousel(value: unknown): Carousel {
  const record = asRecord(value);
  const filterQuery = asString(record.filterQuery ?? record.queryString);
  const filters = toFilter(record.filters ?? record.filter, filterQuery);

  return {
    id: asString(record.id),
    name: asString(record.name),
    slug: asString(record.slug),
    subtitle: asOptionalString(record.subtitle),
    description: asOptionalString(record.description),
    imageUrl: asOptionalString(record.imageUrl),
    filters,
    // Backend cũ/chưa sinh `filterQuery` thì tự dựng lại để UI vẫn có link
    filterQuery: filterQuery || carouselFilterToQuery(filters),
    itemLimit: asNumber(record.itemLimit ?? record.limit, CAROUSEL_DEFAULT_LIMIT),
    sortOrder: asNumber(record.sortOrder ?? record.position),
    isActive: asBoolean(record.isActive, true),
    productCount: record.productCount === null ? null : asOptionalNumber(record.productCount),
    deletedAt: asOptionalString(record.deletedAt ?? record.deleted_at),
    createdAt: asIsoDate(record.createdAt ?? record.created_at),
    updatedAt: asIsoDate(record.updatedAt ?? record.updated_at),
  };
}

export interface ListCarouselsParams extends ApiListParams {
  isActive?: boolean;
  withProductCount?: boolean;
}

export function listCarousels(params: ListCarouselsParams) {
  return apiFetch<unknown>("/carousels", {
    query: {
      ...toListQuery(params),
      isActive: params.isActive,
      withProductCount: params.withProductCount,
    },
  }).then((payload) =>
    parseListResponse(payload, toCarousel, { page: params.page, pageSize: params.limit }),
  );
}

export function fetchCarousel(id: string) {
  return apiFetch<unknown>(`/carousels/${id}`).then(toCarousel);
}

export function createCarousel(payload: Required<Pick<CarouselPayload, "name">> & CarouselPayload) {
  return apiFetch<unknown>("/carousels", {
    method: "POST",
    body: compactPayload(payload),
  }).then(toCarousel);
}

export function updateCarousel(id: string, payload: CarouselPayload) {
  return apiFetch<unknown>(`/carousels/${id}`, {
    method: "PATCH",
    body: compactPayload(payload),
  }).then(toCarousel);
}

export function deleteCarousel(id: string) {
  return apiFetch<void>(`/carousels/${id}`, { method: "DELETE" });
}

export function previewCarouselFilter(filters: CarouselFilter, params = { page: 1, limit: 12 }) {
  return apiFetch<unknown>("/carousels/preview", {
    method: "POST",
    body: { filters: compactPayload(filters), ...params },
  }).then((payload) =>
    parseListResponse(payload, toProduct, {
      page: params.page,
      pageSize: params.limit,
    }),
  );
}

export function reorderCarousels(items: { id: string; sortOrder: number }[]) {
  return apiFetch<void>("/carousels/reorder", {
    method: "POST",
    body: { items },
  });
}

export function fetchCarouselFilterSchema() {
  return apiFetch<unknown>("/carousels/filter-schema").then((payload) =>
    asArray(payload).map((item) => {
      const record = asRecord(item);
      return {
        key: asString(record.key),
        type: asString(record.type) as CarouselFilterFieldSchema["type"],
        label: asString(record.label),
        description: asOptionalString(record.description),
        options: asArray(record.options).map((option) => {
          const optionRecord = asRecord(option);
          return {
            value: asString(optionRecord.value),
            label: asString(optionRecord.label),
          };
        }),
        source: asOptionalEnum(record.source, ["categories", "brands"] as const),
      };
    }),
  );
}
