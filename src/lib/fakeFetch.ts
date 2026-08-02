import type { Paginated } from "@/types/common";

export interface FakeFetchParams {
  page: number;
  pageSize: number;
}

/** Trả về true nếu bản ghi khớp bộ lọc; bỏ qua filter rỗng/undefined */
export type FilterPredicate<T> = (item: T) => boolean;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Mô phỏng API danh sách: trễ mạng -> lọc -> sắp xếp -> cắt trang.
 * Mọi trang danh sách gọi hàm này thay vì fetch thật; khi có backend chỉ cần
 * thay thân hàm bằng lời gọi HTTP, chữ ký giữ nguyên.
 */
export async function fakeFetchList<T>(
  source: T[],
  params: FakeFetchParams,
  options: {
    filters?: FilterPredicate<T>[];
    sorter?: (a: T, b: T) => number;
  } = {},
): Promise<Paginated<T>> {
  await delay(250 + Math.random() * 250);

  const { filters = [], sorter } = options;

  let rows = source.filter((item) => filters.every((predicate) => predicate(item)));
  if (sorter) rows = [...rows].sort(sorter);

  const start = (params.page - 1) * params.pageSize;

  return {
    data: rows.slice(start, start + params.pageSize),
    total: rows.length,
    page: params.page,
    pageSize: params.pageSize,
  };
}

/** Mô phỏng lấy một bản ghi theo id */
export async function fakeFetchOne<T extends { id: string }>(
  source: T[],
  id: string,
): Promise<T | undefined> {
  await delay(200);
  return source.find((item) => item.id === id);
}

/** Mô phỏng thao tác ghi (tạo/sửa/xoá) — chỉ trả về sau một nhịp trễ */
export async function fakeMutate<T>(payload: T, ms = 500): Promise<T> {
  await delay(ms);
  return payload;
}

/* ---------- Các predicate lọc dùng lại ---------- */

/** Khớp chuỗi không phân biệt hoa thường & dấu cách thừa */
export function matchText<T>(
  keyword: string | undefined,
  pick: (item: T) => string | string[],
): FilterPredicate<T> {
  const needle = keyword?.trim().toLowerCase();
  if (!needle) return () => true;

  return (item) => {
    const value = pick(item);
    const haystack = Array.isArray(value) ? value.join(" ") : value;
    return haystack.toLowerCase().includes(needle);
  };
}

/** Khớp chính xác cho các filter kiểu select */
export function matchEquals<T, V>(
  expected: V | undefined | null,
  pick: (item: T) => V,
): FilterPredicate<T> {
  if (expected === undefined || expected === null || expected === "")
    return () => true;
  return (item) => pick(item) === expected;
}

/** Khớp khi giá trị nằm trong danh sách đã chọn (multi-select) */
export function matchIncludes<T, V>(
  selected: V[] | undefined,
  pick: (item: T) => V,
): FilterPredicate<T> {
  if (!selected?.length) return () => true;
  return (item) => selected.includes(pick(item));
}

/** Khớp ngày nằm trong khoảng [from, to] (chuỗi ISO, bao gồm 2 đầu) */
export function matchDateRange<T>(
  from: string | undefined,
  to: string | undefined,
  pick: (item: T) => string | undefined,
): FilterPredicate<T> {
  if (!from && !to) return () => true;

  return (item) => {
    const raw = pick(item);
    if (!raw) return false;
    const date = raw.slice(0, 10);
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  };
}

/** Khớp số nằm trong khoảng [min, max] */
export function matchNumberRange<T>(
  min: number | undefined,
  max: number | undefined,
  pick: (item: T) => number,
): FilterPredicate<T> {
  if (min === undefined && max === undefined) return () => true;

  return (item) => {
    const value = pick(item);
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  };
}
