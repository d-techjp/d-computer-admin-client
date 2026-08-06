/**
 * Biến thể (`product_variants`) và các bảng đi kèm — option, tổ hợp option,
 * thành phần combo.
 *
 * Đây là **đơn vị bán được** sau khi backend tách sản phẩm thành master /
 * variant: giá, tồn kho, SKU, mã vạch đều nằm ở đây chứ không còn ở
 * `Product`. Mọi thứ liên quan tới mua bán tham chiếu bằng `variantId`.
 *
 * Contract không mô tả response schema cho nhóm Products/Variants nên các
 * kiểu dưới đây được khai từ `database.dbml` + `product-creation-flows.md`,
 * và luôn đi kèm mapper phòng thủ ở `lib/api/variants.ts`.
 */

/** `variants_bundle_inventory_policy_enum` — chỉ có giá trị khi product là combo */
export type BundleInventoryPolicy = "derived_from_components" | "own_stock";

export const BUNDLE_INVENTORY_POLICY_LABEL: Record<BundleInventoryPolicy, string> = {
  derived_from_components: "Suy ra từ thành phần",
  own_stock: "Kho riêng của combo",
};

export const BUNDLE_INVENTORY_POLICY_HINT: Record<BundleInventoryPolicy, string> = {
  derived_from_components:
    "Combo marketing — thành phần vẫn bán lẻ được. Tồn kho tính bằng MIN(tồn thành phần / số lượng cần), bán combo thì trừ kho thành phần.",
  own_stock:
    "Kit đóng gói sẵn tại kho — nhập tồn kho như hàng thường, bán combo chỉ trừ kho combo, không đụng tới thành phần.",
};

/** Một giá trị hợp lệ của biến thể: "16GB", "Bạc" */
export interface ProductOptionValue {
  id: string;
  value: string;
  position: number;
}

/** biến thể: RAM, SSD, Màu sắc... */
export interface ProductOption {
  id: string;
  name: string;
  position: number;
  values: ProductOptionValue[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  /** Nhãn hiển thị: "16GB / 512GB"; sản phẩm không có biến thể thì copy tên sản phẩm */
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  /** Giá gạch ngang, phải >= `price` */
  compareAtPrice?: number;
  /** Giá vốn — chỉ nội bộ, không hiển thị cho khách */
  costPrice?: number;
  stock: number;
  lowStockThreshold: number;
  weightGrams?: number;
  /** Ảnh riêng của biến thể; rỗng thì trang chi tiết dùng ảnh của sản phẩm */
  thumbnail?: string;
  images: string[];
  position: number;
  isDefault: boolean;
  isActive: boolean;
  /** `false` cho dịch vụ / hàng đặt trước — bán được kể cả `stock = 0` */
  trackInventory: boolean;
  /** Chỉ có giá trị khi sản phẩm cha là combo */
  bundleInventoryPolicy?: BundleInventoryPolicy;
  soldCount: number;
  /** Tổ hợp option tạo nên biến thể này; rỗng khi sản phẩm chưa khai option */
  optionValues: ProductOptionValue[];
}

/** Sản phẩm rút gọn đi kèm variant ở các response tra cứu (low-stock, bundle item) */
export interface VariantProductRef {
  id: string;
  name: string;
  thumbnail?: string;
  productType?: string;
}

/** Một dòng thành phần của combo (`product_bundle_items`) */
export interface BundleItem {
  id: string;
  bundleVariantId: string;
  componentVariantId: string;
  quantity: number;
  position: number;
  /** `true` = quà tặng kèm, không tính vào công thức tồn kho `derived_from_components` */
  isOptional: boolean;
  /** Backend trả kèm để FE render bảng mà không phải gọi thêm API */
  componentVariant?: ProductVariant & { product?: VariantProductRef };
}

/** Thành phần đang chặn số combo bán được */
export interface AvailabilityLimit {
  variantId: string;
  sku: string;
  stock: number;
  /** Số lượng thành phần cần cho một combo */
  quantity: number;
}

/** `GET /variants/{id}/availability` */
export interface VariantAvailability {
  variantId: string;
  /** `null` = không giới hạn (mọi thành phần đều không quản kho) */
  available: number | null;
  limitedBy: AvailabilityLimit[];
}

/** `GET /variants/low-stock` — biến thể kèm sản phẩm cha để hiển thị được tên */
export interface LowStockVariant extends ProductVariant {
  product?: VariantProductRef;
}

/** Biến thể đã hết hàng và có quản kho — dùng để tô đỏ / chặn thao tác */
export function isOutOfStock(variant: Pick<ProductVariant, "stock" | "trackInventory">) {
  return variant.trackInventory && variant.stock <= 0;
}

export function isLowStock(
  variant: Pick<ProductVariant, "stock" | "lowStockThreshold" | "trackInventory">,
) {
  return (
    variant.trackInventory &&
    variant.stock > 0 &&
    variant.lowStockThreshold > 0 &&
    variant.stock <= variant.lowStockThreshold
  );
}

/** Nhãn tổ hợp option: "Brown / US". Rỗng thì rơi về `variant.name` */
export function optionLabelOf(variant: Pick<ProductVariant, "optionValues">) {
  return variant.optionValues.map((item) => item.value).join(" / ");
}
