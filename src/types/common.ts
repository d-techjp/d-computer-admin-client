/** Kết quả trả về của mọi API danh sách (mock) */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginationState {
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100"];

/** Khoảng ngày dạng chuỗi ISO — dùng chung cho các filter thời gian */
export interface DateRangeValue {
  from?: string;
  to?: string;
}

export interface SelectOption<T = string> {
  label: string;
  value: T;
}
