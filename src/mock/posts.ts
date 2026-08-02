import { POST_CATEGORIES, type Post, type PostStatus } from "@/types/post";

import { adminUsers } from "./admin-users";
import { faker, seedFaker } from "./utils";

const TITLE_TEMPLATES = [
  "Đánh giá chi tiết {model}: hiệu năng có xứng giá?",
  "Top 5 {topic} đáng mua nhất năm 2026",
  "Hướng dẫn chọn {topic} phù hợp nhu cầu",
  "So sánh {model} và đối thủ cùng tầm giá",
  "{topic} giảm giá đến 30% trong tháng này",
  "Kinh nghiệm nâng cấp {topic} cho máy cũ",
  "Những lỗi thường gặp khi dùng {topic} và cách khắc phục",
];

const TOPICS = ["laptop gaming", "màn hình 2K", "SSD NVMe", "bàn phím cơ", "card đồ hoạ", "chuột không dây", "RAM DDR5"];
const MODELS = ["ROG Strix G16", "MacBook Air M3", "RTX 4070 Super", "Odyssey G5", "MX Master 3S", "Legion 5 Pro"];

const STATUS_WEIGHTS: PostStatus[] = [
  ...Array<PostStatus>(6).fill("published"),
  ...Array<PostStatus>(3).fill("draft"),
  "archived",
];

function slugify(text: string): string {
  return text
    .normalize("NFD")
    // Bỏ dấu tiếng Việt (dải ký tự tổ hợp U+0300–U+036F)
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function generatePosts(count: number): Post[] {
  seedFaker(20260808);

  return Array.from({ length: count }, (_, index) => {
    const title = faker.helpers
      .arrayElement(TITLE_TEMPLATES)
      .replace("{topic}", faker.helpers.arrayElement(TOPICS))
      .replace("{model}", faker.helpers.arrayElement(MODELS));

    const status = faker.helpers.arrayElement(STATUS_WEIGHTS);
    const createdAt = faker.date.between({
      from: "2025-09-01",
      to: "2026-08-01",
    });

    return {
      id: `post-${String(index + 1).padStart(4, "0")}`,
      title,
      slug: `${slugify(title)}-${index + 1}`,
      category: faker.helpers.arrayElement(POST_CATEGORIES),
      author: faker.helpers.arrayElement(adminUsers).name,
      excerpt: faker.lorem.sentence({ min: 12, max: 22 }),
      // Nội dung là HTML vì trình soạn thảo TipTap đọc/ghi ở định dạng này
      content: faker.lorem
        .paragraphs({ min: 3, max: 6 }, "|")
        .split("|")
        .map((paragraph) => `<p>${paragraph}</p>`)
        .join(""),
      status,
      viewCount:
        status === "published" ? faker.number.int({ min: 40, max: 24_000 }) : 0,
      publishedAt: status === "published" ? createdAt.toISOString() : undefined,
      createdAt: createdAt.toISOString(),
    } satisfies Post;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const posts = generatePosts(48);
