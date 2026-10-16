"use client";

import Link from "next/link";
import dayjs from "dayjs";

import { OrderStatusTag } from "@/components/common/StatusTag";
import routes from "@/config/routes";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/types/order";

import { DashboardPanel } from "./DashboardPanel";

/**
 * Bảng 4 cột trong một ô hẹp từng phải cuộn ngang và bẻ đôi mã đơn. Mỗi đơn
 * giờ là 2 dòng: mã đơn + tổng tiền ở trên, khách + thời gian + trạng thái ở
 * dưới — đủ thông tin mà không cần cuộn ở bất kỳ độ rộng nào.
 */
export function RecentOrdersPanel({
  orders,
  limit,
  loading,
  className,
}: {
  orders: Order[];
  limit: number;
  loading?: boolean;
  className?: string;
}) {
  return (
    <DashboardPanel
      title="Đơn hàng gần đây"
      description={`${limit} đơn mới nhất trên toàn hệ thống`}
      extra={
        <Link href={routes.orders.index} className="text-brand text-xs font-medium">
          Xem tất cả →
        </Link>
      }
      loading={loading}
      isEmpty={orders.length === 0}
      emptyText="Chưa có đơn hàng nào"
      skeletonRows={limit}
      className={className}
    >
      <ul className="divide-line divide-y">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              href={routes.orders.detail(order.id)}
              className="hover:bg-row-hover -mx-2 block rounded-md px-2 py-2.5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-brand truncate text-sm font-medium">{order.code}</span>
                <span className="text-fg shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(order.total)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-muted min-w-0 truncate text-xs">
                  {order.customerName || "Khách vãng lai"} ·{" "}
                  {dayjs(order.createdAt).format("HH:mm DD/MM")}
                </span>
                <span className="shrink-0 [&_.ant-tag]:me-0">
                  <OrderStatusTag status={order.status} />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </DashboardPanel>
  );
}
