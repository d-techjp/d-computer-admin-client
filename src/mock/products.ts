import type { ProductSpec, ProductStatus } from "@/types/product";

import { brands, categories } from "./catalog";
import { faker, roundPrice, seedFaker } from "./utils";

/**
 * Sản phẩm giả lập dạng **phẳng** (một SKU, một giá, một tồn kho).
 *
 * Cố tình không dùng lại `Product` nữa: sản phẩm thật đã tách master/variant
 * và mọi màn sản phẩm đều gọi API thật, nên dữ liệu giả ở đây chỉ còn phục vụ
 * các màn chưa nối API (kho, đơn hàng). Giữ shape phẳng cho chúng đơn giản hơn
 * là bắt mock phải dựng cả cây biến thể.
 */
export interface MockProduct {
  id: string;
  name: string;
  sku: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  price: number;
  cost: number;
  stock: number;
  status: ProductStatus;
  specs: ProductSpec[];
  images: string[];
  isFeatured: boolean;
  shortDescription: string;
  createdAt: string;
}

/**
 * Model gắn liền thương hiệu để tên sản phẩm đọc ra hợp lý
 * (tránh sinh ra kiểu "Lenovo Inspiron" — Inspiron vốn là dòng của Dell).
 */
type ModelEntry = { brandId: string; model: string };

const NAME_TEMPLATES: Record<string, ModelEntry[]> = {
  "cat-laptop": [
    { brandId: "brd-dell", model: "Inspiron 15" },
    { brandId: "brd-asus", model: "Vivobook 14" },
    { brandId: "brd-acer", model: "Aspire 5" },
    { brandId: "brd-lenovo", model: "IdeaPad Slim 3" },
    { brandId: "brd-hp", model: "Pavilion 14" },
    { brandId: "brd-apple", model: "MacBook Air M3" },
  ],
  "cat-laptop-gaming": [
    { brandId: "brd-asus", model: "ROG Strix G16" },
    { brandId: "brd-acer", model: "Nitro V 15" },
    { brandId: "brd-msi", model: "Katana 15" },
    { brandId: "brd-lenovo", model: "Legion 5 Pro" },
    { brandId: "brd-dell", model: "Alienware m16" },
    { brandId: "brd-asus", model: "TUF Gaming A15" },
  ],
  "cat-pc": [
    { brandId: "brd-dell", model: "OptiPlex 7010" },
    { brandId: "brd-asus", model: "ProArt Station PD5" },
    { brandId: "brd-acer", model: "Aspire TC-1780" },
    { brandId: "brd-lenovo", model: "ThinkCentre M70q" },
    { brandId: "brd-msi", model: "MAG Infinite S3" },
  ],
  "cat-monitor": [
    { brandId: "brd-dell", model: "UltraSharp U2723QE" },
    { brandId: "brd-asus", model: "ProArt PA278CV" },
    { brandId: "brd-samsung", model: 'Odyssey G5 27"' },
    { brandId: "brd-acer", model: "Nitro XV272U" },
    { brandId: "brd-msi", model: "Optix MAG274QRF" },
  ],
  "cat-cpu": [
    { brandId: "brd-intel", model: "Core i5-14600K" },
    { brandId: "brd-intel", model: "Core i7-14700K" },
    { brandId: "brd-intel", model: "Core i9-14900K" },
    { brandId: "brd-amd", model: "Ryzen 5 7600X" },
    { brandId: "brd-amd", model: "Ryzen 7 7800X3D" },
    { brandId: "brd-amd", model: "Ryzen 9 7950X" },
  ],
  "cat-gpu": [
    { brandId: "brd-nvidia", model: "GeForce RTX 4060 Ti" },
    { brandId: "brd-nvidia", model: "GeForce RTX 4070 Super" },
    { brandId: "brd-nvidia", model: "GeForce RTX 4080 Super" },
    { brandId: "brd-amd", model: "Radeon RX 7800 XT" },
    { brandId: "brd-asus", model: "TUF RTX 4070 OC" },
    { brandId: "brd-msi", model: "Ventus RTX 4060" },
  ],
  "cat-ram": [
    { brandId: "brd-kingston", model: "Fury Beast DDR5 16GB" },
    { brandId: "brd-corsair", model: "Vengeance RGB DDR5 32GB" },
    { brandId: "brd-kingston", model: "ValueRAM DDR4 8GB" },
    { brandId: "brd-corsair", model: "Dominator Platinum 32GB" },
  ],
  "cat-storage": [
    { brandId: "brd-samsung", model: "980 PRO 1TB NVMe" },
    { brandId: "brd-kingston", model: "NV2 500GB NVMe" },
    { brandId: "brd-corsair", model: "MP600 PRO 2TB" },
    { brandId: "brd-samsung", model: "870 EVO 1TB SATA" },
  ],
  "cat-keyboard": [
    { brandId: "brd-logitech", model: "MX Mechanical Mini" },
    { brandId: "brd-corsair", model: "K70 RGB PRO" },
    { brandId: "brd-msi", model: "Vigor GK50" },
    { brandId: "brd-asus", model: "ROG Azoth" },
    { brandId: "brd-logitech", model: "G Pro X TKL" },
  ],
  "cat-mouse": [
    { brandId: "brd-logitech", model: "G Pro X Superlight 2" },
    { brandId: "brd-logitech", model: "MX Master 3S" },
    { brandId: "brd-corsair", model: "Katar Elite Wireless" },
    { brandId: "brd-asus", model: "ROG Gladius III" },
  ],
  "cat-headset": [
    { brandId: "brd-logitech", model: "G733 Lightspeed" },
    { brandId: "brd-corsair", model: "HS80 RGB Wireless" },
    { brandId: "brd-asus", model: "ROG Delta S" },
    { brandId: "brd-msi", model: "Immerse GH50" },
  ],
  "cat-accessory": [
    { brandId: "brd-corsair", model: "Đế tản nhiệt laptop" },
    { brandId: "brd-kingston", model: "Hub USB-C 7 cổng" },
    { brandId: "brd-logitech", model: 'Túi chống sốc 15.6"' },
    { brandId: "brd-corsair", model: "Bàn di chuột XL" },
    { brandId: "brd-samsung", model: "Giá đỡ màn hình đơn" },
  ],
};

/** Khoảng giá (JPY) theo mặt bằng bán lẻ thị trường Nhật */
const PRICE_RANGE: Record<string, [number, number]> = {
  "cat-laptop": [64_000, 248_000],
  "cat-laptop-gaming": [128_000, 458_000],
  "cat-pc": [72_000, 320_000],
  "cat-monitor": [18_000, 128_000],
  "cat-cpu": [24_000, 118_000],
  "cat-gpu": [48_000, 358_000],
  "cat-ram": [5_000, 32_000],
  "cat-storage": [5_000, 42_000],
  "cat-keyboard": [4_000, 38_000],
  "cat-mouse": [2_000, 22_000],
  "cat-headset": [4_000, 32_000],
  "cat-accessory": [900, 12_000],
};

const CPU_OPTIONS = ["Intel Core i5-13500H", "Intel Core i7-14700HX", "AMD Ryzen 5 7535HS", "AMD Ryzen 7 7840HS", "Apple M3"];
const RAM_OPTIONS = ["8GB DDR4", "16GB DDR5", "32GB DDR5", "64GB DDR5"];
const STORAGE_OPTIONS = ["256GB NVMe", "512GB NVMe", "1TB NVMe", "2TB NVMe"];
/** Chỉ gồm cỡ màn hình laptop — máy để bàn không có màn hình tích hợp */
const SCREEN_OPTIONS = [
  '14" FHD IPS',
  '15.6" FHD 144Hz',
  '16" QHD+ 165Hz',
  '17.3" QHD 240Hz',
];

const STATUS_WEIGHTS: ProductStatus[] = [
  ...Array<ProductStatus>(7).fill("active"),
  ...Array<ProductStatus>(2).fill("draft"),
  "out_of_stock",
];

function generateProducts(count: number): MockProduct[] {
  seedFaker();

  return Array.from({ length: count }, (_, index) => {
    const category = categories[index % categories.length];
    const templates = NAME_TEMPLATES[category.id];
    const { brandId, model } = faker.helpers.arrayElement(templates);
    const brand = brands.find((item) => item.id === brandId) ?? brands[0];
    const [minPrice, maxPrice] = PRICE_RANGE[category.id] ?? [500_000, 5_000_000];

    const price = roundPrice(
      faker.number.int({ min: minPrice, max: maxPrice }),
    );
    const status = faker.helpers.arrayElement(STATUS_WEIGHTS);
    const stock = status === "out_of_stock" ? 0 : faker.number.int({ min: 0, max: 180 });

    const isComputer = ["cat-laptop", "cat-laptop-gaming", "cat-pc"].includes(
      category.id,
    );
    const isLaptop = ["cat-laptop", "cat-laptop-gaming"].includes(category.id);

    return {
      id: `prd-${String(index + 1).padStart(4, "0")}`,
      name: `${brand.name} ${model}`,
      sku: `${brand.slug.toUpperCase().slice(0, 3)}-${category.slug.toUpperCase().slice(0, 3)}-${String(index + 1).padStart(4, "0")}`,
      brandId: brand.id,
      brandName: brand.name,
      categoryId: category.id,
      categoryName: category.name,
      price,
      cost: roundPrice(price * faker.number.float({ min: 0.68, max: 0.86 })),
      stock,
      status,
      specs: isComputer
        ? [
            { label: "CPU", value: faker.helpers.arrayElement(CPU_OPTIONS) },
            { label: "RAM", value: faker.helpers.arrayElement(RAM_OPTIONS) },
            {
              label: "Ổ cứng",
              value: faker.helpers.arrayElement(STORAGE_OPTIONS),
            },
            // Chỉ laptop mới có màn hình tích hợp
            ...(isLaptop
              ? [
                  {
                    label: "Màn hình",
                    value: faker.helpers.arrayElement(SCREEN_OPTIONS),
                  },
                ]
              : []),
            {
              label: "Bảo hành",
              value: `${faker.number.int({ min: 12, max: 36 })} tháng`,
            },
          ]
        : [
            {
              label: "Bảo hành",
              value: `${faker.number.int({ min: 6, max: 24 })} tháng`,
            },
          ],
      // Ảnh mẫu tĩnh trong /public để xem được bố cục gallery khi chưa có backend
      images: Array.from(
        { length: faker.number.int({ min: 1, max: 3 }) },
        (_, imageIndex) =>
          `/products/sample-${((index + imageIndex) % 6) + 1}.svg`,
      ),
      isFeatured: index % 5 === 0,
      shortDescription: `${brand.name} ${model} chính hãng, bảo hành ${faker.number.int({ min: 12, max: 36 })} tháng.`,
      createdAt: faker.date
        .between({ from: "2025-06-01", to: "2026-07-31" })
        .toISOString(),
    } satisfies MockProduct;
  });
}

export const products = generateProducts(72);

/** Bơm lại productCount cho danh mục & thương hiệu để bảng tham chiếu khớp số liệu */
categories.forEach((category) => {
  category.productCount = products.filter(
    (product) => product.categoryId === category.id,
  ).length;
});

brands.forEach((brand) => {
  brand.productCount = products.filter(
    (product) => product.brandId === brand.id,
  ).length;
});

export const productOptions = products.map((product) => ({
  label: `${product.name} (${product.sku})`,
  value: product.id,
}));
