/**
 * Chuyển đổi hai chiều giữa bộ lọc carousel và query string.
 *
 * Đây là mấu chốt của feature: admin chỉnh filter dạng form, backend lưu lại
 * và sinh `filterQuery`, storefront lấy nguyên chuỗi đó ghép vào link "Xem tất
 * cả" để mở PLP ra **đúng** tập sản phẩm của carousel. Vì vậy chuỗi phải
 * canonical (thứ tự key cố định, bỏ giá trị rỗng) — cùng một filter luôn cho
 * cùng một chuỗi, so sánh/cache/kiểm tra bằng mắt đều dễ.
 *
 * Tên param giữ nguyên như `GET /products` (`categoryId`, `minPrice`...) nên
 * chuỗi này dùng thẳng được cho cả API lẫn URL của PLP.
 */
import {
  CAROUSEL_SORT_FIELDS,
  type CarouselFilter,
  type CarouselSortBy,
  type CarouselSortOrder,
} from "@/types/carousel";
import type { ProductType } from "@/types/product";

const PRODUCT_TYPES: readonly ProductType[] = ["standard", "bundle", "service"];

/** Thứ tự key trong query string — cố định để chuỗi sinh ra luôn giống nhau */
const FILTER_KEYS = [
  "search",
  "categoryId",
  "includeSubCategories",
  "brandId",
  "productType",
  "minPrice",
  "maxPrice",
  "inStock",
  "isFeatured",
  "sortBy",
  "sortOrder",
] as const satisfies readonly (keyof CarouselFilter)[];

function isEmpty(value: unknown) {
  return value === undefined || value === null || value === "" || value === false;
}

/**
 * `false` bị bỏ qua như giá trị rỗng: `inStock=false` không có nghĩa "chỉ lấy
 * hàng hết" mà là "không lọc theo tồn kho" — giữ lại chỉ làm URL dài thêm.
 */
export function carouselFilterToQuery(filter: CarouselFilter): string {
  const search = new URLSearchParams();

  for (const key of FILTER_KEYS) {
    const value = filter[key];
    if (isEmpty(value)) continue;
    search.set(key, String(value));
  }

  return search.toString();
}

function optionalNumber(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalBoolean(value: string | null) {
  return value === "true" ? true : undefined;
}

/**
 * Chiều ngược lại — dùng khi backend chỉ trả `filterQuery` (hoặc khi đọc lại
 * link "Xem tất cả") mà không có object `filter`.
 */
export function carouselFilterFromQuery(query: string): CarouselFilter {
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  const sortBy = params.get("sortBy");
  const sortOrder = params.get("sortOrder");
  const productType = params.get("productType");

  return {
    search: params.get("search") || undefined,
    categoryId: params.get("categoryId") || undefined,
    includeSubCategories: optionalBoolean(params.get("includeSubCategories")),
    brandId: params.get("brandId") || undefined,
    productType: PRODUCT_TYPES.includes(productType as ProductType)
      ? (productType as ProductType)
      : undefined,
    minPrice: optionalNumber(params.get("minPrice")),
    maxPrice: optionalNumber(params.get("maxPrice")),
    inStock: optionalBoolean(params.get("inStock")),
    isFeatured: optionalBoolean(params.get("isFeatured")),
    sortBy: CAROUSEL_SORT_FIELDS.includes(sortBy as CarouselSortBy)
      ? (sortBy as CarouselSortBy)
      : undefined,
    sortOrder: sortOrder === "ASC" || sortOrder === "DESC" ? (sortOrder as CarouselSortOrder) : undefined,
  };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "";

/** Đường dẫn PLP mà nút "Xem tất cả" của carousel sẽ mở */
export function carouselViewAllPath(filterQuery: string) {
  return filterQuery ? `/products?${filterQuery}` : "/products";
}

/**
 * URL đầy đủ để admin bấm thử — chỉ có khi cấu hình `NEXT_PUBLIC_SITE_URL`,
 * ngược lại trả về đường dẫn tương đối để vẫn copy/dán được.
 */
export function carouselViewAllUrl(filterQuery: string) {
  const path = carouselViewAllPath(filterQuery);
  return SITE_URL ? `${SITE_URL}${path}` : path;
}

export const hasCarouselSiteUrl = !!SITE_URL;
