/** Trang tĩnh storefront (`/{slug}`) — khớp entity `Page` của backend. */
export type StaticPageStatus = "draft" | "published";

export interface StaticPage {
  id: string;
  title: string;
  slug: string;
  /** HTML từ TipTap — danh sách (`GET /pages`) không trả field này */
  content: string;
  status: StaticPageStatus;
  metaTitle?: string;
  metaDescription?: string;
  publishedAt?: string;
  updatedAt: string;
}

export const STATIC_PAGE_STATUS_LABEL: Record<StaticPageStatus, string> = {
  draft: "Nháp",
  published: "Đã xuất bản",
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "";

/** Link mở trang trên storefront; không cấu hình site URL thì trả đường dẫn tương đối. */
export function staticPageUrl(slug: string) {
  return `${SITE_URL}/${slug}`;
}
