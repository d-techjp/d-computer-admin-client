export type ProductStatus = "active" | "draft" | "out_of_stock" | "archived";

/**
 * Thông số kỹ thuật để dạng danh sách nhãn/giá trị thay vì các trường cố định,
 * vì mỗi nhóm hàng có bộ thông số khác nhau (laptop cần CPU/RAM, màn hình cần
 * tần số quét, tai nghe cần trở kháng...) và người dùng cần tự thêm được.
 */
export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  /** Giá niêm yết bằng yên Nhật (JPY, không có phần thập phân) */
  price: number;
  cost: number;
  stock: number;
  status: ProductStatus;
  specs: ProductSpec[];
  /** Ảnh sản phẩm; phần tử đầu tiên là ảnh đại diện */
  images: string[];
  description: string;
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
