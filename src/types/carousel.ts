/**
 * Carousel của campaign — một khối sản phẩm trên storefront ("Sản phẩm nổi
 * bật", "Hàng mới về"...). Admin không chọn tay từng sản phẩm mà **đặt bộ
 * lọc**: storefront gọi `GET /carousels/{slug}/products` để lấy sản phẩm, và
 * dùng `filterQuery` cho link "Xem tất cả" trỏ sang PLP.
 *
 * Bám theo contract `openapi/carousels.contract.yaml` (tag `Admin - Carousels`).
 */
import type { ProductType } from "./product";

/**
 * Bộ lọc sản phẩm của carousel. Tên field trùng **đúng** query param của
 * `GET /products` để cùng một bộ giá trị vừa chạy được ở API carousel, vừa
 * ghép thẳng thành query string cho PLP mà không phải ánh xạ lại.
 *
 * Không có `status`: carousel là khối hiển thị cho khách nên backend luôn ép
 * `status=active`, admin không chỉnh được.
 */
export interface CarouselFilter {
  search?: string;
  categoryId?: string;
  /** Lấy cả sản phẩm thuộc danh mục con của `categoryId` */
  includeSubCategories?: boolean;
  brandId?: string;
  productType?: ProductType;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isFeatured?: boolean;
  sortBy?: CarouselSortBy;
  sortOrder?: CarouselSortOrder;
}

export type CarouselSortOrder = "ASC" | "DESC";

export const CAROUSEL_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "soldCount",
  "viewCount",
  "minPrice",
  "totalStock",
  "name",
] as const;

export type CarouselSortBy = (typeof CAROUSEL_SORT_FIELDS)[number];

export const CAROUSEL_SORT_LABEL: Record<CarouselSortBy, string> = {
  createdAt: "Ngày tạo",
  updatedAt: "Ngày cập nhật",
  soldCount: "Lượt bán",
  viewCount: "Lượt xem",
  minPrice: "Giá",
  totalStock: "Tồn kho",
  name: "Tên sản phẩm",
};

export const CAROUSEL_SORT_ORDER_LABEL: Record<CarouselSortOrder, string> = {
  DESC: "Giảm dần",
  ASC: "Tăng dần",
};

export interface Carousel {
  id: string;
  /** Tên hiển thị trên storefront, VD "Sản phẩm nổi bật" */
  name: string;
  /** Định danh storefront dùng để gọi `GET /carousels/{slug}/products` */
  slug: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  filters: CarouselFilter;
  /**
   * Query string canonical do backend sinh lại từ `filter` mỗi lần lưu —
   * storefront ghép vào link "Xem tất cả" (`/products?{filterQuery}`) thay vì
   * tự dựng từ `filter`, để admin và PLP luôn ra cùng một tập sản phẩm.
   */
  filterQuery: string;
  /** Số sản phẩm tối đa lấy vào carousel */
  itemLimit: number;
  /** Thứ tự các carousel trên trang chủ, nhỏ đứng trước */
  sortOrder: number;
  isActive: boolean;
  /** Tổng số sản phẩm khớp filters — `null` nếu list không truyền `withProductCount=true` */
  productCount?: number | null;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const CAROUSEL_DEFAULT_LIMIT = 12;
export const CAROUSEL_MAX_LIMIT = 24;

/** Bộ lọc rỗng = lấy toàn bộ sản phẩm đang bán, sắp xếp mới nhất trước */
export const EMPTY_CAROUSEL_FILTER: CarouselFilter = {
  sortBy: "createdAt",
  sortOrder: "DESC",
};
