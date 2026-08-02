"use client";

import { Button } from "antd";
import { RotateCcw, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SearchFilterBarProps {
  /** Các field lọc, xếp theo grid responsive */
  children: React.ReactNode;
  onSearch: () => void;
  onReset: () => void;
  loading?: boolean;
  className?: string;
}

/**
 * Khung chứa các field lọc + cụm nút Tìm kiếm / Đặt lại — tương ứng
 * ButtonSearchGroup của bản gốc, nhưng gộp luôn phần layout grid để mỗi
 * trang danh sách không phải tự dựng Row/Col.
 */
export function SearchFilterBar({
  children,
  onSearch,
  onReset,
  loading,
  className,
}: SearchFilterBarProps) {
  return (
    <form
      className={cn(
        "bg-card border-line shadow-card mb-4 rounded-lg border p-4",
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {children}
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          icon={<RotateCcw size={16} />}
          onClick={onReset}
          disabled={loading}
        >
          Đặt lại
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          icon={<Search size={16} />}
          loading={loading}
        >
          Tìm kiếm
        </Button>
      </div>
    </form>
  );
}

export default SearchFilterBar;
