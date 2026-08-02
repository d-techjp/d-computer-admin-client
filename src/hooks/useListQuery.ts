"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fakeFetchList, type FilterPredicate } from "@/lib/fakeFetch";
import { DEFAULT_PAGE_SIZE } from "@/types/common";

interface UseListQueryOptions<T, F> {
  source: T[];
  initialFilters: F;
  /** Dựng danh sách predicate từ bộ lọc đã áp dụng */
  buildFilters: (filters: F) => FilterPredicate<T>[];
  sorter?: (a: T, b: T) => number;
  pageSize?: number;
}

interface QueryResult<T> {
  key: string;
  rows: T[];
  total: number;
}

/**
 * Gom logic lặp lại của mọi trang danh sách: giữ page/pageSize/tổng số dòng,
 * tách bộ lọc "đang nhập" khỏi bộ lọc "đã áp dụng" (chỉ chạy khi bấm Tìm kiếm),
 * và gọi fakeFetchList mỗi khi một trong số đó đổi.
 *
 * Bản gốc rải logic này trong từng container; gom lại một chỗ để các trang mới
 * chỉ cần khai báo cột + field lọc.
 */
export function useListQuery<T, F extends object>({
  source,
  initialFilters,
  buildFilters,
  sorter,
  pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
}: UseListQueryOptions<T, F>) {
  // Chốt bộ lọc mặc định ở lần render đầu để nút "Đặt lại" luôn về đúng giá trị
  const [defaultFilters] = useState(initialFilters);

  const [draftFilters, setDraftFilters] = useState<F>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<F>(defaultFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const [result, setResult] = useState<QueryResult<T>>({
    key: "",
    rows: [],
    total: 0,
  });

  /**
   * Khoá định danh cho một lần truy vấn. Trạng thái loading được suy ra từ việc
   * kết quả đang giữ có khớp khoá hiện tại hay không, nên không cần setState
   * đồng bộ trong effect (tránh render dây chuyền).
   */
  const requestKey = useMemo(
    () => JSON.stringify({ page, pageSize, filters: appliedFilters }),
    [page, pageSize, appliedFilters],
  );

  // Hai hàm này thường được truyền dạng inline nên đồng bộ qua ref (ghi trong
  // effect, không ghi lúc render) để chúng không kích hoạt lại truy vấn.
  const callbacksRef = useRef({ buildFilters, sorter });
  useEffect(() => {
    callbacksRef.current = { buildFilters, sorter };
  });

  useEffect(() => {
    let cancelled = false;

    fakeFetchList(
      source,
      { page, pageSize },
      {
        filters: callbacksRef.current.buildFilters(appliedFilters),
        sorter: callbacksRef.current.sorter,
      },
    ).then((response) => {
      if (cancelled) return;
      setResult({ key: requestKey, rows: response.data, total: response.total });
    });

    return () => {
      cancelled = true;
    };
  }, [source, page, pageSize, appliedFilters, requestKey]);

  const search = useCallback(() => {
    setPage(1);
    setAppliedFilters({ ...draftFilters });
  }, [draftFilters]);

  const reset = useCallback(() => {
    setPage(1);
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  }, [defaultFilters]);

  const onPageChange = useCallback((nextPage: number, nextPageSize: number) => {
    setPage(nextPage);
    setPageSize(nextPageSize);
  }, []);

  /** Cập nhật một phần bộ lọc đang nhập */
  const patchFilters = useCallback((patch: Partial<F>) => {
    setDraftFilters((current) => ({ ...current, ...patch }));
  }, []);

  return {
    rows: result.rows,
    total: result.total,
    loading: result.key !== requestKey,
    page,
    pageSize,
    filters: draftFilters,
    patchFilters,
    setFilters: setDraftFilters,
    search,
    reset,
    onPageChange,
    pagination: { current: page, pageSize, total: result.total, onChange: onPageChange },
  };
}
