import type { StockItem } from "@/types/warehouse";

import { products } from "./products";
import { faker, seedFaker } from "./utils";

const LOCATIONS = ["A1-01", "A1-02", "A2-05", "B1-03", "B2-07", "C1-01", "C3-12", "D2-04"];

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

export const stockItems = generateStockItems();
