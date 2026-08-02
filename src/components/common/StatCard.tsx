"use client";

import { Skeleton } from "antd";
import { TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  /** % thay đổi so với kỳ trước; direction quyết định màu và mũi tên */
  trend?: { value: number; direction: "up" | "down" };
  hint?: string;
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  hint,
  loading,
}: StatCardProps) {
  return (
    <div className="bg-card border-line shadow-card rounded-lg border p-4">
      {loading ? (
        <Skeleton active paragraph={{ rows: 1 }} title={{ width: "60%" }} />
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted text-sm font-medium">{title}</span>
            {icon && (
              <span className="text-brand bg-brand/10 rounded-md p-2">
                {icon}
              </span>
            )}
          </div>

          <div className="text-fg mt-2 text-2xl font-bold tracking-tight">
            {value}
          </div>

          <div className="mt-1 flex items-center gap-2 text-xs">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-semibold",
                  trend.direction === "up" ? "text-success" : "text-danger",
                )}
              >
                {trend.direction === "up" ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                {trend.value}%
              </span>
            )}
            {hint && <span className="text-muted">{hint}</span>}
          </div>
        </>
      )}
    </div>
  );
}

export default StatCard;
