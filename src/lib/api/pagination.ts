import type { QueryValue } from "./client";

export interface ApiListParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface ApiListResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function toListQuery(params: ApiListParams): Record<string, QueryValue> {
  return {
    page: params.page,
    limit: params.limit,
    search: params.search,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function findRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  const record = asRecord(payload);
  if (!record) return [];

  for (const key of ["data", "items", "rows", "results"]) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }

  return [];
}

export function parseListResponse<T>(
  payload: unknown,
  mapper: (item: unknown) => T,
  fallback: { page: number; pageSize: number },
): ApiListResult<T> {
  const record = asRecord(payload);
  const rows = findRows(payload).map(mapper);
  const meta = asRecord(record?.meta) ?? asRecord(record?.pagination);

  return {
    data: rows,
    total: asNumber(record?.total ?? meta?.total ?? meta?.totalItems, rows.length),
    page: asNumber(record?.page ?? meta?.page ?? meta?.currentPage, fallback.page),
    pageSize: asNumber(
      record?.pageSize ?? record?.limit ?? meta?.pageSize ?? meta?.limit ?? meta?.itemsPerPage,
      fallback.pageSize,
    ),
  };
}

export function compactPayload<T extends object>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== ""),
  ) as Partial<T>;
}
