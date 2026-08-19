import type { Brand, Category } from "@/types/product";

/**
 * Danh mục & thương hiệu viết tay (không random) vì đây là dữ liệu tham chiếu
 * mà sản phẩm, kho và bộ lọc đều dựa vào — cần ổn định và đúng ngành hàng.
 */
export const categories: Category[] = [
  { id: "cat-laptop", name: "Laptop", slug: "laptop", productCount: 0, sortOrder: 0, isActive: true, createdAt: "2025-01-10T00:00:00.000Z" },
  { id: "cat-laptop-gaming", name: "Laptop Gaming", slug: "laptop-gaming", parentId: "cat-laptop", parentName: "Laptop", productCount: 0, sortOrder: 0, isActive: true, createdAt: "2025-01-12T00:00:00.000Z" },
  { id: "cat-pc", name: "PC & Máy bộ", slug: "pc-may-bo", productCount: 0, sortOrder: 1, isActive: true, createdAt: "2025-01-15T00:00:00.000Z" },
  { id: "cat-monitor", name: "Màn hình", slug: "man-hinh", productCount: 0, sortOrder: 2, isActive: true, createdAt: "2025-01-18T00:00:00.000Z" },
  { id: "cat-cpu", name: "CPU", slug: "cpu", productCount: 0, sortOrder: 3, isActive: true, createdAt: "2025-02-02T00:00:00.000Z" },
  { id: "cat-gpu", name: "Card đồ hoạ", slug: "card-do-hoa", productCount: 0, sortOrder: 4, isActive: true, createdAt: "2025-02-05T00:00:00.000Z" },
  { id: "cat-ram", name: "RAM", slug: "ram", productCount: 0, sortOrder: 5, isActive: true, createdAt: "2025-02-08T00:00:00.000Z" },
  { id: "cat-storage", name: "Ổ cứng & SSD", slug: "o-cung-ssd", productCount: 0, sortOrder: 6, isActive: true, createdAt: "2025-02-11T00:00:00.000Z" },
  { id: "cat-keyboard", name: "Bàn phím", slug: "ban-phim", productCount: 0, sortOrder: 7, isActive: true, createdAt: "2025-03-01T00:00:00.000Z" },
  { id: "cat-mouse", name: "Chuột", slug: "chuot", productCount: 0, sortOrder: 8, isActive: true, createdAt: "2025-03-04T00:00:00.000Z" },
  { id: "cat-headset", name: "Tai nghe", slug: "tai-nghe", productCount: 0, sortOrder: 9, isActive: true, createdAt: "2025-03-07T00:00:00.000Z" },
  { id: "cat-accessory", name: "Phụ kiện", slug: "phu-kien", productCount: 0, sortOrder: 10, isActive: true, createdAt: "2025-03-10T00:00:00.000Z" },
];

export const brands: Brand[] = [
  { id: "brd-dell", name: "Dell", slug: "dell", country: "Hoa Kỳ", productCount: 0, createdAt: "2025-01-05T00:00:00.000Z" },
  { id: "brd-asus", name: "ASUS", slug: "asus", country: "Đài Loan", productCount: 0, createdAt: "2025-01-05T00:00:00.000Z" },
  { id: "brd-acer", name: "Acer", slug: "acer", country: "Đài Loan", productCount: 0, createdAt: "2025-01-06T00:00:00.000Z" },
  { id: "brd-lenovo", name: "Lenovo", slug: "lenovo", country: "Trung Quốc", productCount: 0, createdAt: "2025-01-06T00:00:00.000Z" },
  { id: "brd-hp", name: "HP", slug: "hp", country: "Hoa Kỳ", productCount: 0, createdAt: "2025-01-07T00:00:00.000Z" },
  { id: "brd-msi", name: "MSI", slug: "msi", country: "Đài Loan", productCount: 0, createdAt: "2025-01-07T00:00:00.000Z" },
  { id: "brd-apple", name: "Apple", slug: "apple", country: "Hoa Kỳ", productCount: 0, createdAt: "2025-01-08T00:00:00.000Z" },
  { id: "brd-intel", name: "Intel", slug: "intel", country: "Hoa Kỳ", productCount: 0, createdAt: "2025-01-08T00:00:00.000Z" },
  { id: "brd-amd", name: "AMD", slug: "amd", country: "Hoa Kỳ", productCount: 0, createdAt: "2025-01-09T00:00:00.000Z" },
  { id: "brd-nvidia", name: "NVIDIA", slug: "nvidia", country: "Hoa Kỳ", productCount: 0, createdAt: "2025-01-09T00:00:00.000Z" },
  { id: "brd-logitech", name: "Logitech", slug: "logitech", country: "Thuỵ Sĩ", productCount: 0, createdAt: "2025-01-10T00:00:00.000Z" },
  { id: "brd-corsair", name: "Corsair", slug: "corsair", country: "Hoa Kỳ", productCount: 0, createdAt: "2025-01-10T00:00:00.000Z" },
  { id: "brd-samsung", name: "Samsung", slug: "samsung", country: "Hàn Quốc", productCount: 0, createdAt: "2025-01-11T00:00:00.000Z" },
  { id: "brd-kingston", name: "Kingston", slug: "kingston", country: "Hoa Kỳ", productCount: 0, createdAt: "2025-01-11T00:00:00.000Z" },
];

export const categoryOptions = categories.map((item) => ({
  label: item.parentName ? `${item.parentName} › ${item.name}` : item.name,
  value: item.id,
}));

export const brandOptions = brands.map((item) => ({
  label: item.name,
  value: item.id,
}));
