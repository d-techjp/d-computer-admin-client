/**
 * `POST /uploads/images` (tag `Uploads`) — trả về URL công khai để gắn vào
 * field `thumbnail` khi tạo/sửa sản phẩm hoặc bài viết. Contract không khai
 * báo schema response nên đọc phòng thủ theo vài tên khoá thường gặp.
 */
import { apiFetch } from "./client";

export type UploadFolder = "products" | "articles";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function toUploadedUrl(value: unknown): string {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  return asString(
    record.url ?? record.imageUrl ?? record.secureUrl ?? record.publicUrl ?? record.path,
  );
}

/** Tải 1 ảnh lên R2, dùng cho ảnh bìa bài viết hoặc thumbnail sản phẩm */
export function uploadImage(file: File, folder: UploadFolder) {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<unknown>("/uploads/images", {
    method: "POST",
    query: { folder },
    body: formData,
  }).then(toUploadedUrl);
}
