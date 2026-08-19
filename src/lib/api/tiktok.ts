/**
 * Video TikTok của campaign — CRUD phía admin (tag `Admin - TikTok Videos`).
 *
 * Endpoint public `GET /tiktok-videos` không có ở đây: đó là API cho storefront,
 * admin luôn cần thấy cả video đã tắt nên dùng đường `/admin/tiktok-videos`.
 */
import type { TiktokVideo } from "@/types/tiktok";

import { apiFetch } from "./client";
import { compactPayload, parseListResponse, toListQuery, type ApiListParams } from "./pagination";
import { asBoolean, asIsoDate, asNumber, asOptionalString, asRecord, asString } from "./parse";

export interface TiktokVideoPayload {
  videoUrl?: string;
  /** `null` = xoá giá trị cũ; bỏ trống (`undefined`) = giữ nguyên. `compactPayload` chỉ lọc `undefined`/`""`. */
  thumbnailUrl?: string | null;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export function toTiktokVideo(value: unknown): TiktokVideo {
  const record = asRecord(value);

  return {
    id: asString(record.id),
    videoUrl: asString(record.videoUrl),
    thumbnailUrl: asOptionalString(record.thumbnailUrl),
    description: asOptionalString(record.description),
    sortOrder: asNumber(record.sortOrder),
    isActive: asBoolean(record.isActive, true),
    createdAt: asIsoDate(record.createdAt ?? record.created_at),
    updatedAt: asIsoDate(record.updatedAt ?? record.updated_at),
  };
}

export interface ListTiktokVideosParams extends ApiListParams {
  isActive?: boolean;
}

export function listTiktokVideos(params: ListTiktokVideosParams) {
  return apiFetch<unknown>("/tiktok-videos", {
    query: { ...toListQuery(params), isActive: params.isActive },
  }).then((payload) =>
    parseListResponse(payload, toTiktokVideo, { page: params.page, pageSize: params.limit }),
  );
}

export function createTiktokVideo(
  payload: Required<Pick<TiktokVideoPayload, "videoUrl">> & TiktokVideoPayload,
) {
  return apiFetch<unknown>("/tiktok-videos", {
    method: "POST",
    body: compactPayload(payload),
  }).then(toTiktokVideo);
}

export function updateTiktokVideo(id: string, payload: TiktokVideoPayload) {
  return apiFetch<unknown>(`/tiktok-videos/${id}`, {
    method: "PATCH",
    body: compactPayload(payload),
  }).then(toTiktokVideo);
}

export function deleteTiktokVideo(id: string) {
  return apiFetch<void>(`/tiktok-videos/${id}`, { method: "DELETE" });
}

export function reorderTiktokVideos(items: { id: string; sortOrder: number }[]) {
  return apiFetch<void>("/tiktok-videos/reorder", {
    method: "POST",
    body: { items },
  });
}
