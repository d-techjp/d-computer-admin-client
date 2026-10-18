"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { App, Descriptions, Empty, Skeleton } from "antd";
import dayjs from "dayjs";

import {
  CustomerStatusTag,
  CustomerTierTag,
  OrderStatusTag,
} from "@/components/common/StatusTag";
import routes from "@/config/routes";
import { listOrders } from "@/lib/api/orders";
import { fetchCustomerOrderStats } from "@/lib/api/users";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Customer, CustomerOrderStats } from "@/types/customer";
import type { Order } from "@/types/order";

const RECENT_ORDER_LIMIT = 5;

function formatDate(value?: string) {
  return value ? dayjs(value).format("DD/MM/YYYY") : "—";
}

/**
 * Chi tiết khách trong drawer. Số liệu mua hàng chỉ tổng hợp lúc mở — danh sách
 * khách không gánh phần tính toán này cho mọi dòng.
 */
export function CustomerDetail({ customer }: { customer: Customer }) {
  const { message } = App.useApp();
  const [stats, setStats] = useState<CustomerOrderStats>();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchCustomerOrderStats(customer.id),
      listOrders({
        userId: customer.id,
        page: 1,
        limit: RECENT_ORDER_LIMIT,
        sortBy: "createdAt",
        sortOrder: "DESC",
      }),
    ])
      .then(([nextStats, orders]) => {
        if (cancelled) return;
        setStats(nextStats);
        setRecentOrders(orders.data);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          message.error(
            error instanceof Error
              ? error.message
              : "Không tải được số liệu mua hàng",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customer.id, message]);

  return (
    <div className="flex flex-col gap-5">
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Username">
          {customer.username}
        </Descriptions.Item>
        <Descriptions.Item label="Email">
          {customer.email ?? "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Điện thoại">
          {customer.phone ?? "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Địa chỉ">
          {customer.address ?? "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Hạng">
          <CustomerTierTag tier={customer.tier} />
        </Descriptions.Item>
        <Descriptions.Item label="Trạng thái">
          <CustomerStatusTag status={customer.status} />
        </Descriptions.Item>
        <Descriptions.Item label="Ngày tham gia">
          {formatDate(customer.createdAt)}
        </Descriptions.Item>
      </Descriptions>

      <section className="flex flex-col gap-3">
        <h3 className="text-fg font-semibold">Mua hàng</h3>
        {loading || !stats ? (
          <Skeleton active paragraph={{ rows: 3 }} title={false} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Metric
                label="Tổng chi tiêu"
                value={formatCurrency(stats.totalSpent)}
                strong
              />
              <Metric
                label="Giá trị TB / đơn"
                value={formatCurrency(stats.averageOrderValue)}
              />
              <Metric
                label="Số đơn đã đặt"
                value={formatNumber(stats.orderCount)}
                hint={`${formatNumber(stats.completedCount)} hoàn tất · ${formatNumber(
                  stats.cancelledCount,
                )} huỷ`}
              />
              <Metric
                label="Đơn gần nhất"
                value={formatDate(stats.lastOrderAt)}
                hint={
                  stats.firstOrderAt
                    ? `Đơn đầu tiên ${formatDate(stats.firstOrderAt)}`
                    : undefined
                }
              />
            </div>
            <span className="text-muted text-xs">
              Chi tiêu chỉ tính đơn đã hoàn tất, không gồm đơn đang xử lý, đã
              huỷ hoặc hoàn tiền.
            </span>
          </>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-fg font-semibold">Đơn gần đây</h3>
        {loading ? (
          <Skeleton active paragraph={{ rows: 3 }} title={false} />
        ) : recentOrders.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có đơn hàng"
          />
        ) : (
          <div className="divide-line border-line divide-y rounded-lg border">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={routes.orders.detail(order.id)}
                className="hover:bg-row-hover flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-brand font-medium whitespace-nowrap">
                    {order.code}
                  </div>
                  <div className="text-muted text-xs">
                    {dayjs(order.createdAt).format("HH:mm DD/MM/YYYY")}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-fg font-semibold">
                    {formatCurrency(order.total)}
                  </span>
                  <OrderStatusTag status={order.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div className="bg-subtle rounded-lg p-3">
      <div className="text-muted text-xs">{label}</div>
      <div
        className={
          strong
            ? "text-brand text-lg font-bold"
            : "text-fg text-lg font-semibold"
        }
      >
        {value}
      </div>
      {hint && <div className="text-muted text-xs">{hint}</div>}
    </div>
  );
}
