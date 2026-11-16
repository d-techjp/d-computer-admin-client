import type { StaticPage, StaticPageStatus } from "@/types/page";

import { apiFetch, type QueryValue } from "./client";
import { compactPayload, parseListResponse, toListQuery, type ApiListParams } from "./pagination";

export interface ListStaticPagesParams extends ApiListParams {
  status?: StaticPageStatus;
}

/** Khớp `CreatePageDto` / `UpdatePageDto` */
export interface StaticPagePayload {
  title?: string;
  slug?: string;
  content?: string;
  status?: StaticPageStatus;
  metaTitle?: string;
  metaDescription?: string;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function toStaticPage(value: unknown): StaticPage {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    id: asString(record.id),
    title: asString(record.title),
    slug: asString(record.slug),
    content: asString(record.content),
    status: asString(record.status, "draft") as StaticPageStatus,
    metaTitle: asString(record.metaTitle) || undefined,
    metaDescription: asString(record.metaDescription) || undefined,
    publishedAt: asString(record.publishedAt) || undefined,
    updatedAt: asString(record.updatedAt, new Date(0).toISOString()),
  };
}

export function listStaticPages(params: ListStaticPagesParams) {
  const query: Record<string, QueryValue> = { ...toListQuery(params), status: params.status };
  return apiFetch<unknown>("/pages", { query }).then((payload) =>
    parseListResponse(payload, toStaticPage, { page: params.page, pageSize: params.limit }),
  );
}

export function fetchStaticPage(id: string) {
  return apiFetch<unknown>(`/pages/${id}`).then(toStaticPage);
}

export function createStaticPage(
  payload: Required<Pick<StaticPagePayload, "title" | "slug" | "content">> & StaticPagePayload,
) {
  return apiFetch<unknown>("/pages", { method: "POST", body: compactPayload(payload) }).then(
    toStaticPage,
  );
}

export function updateStaticPage(id: string, payload: StaticPagePayload) {
  return apiFetch<unknown>(`/pages/${id}`, {
    method: "PATCH",
    body: compactPayload(payload),
  }).then(toStaticPage);
}

export function publishStaticPage(id: string) {
  return apiFetch<unknown>(`/pages/${id}/publish`, { method: "PATCH" }).then(toStaticPage);
}

export function unpublishStaticPage(id: string) {
  return apiFetch<unknown>(`/pages/${id}/unpublish`, { method: "PATCH" }).then(toStaticPage);
}

export function deleteStaticPage(id: string) {
  return apiFetch<void>(`/pages/${id}`, { method: "DELETE" });
}
