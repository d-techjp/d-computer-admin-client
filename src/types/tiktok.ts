/**
 * Video TikTok của campaign — danh sách link gắn tay hiển thị trên storefront.
 * Khác `Carousel` ở chỗ nội dung không sinh từ bộ lọc, nên thứ tự (`sortOrder`)
 * do người vận hành kéo-thả quyết định.
 */
export interface TiktokVideo {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Khớp `TIKTOK_URL_RULE` phía backend — chặn sớm ở form thay vì đợi 400. */
export const TIKTOK_URL_PATTERN = /^https:\/\/([a-z0-9-]+\.)*tiktok\.com\/.+/i;
