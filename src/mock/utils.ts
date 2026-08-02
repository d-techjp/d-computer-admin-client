import { faker } from "@faker-js/faker/locale/vi";

/**
 * Seed cố định để dữ liệu giả không đổi giữa các lần render/reload — nhờ vậy
 * phân trang và bộ lọc cho kết quả nhất quán khi thao tác.
 */
export function seedFaker(seed = 20260801) {
  faker.seed(seed);
  faker.setDefaultRefDate("2026-08-01T00:00:00.000Z");
}

export { faker };

export function pickOne<T>(items: readonly T[]): T {
  return items[Math.floor(faker.number.float() * items.length) % items.length];
}

/** Ngày ISO ngẫu nhiên trong N ngày gần đây */
export function recentDate(days: number): string {
  return faker.date.recent({ days, refDate: "2026-08-01" }).toISOString();
}

/** Làm tròn giá về bội số 100 yên cho giống giá niêm yết thực tế ở Nhật */
export function roundPrice(value: number): number {
  return Math.round(value / 100) * 100;
}
