import dayjs from "dayjs";

import { customers } from "@/mock/customers";
import { orders } from "@/mock/orders";
import { stockItems } from "@/mock/warehouse";
import { ORDER_STATUS_LABEL, type Order, type OrderStatus } from "@/types/order";
import { stockLevelOf } from "@/types/warehouse";

/** Đơn đã huỷ không tính vào doanh thu */
const REVENUE_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipping",
  "completed",
];

function inRange(order: Order, from: string, to: string) {
  const date = order.createdAt.slice(0, 10);
  return date >= from && date <= to;
}

export interface DashboardSummary {
  revenue: number;
  revenueTrend: number;
  orderCount: number;
  orderTrend: number;
  customerCount: number;
  customerTrend: number;
  lowStockCount: number;
}

/** Tính % thay đổi so với kỳ liền trước cùng độ dài */
function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function buildSummary(from: string, to: string): DashboardSummary {
  const days = dayjs(to).diff(dayjs(from), "day") + 1;
  const prevFrom = dayjs(from).subtract(days, "day").format("YYYY-MM-DD");
  const prevTo = dayjs(from).subtract(1, "day").format("YYYY-MM-DD");

  const current = orders.filter((order) => inRange(order, from, to));
  const previous = orders.filter((order) => inRange(order, prevFrom, prevTo));

  const revenueOf = (list: Order[]) =>
    list
      .filter((order) => REVENUE_STATUSES.includes(order.status))
      .reduce((sum, order) => sum + order.total, 0);

  const newCustomers = customers.filter((customer) => {
    const date = customer.createdAt.slice(0, 10);
    return date >= from && date <= to;
  }).length;

  const prevCustomers = customers.filter((customer) => {
    const date = customer.createdAt.slice(0, 10);
    return date >= prevFrom && date <= prevTo;
  }).length;

  return {
    revenue: revenueOf(current),
    revenueTrend: percentChange(revenueOf(current), revenueOf(previous)),
    orderCount: current.length,
    orderTrend: percentChange(current.length, previous.length),
    customerCount: newCustomers,
    customerTrend: percentChange(newCustomers, prevCustomers),
    lowStockCount: stockItems.filter(
      (item) => stockLevelOf(item) !== "in_stock",
    ).length,
  };
}

/** Doanh thu và số đơn theo từng ngày trong khoảng — hai chart riêng, một trục mỗi chart */
export function buildRevenueSeries(from: string, to: string) {
  const start = dayjs(from);
  const days = dayjs(to).diff(start, "day") + 1;

  const buckets = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < days; i += 1) {
    buckets.set(start.add(i, "day").format("YYYY-MM-DD"), {
      revenue: 0,
      orders: 0,
    });
  }

  orders.forEach((order) => {
    const key = order.createdAt.slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) return;
    bucket.orders += 1;
    if (REVENUE_STATUSES.includes(order.status)) bucket.revenue += order.total;
  });

  const entries = [...buckets.entries()];

  return {
    categories: entries.map(([date]) => dayjs(date).format("DD/MM")),
    revenue: entries.map(([, value]) => value.revenue),
    orders: entries.map(([, value]) => value.orders),
  };
}

/** Phân bố trạng thái đơn hàng cho biểu đồ donut */
export function buildStatusBreakdown(from: string, to: string) {
  const counts = new Map<OrderStatus, number>();
  (Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).forEach((status) =>
    counts.set(status, 0),
  );

  orders
    .filter((order) => inRange(order, from, to))
    .forEach((order) =>
      counts.set(order.status, (counts.get(order.status) ?? 0) + 1),
    );

  const entries = [...counts.entries()];

  return {
    statuses: entries.map(([status]) => status),
    labels: entries.map(([status]) => ORDER_STATUS_LABEL[status]),
    series: entries.map(([, count]) => count),
  };
}

/** Top sản phẩm theo doanh thu trong khoảng thời gian */
export function buildTopProducts(from: string, to: string, limit = 8) {
  const revenueByProduct = new Map<string, { name: string; revenue: number }>();

  orders
    .filter(
      (order) => inRange(order, from, to) && order.status !== "cancelled",
    )
    .forEach((order) =>
      order.items.forEach((item) => {
        const productKey = item.productId ?? item.variantId ?? item.sku;
        const current = revenueByProduct.get(productKey) ?? {
          name: item.productName,
          revenue: 0,
        };
        current.revenue += item.total;
        revenueByProduct.set(productKey, current);
      }),
    );

  const top = [...revenueByProduct.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);

  return {
    categories: top.map((item) => item.name),
    values: top.map((item) => item.revenue),
  };
}
