"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Ghi các filter đang áp dụng lên URL query string để có thể share/bookmark/
 * redirect từ trang khác, và để nút Back/Forward của trình duyệt hoạt động
 * đúng — trang gọi hook này tự đọc lại `searchParams` (reactive) để suy ra
 * state hiện tại, hook chỉ lo phần ghi.
 */
export function useUrlSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /** Ghi đè các key được truyền; value undefined/"" thì bị xoá khỏi query */
  const write = useCallback(
    (patch: Record<string, string | undefined>) => {
      const qs = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === "") qs.delete(key);
        else qs.set(key, value);
      });
      const query = qs.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { searchParams, write };
}

export default useUrlSearchParams;
