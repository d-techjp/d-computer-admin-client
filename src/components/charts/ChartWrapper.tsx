"use client";

import { Empty, Spin } from "antd";

import { cn } from "@/lib/utils";

export interface ChartWrapperProps {
  title: string;
  description?: string;
  loading?: boolean;
  isEmpty?: boolean;
  height?: number;
  /** Slot phải của tiêu đề (bộ lọc nhỏ, nút xem bảng...) */
  extra?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * Vỏ chung cho mọi biểu đồ: tiêu đề, trạng thái loading, trạng thái rỗng và
 * chiều cao cố định — đúng vai trò ChartWrapper của bản gốc.
 * Container cao hơn plot để chừa chỗ cho nhãn trục, tránh sinh scroll con.
 */
export function ChartWrapper({
  title,
  description,
  loading,
  isEmpty,
  height = 320,
  extra,
  className,
  children,
}: ChartWrapperProps) {
  return (
    <section
      className={cn(
        "bg-card border-line shadow-card rounded-lg border p-4",
        className,
      )}
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-fg text-base font-semibold">{title}</h3>
          {description && (
            <p className="text-muted mt-0.5 text-xs">{description}</p>
          )}
        </div>
        {extra}
      </header>

      <div
        className="relative flex items-center justify-center"
        style={{ minHeight: height }}
      >
        {isEmpty && !loading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có dữ liệu trong khoảng thời gian này"
          />
        ) : (
          // Giữ nguyên bản vẽ cũ ở độ mờ thấp khi tải lại, không nháy skeleton
          <div
            className={cn(
              "w-full transition-opacity",
              loading && "pointer-events-none opacity-40",
            )}
          >
            {children}
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spin />
          </div>
        )}
      </div>
    </section>
  );
}

export default ChartWrapper;
