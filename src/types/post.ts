export type PostStatus = "draft" | "published" | "archived";

export interface Post {
  id: string;
  title: string;
  slug: string;
  category: string;
  /** Liên kết tới `Category` thật (bảng chung với sản phẩm) — trống nếu chưa gắn danh mục */
  categoryId?: string;
  author: string;
  excerpt: string;
  /** Nội dung dạng HTML do trình soạn thảo TipTap sinh ra */
  content: string;
  /** Ảnh bìa hiển thị ở danh sách bài viết và khi chia sẻ */
  coverImage?: string;
  status: PostStatus;
  tags?: string[];
  /** SEO — hiển thị ở thẻ <title>/<meta description> khi chia sẻ bài viết */
  metaTitle?: string;
  metaDescription?: string;
  viewCount: number;
  publishedAt?: string;
  createdAt: string;
}

export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  draft: "Bản nháp",
  published: "Đã đăng",
  archived: "Lưu trữ",
};

export const POST_CATEGORIES = [
  "Tin công nghệ",
  "Đánh giá sản phẩm",
  "Hướng dẫn",
  "Khuyến mãi",
  "Tuyển dụng",
] as const;
