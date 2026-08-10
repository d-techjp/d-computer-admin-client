import type { ProductOption, ProductVariant } from "./variant";

export type ProductStatus = "draft" | "active" | "out_of_stock" | "archived";

/**
 * `products_type_enum` — quyết định toàn bộ luồng nhập liệu ở màn quản trị:
 * `standard` có biến thể và tồn kho, `bundle` ghép từ variant khác,
 * `service` không quản kho. **Không đổi được sau khi tạo.**
 */
export type ProductType = "standard" | "bundle" | "service";

/**
 * Thông số kỹ thuật để dạng danh sách nhãn/giá trị thay vì các trường cố định,
 * vì mỗi nhóm hàng có bộ thông số khác nhau (laptop cần CPU/RAM, màn hình cần
 * tần số quét, tai nghe cần trở kháng...) và người dùng cần tự thêm được.
 *
 * Đây là thông số **dùng chung mọi biến thể**; thông số khác nhau giữa các
 * biến thể phải khai bằng option (`ProductOption`).
 */
export interface ProductSpec {
  name: string;
  value: string;
  position: number;
}

/**
 * Product master — **không bán trực tiếp**. `sku` / `price` / `stock` đã
 * chuyển xuống `ProductVariant`; ở đây chỉ còn các trường denormalized để
 * trang danh sách render được mà không phải gọi thêm API.
 */
export interface Product {
  id: string;
  name: string;
  slug: string;
  productType: ProductType;
  status: ProductStatus;
  shortDescription: string;
  thumbnail?: string;
  /** Gallery chung của master; biến thể có thể override bằng ảnh riêng */
  images: string[];
  specs: ProductSpec[];
  isFeatured: boolean;
  /** Denormalized: `true` khi có nhiều hơn 1 biến thể */
  hasVariants: boolean;
  /** Denormalized MIN/MAX giá biến thể — dùng cho khoảng giá ở danh sách */
  minPrice?: number;
  maxPrice?: number;
  /** Denormalized tổng tồn kho của mọi biến thể */
  totalStock: number;
  viewCount: number;
  soldCount: number;
  categoryId: string;
  categoryName: string;
  brandId: string;
  brandName: string;
  /**
   * Ở response **danh sách** chỉ chứa biến thể mặc định (1 phần tử);
   * `GET /products/:id` mới trả đầy đủ.
   */
  variants: ProductVariant[];
  /** Chỉ có ở response chi tiết */
  options: ProductOption[];
  /**
   * Mô tả chi tiết dạng HTML — không tải kèm trong danh sách/form ban đầu,
   * chỉ lấy về qua `fetchProductDescription` khi người dùng bấm sửa.
   */
  description?: string;
  createdAt: string;
}

/** Thông số gợi ý mặc định cho hàng máy tính — người dùng có thể sửa/xoá/thêm */
export const DEFAULT_SPEC_LABELS = [
  "CPU",
  "RAM",
  "Ổ cứng",
  "Màn hình",
] as const;

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  parentName?: string;
  productCount: number;
  createdAt: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  country: string;
  productCount: number;
  createdAt: string;
}

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  active: "Đang bán",
  draft: "Bản nháp",
  out_of_stock: "Hết hàng",
  archived: "Lưu trữ",
};

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  standard: "Hàng hoá",
  bundle: "Combo",
  service: "Dịch vụ",
};

export const PRODUCT_TYPE_HINT: Record<ProductType, string> = {
  standard: "Hàng hoá thường — có tồn kho, một hoặc nhiều phiên bản (RAM, màu...).",
  bundle: "Combo/kit ghép từ các phiên bản sẵn có, bán theo gói.",
  service: "Dịch vụ (cài win, vệ sinh máy, bảo hành mở rộng) — không quản kho.",
};

/**
 * Biến thể mặc định — nơi lấy giá/SKU/tồn khi hiển thị sản phẩm một phiên bản.
 * Backend luôn đảm bảo có đúng một biến thể `isDefault`, nhưng vẫn rơi về
 * phần tử đầu để không vỡ UI nếu dữ liệu cũ chưa chuẩn hoá.
 */
export function defaultVariantOf(product: Pick<Product, "variants">) {
  return product.variants.find((variant) => variant.isDefault) ?? product.variants[0];
}

/** `true` khi mọi biến thể đều cùng một giá — dùng để hiển thị 1 giá thay vì khoảng */
export function hasSinglePrice(product: Pick<Product, "minPrice" | "maxPrice">) {
  return (
    product.minPrice === undefined ||
    product.maxPrice === undefined ||
    product.minPrice === product.maxPrice
  );
}

/** Sản phẩm dịch vụ và hàng đặt trước không hiển thị tồn kho ở bất kỳ đâu */
export function tracksInventory(product: Pick<Product, "productType" | "variants">) {
  if (product.productType === "service") return false;
  return product.variants.some((variant) => variant.trackInventory);
}
