import type { Post, PostStatus } from "@/types/post";

import { apiFetch, type QueryValue } from "./client";
import {
  compactPayload,
  parseListResponse,
  toListQuery,
  type ApiListParams,
  type ApiListResult,
} from "./pagination";

export interface ListPostsParams extends ApiListParams {
  status?: PostStatus;
  categoryId?: string;
  authorId?: string;
  tag?: string;
}

/** Khớp field của `CreateArticleDto` / `UpdateArticleDto` */
export interface PostPayload {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  thumbnail?: string;
  status?: PostStatus;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  categoryId?: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function toPost(value: unknown): Post {
  const record = asRecord(value);
  const category = asRecord(record.category);
  const author = asRecord(record.author);

  return {
    id: asString(record.id),
    title: asString(record.title),
    slug: asString(record.slug),
    category: asString(record.categoryName ?? category.name),
    categoryId: asString(record.categoryId ?? category.id) || undefined,
    author: asString(record.authorName ?? author.fullName ?? author.name),
    excerpt: asString(record.excerpt),
    content: asString(record.content),
    coverImage: asString(record.thumbnail) || undefined,
    status: asString(record.status, "draft") as PostStatus,
    tags: asStringArray(record.tags),
    metaTitle: asString(record.metaTitle) || undefined,
    metaDescription: asString(record.metaDescription) || undefined,
    viewCount: asNumber(record.viewCount),
    publishedAt: asString(record.publishedAt) || undefined,
    createdAt: asString(record.createdAt ?? record.created_at, new Date(0).toISOString()),
  };
}

/** GET /articles/manage — mọi trạng thái (quản trị), khác /articles (chỉ published, public) */
export function listPosts(params: ListPostsParams) {
  const query: Record<string, QueryValue> = {
    ...toListQuery(params),
    status: params.status,
    categoryId: params.categoryId,
    authorId: params.authorId,
    tag: params.tag,
  };

  return apiFetch<unknown>("/articles", { query }).then((payload) =>
    parseListResponse(payload, toPost, { page: params.page, pageSize: params.limit }),
  );
}

export function fetchPost(id: string) {
  return apiFetch<unknown>(`/articles/${id}`).then(toPost);
}

export function createPost(payload: Required<Pick<PostPayload, "title" | "content">> & PostPayload) {
  return apiFetch<unknown>("/articles", {
    method: "POST",
    body: compactPayload(payload),
  }).then(toPost);
}

export function updatePost(id: string, payload: PostPayload) {
  return apiFetch<unknown>(`/articles/${id}`, {
    method: "PATCH",
    body: compactPayload(payload),
  }).then(toPost);
}

export function deletePost(id: string) {
  return apiFetch<void>(`/articles/${id}`, { method: "DELETE" });
}

/** PATCH /articles/{id}/publish — chuyển trạng thái sang published */
export function publishPost(id: string) {
  return apiFetch<unknown>(`/articles/${id}/publish`, { method: "PATCH" }).then(toPost);
}

/** PATCH /articles/{id}/unpublish — gỡ xuất bản, đưa về draft */
export function unpublishPost(id: string) {
  return apiFetch<unknown>(`/articles/${id}/unpublish`, { method: "PATCH" }).then(toPost);
}

export function toPostListResult(payload: unknown, fallback: { page: number; pageSize: number }) {
  return parseListResponse(payload, toPost, fallback) satisfies ApiListResult<Post>;
}
