import type { StockItem, StockMovement, StockMovementType } from "@/types/warehouse";

import { adminUsers } from "./admin-users";
import { products } from "./products";
import { faker, seedFaker } from "./utils";

const LOCATIONS = ["A1-01", "A1-02", "A2-05", "B1-03", "B2-07", "C1-01", "C3-12", "D2-04"];

const SUPPLIERS = [
  "Công ty TNHH Phân phối Synnex FPT",
  "Digiworld Corporation",
  "Petrosetco Distribution",
  "Viettel Distribution",
  "Nhập khẩu trực tiếp",
];

const OUT_REASONS = [
  "Xuất bán theo đơn hàng",
  "Xuất bảo hành",
  "Xuất trả nhà cung cấp",
  "Xuất huỷ hàng lỗi",
  "Chuyển kho chi nhánh",
];

function generateStockItems(): StockItem[] {
  seedFaker(20260805);

  return products.map((product, index) => {
    const quantity = product.stock;
    const reserved = quantity === 0 ? 0 : faker.number.int({ min: 0, max: Math.min(12, quantity) });

    return {
      id: `stk-${String(index + 1).padStart(4, "0")}`,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      categoryName: product.categoryName,
      location: faker.helpers.arrayElement(LOCATIONS),
      quantity,
      reserved,
      available: quantity - reserved,
      reorderPoint: faker.number.int({ min: 5, max: 20 }),
      updatedAt: faker.date
        .recent({ days: 45, refDate: "2026-08-01" })
        .toISOString(),
    } satisfies StockItem;
  });
}

function generateMovements(count: number, type: StockMovementType): StockMovement[] {
  seedFaker(type === "in" ? 20260806 : 20260807);

  const prefix = type === "in" ? "PN" : "PX";

  return Array.from({ length: count }, (_, index) => {
    const product = faker.helpers.arrayElement(products);
    const createdAt = faker.date.between({
      from: "2026-03-01",
      to: "2026-08-01",
    });

    return {
      id: `${type}-${String(index + 1).padStart(4, "0")}`,
      code: `${prefix}${createdAt.getFullYear()}${String(index + 1).padStart(4, "0")}`,
      type,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: faker.number.int({ min: 1, max: type === "in" ? 60 : 15 }),
      partner:
        type === "in"
          ? faker.helpers.arrayElement(SUPPLIERS)
          : faker.helpers.arrayElement(OUT_REASONS),
      note: "",
      createdBy: faker.helpers.arrayElement(adminUsers).name,
      createdAt: createdAt.toISOString(),
    } satisfies StockMovement;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const stockItems = generateStockItems();
export const stockInMovements = generateMovements(64, "in");
export const stockOutMovements = generateMovements(58, "out");
