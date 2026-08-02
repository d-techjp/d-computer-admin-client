import type { Customer, CustomerStatus, CustomerTier } from "@/types/customer";

import { faker, roundPrice, seedFaker } from "./utils";

const STATUS_WEIGHTS: CustomerStatus[] = [
  ...Array<CustomerStatus>(8).fill("active"),
  "inactive",
  "blocked",
];

/**
 * Ngưỡng xếp hạng theo tổng chi tiêu (JPY). Đặt cao dần sao cho hạng càng cao
 * càng hiếm — chi tiêu cao nhất trong tập mẫu vào khoảng ¥5-6 triệu.
 */
function tierOf(totalSpent: number): CustomerTier {
  if (totalSpent >= 3_500_000) return "diamond";
  if (totalSpent >= 1_800_000) return "gold";
  if (totalSpent >= 600_000) return "silver";
  return "normal";
}

function generateCustomers(count: number): Customer[] {
  seedFaker(20260802);

  return Array.from({ length: count }, (_, index) => {
    const name = faker.person.fullName();
    const totalOrders = faker.number.int({ min: 0, max: 42 });
    const totalSpent =
      totalOrders === 0
        ? 0
        : roundPrice(
            totalOrders * faker.number.int({ min: 12_000, max: 145_000 }),
          );

    return {
      id: `cus-${String(index + 1).padStart(4, "0")}`,
      name,
      email: faker.internet
        .email({ firstName: `user${index + 1}` })
        .toLowerCase(),
      phone: `0${faker.number.int({ min: 300_000_000, max: 989_999_999 })}`,
      address: `${faker.location.streetAddress()}, ${faker.location.city()}`,
      tier: tierOf(totalSpent),
      totalOrders,
      totalSpent,
      status: faker.helpers.arrayElement(STATUS_WEIGHTS),
      createdAt: faker.date
        .between({ from: "2024-01-01", to: "2026-07-31" })
        .toISOString(),
    } satisfies Customer;
  });
}

export const customers = generateCustomers(86);
