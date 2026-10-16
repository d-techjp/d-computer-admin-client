import { ORDER_STATUS_LABEL, type OrderStatus } from "@/types/order";
import type {
  DashboardMetric,
  DashboardOverview,
  DashboardRevenuePoint,
  DashboardStatusSlice,
  DashboardTopProduct,
} from "@/types/dashboard";

import { apiFetch } from "./client";
import {
  asArray,
  asEnum,
  asNumber,
  asOptionalString,
  asRecord,
  asString,
} from "./parse";

const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export interface DashboardOverviewParams {
  /** ISO datetime — dùng `toIsoStart` để nới về đầu ngày */
  from?: string;
  /** ISO datetime — dùng `toIsoEnd` để nới về cuối ngày */
  to?: string;
}

function toMetric(value: unknown): DashboardMetric {
  const record = asRecord(value);
  return {
    value: asNumber(record.value),
    previousValue: asNumber(record.previousValue),
    trend: asNumber(record.trend),
  };
}

function toRevenuePoint(value: unknown): DashboardRevenuePoint {
  const record = asRecord(value);
  return {
    date: asString(record.date),
    revenue: asNumber(record.revenue),
    orderCount: asNumber(record.orderCount),
  };
}

function toStatusSlice(value: unknown): DashboardStatusSlice {
  const record = asRecord(value);
  return {
    status: asEnum(record.status, ORDER_STATUSES, "pending"),
    count: asNumber(record.count),
  };
}

function toTopProduct(value: unknown): DashboardTopProduct {
  const record = asRecord(value);
  return {
    productId: asOptionalString(record.productId) ?? null,
    productName: asString(record.productName),
    revenue: asNumber(record.revenue),
    quantity: asNumber(record.quantity),
  };
}

function toOverview(payload: unknown): DashboardOverview {
  const record = asRecord(payload);
  const summary = asRecord(record.summary);

  return {
    from: asString(record.from),
    to: asString(record.to),
    timeZone: asString(record.timeZone),
    summary: {
      revenue: toMetric(summary.revenue),
      orderCount: toMetric(summary.orderCount),
      newCustomerCount: toMetric(summary.newCustomerCount),
      averageOrderValue: asNumber(summary.averageOrderValue),
      lowStockCount: asNumber(summary.lowStockCount),
    },
    revenueByDay: asArray(record.revenueByDay).map(toRevenuePoint),
    statusBreakdown: asArray(record.statusBreakdown).map(toStatusSlice),
    topProducts: asArray(record.topProducts).map(toTopProduct),
  };
}

export function getDashboardOverview(params: DashboardOverviewParams = {}) {
  return apiFetch<unknown>("/dashboard/overview", {
    query: { from: params.from, to: params.to },
  }).then(toOverview);
}
