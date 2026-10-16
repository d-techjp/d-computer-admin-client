"use client";

import { Empty, Skeleton } from "antd";

import { cn } from "@/lib/utils";

interface DashboardPanelProps {
  title: string;
  description?: string;
  extra?: React.ReactNode;
  loading?: boolean;
  isEmpty?: boolean;
  emptyText?: string;
  /** Số dòng skeleton khi tải lần đầu — khớp số dòng thật để layout không nhảy */
  skeletonRows?: number;
  className?: string;
  children: React.ReactNode;
}

/**
 * Khung cho các khối dạng danh sách trên dashboard. Khác `ChartWrapper` ở chỗ
 * nội dung bám đầu khung (không căn giữa theo chiều cao cố định) và giãn hết
 * chiều cao ô lưới, để hai khối cạnh nhau luôn cao bằng nhau.
 */
export function DashboardPanel({
  title,
  description,
  extra,
  loading,
  isEmpty,
  emptyText = "Chưa có dữ liệu trong khoảng thời gian này",
  skeletonRows = 5,
  className,
  children,
}: DashboardPanelProps) {
  return (
    <section
      className={cn(
        "bg-card border-line shadow-card flex h-full flex-col rounded-lg border p-4",
        className,
      )}
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-fg text-base font-semibold">{title}</h3>
          {description && <p className="text-muted mt-0.5 text-xs">{description}</p>}
        </div>
        {extra}
      </header>

      <div className="flex-1">
        {loading && isEmpty ? (
          <Skeleton active title={false} paragraph={{ rows: skeletonRows }} />
        ) : isEmpty ? (
          <div className="flex h-full min-h-48 items-center justify-center">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
          </div>
        ) : (
          // Tải lại thì giữ dữ liệu cũ ở độ mờ thấp, không nháy skeleton
          <div className={cn("transition-opacity", loading && "pointer-events-none opacity-40")}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
