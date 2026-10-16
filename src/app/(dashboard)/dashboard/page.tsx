"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { App, Button, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import {
  AlertTriangle,
  ArrowRight,
  ShoppingCart,
  UserRound,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { OrderStatusTag } from "@/components/common/StatusTag";
import { BarChart } from "@/components/charts/BarChart";
import { LineAreaChart } from "@/components/charts/LineAreaChart";
import { PieDonutChart } from "@/components/charts/PieDonutChart";
import {
  DatePickerPresetRange,
  DEFAULT_DATE_RANGE,
  type DateRangeSearchValue,
} from "@/components/form/DatePickerPresetRange";
import routes from "@/config/routes";
import { getDashboardOverview } from "@/lib/api/dashboard";
import { listOrders } from "@/lib/api/orders";
import { toIsoEnd, toIsoStart } from "@/lib/api/pagination";
import { orderStatusColors } from "@/lib/chart-colors";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
} from "@/lib/utils";
import { useThemeStore } from "@/store/useThemeStore";
import type { DashboardOverview } from "@/types/dashboard";
import { ORDER_STATUS_LABEL, type Order } from "@/types/order";

const RECENT_ORDERS_LIMIT = 6;

const recentOrderColumns: ColumnsType<Order> = [
  {
    title: "Mã đơn",
    dataIndex: "code",
    width: 130,
    render: (code: string, record) => (
      <Link href={routes.orders.detail(record.id)}>{code}</Link>
    ),
  },
  { title: "Khách hàng", dataIndex: "customerName", ellipsis: true },
  {
    title: "Tổng tiền",
    dataIndex: "total",
    width: 150,
    align: "right",
    render: (value: number) => formatCurrency(value),
  },
  {
    title: "Trạng thái",
    dataIndex: "status",
    width: 140,
    align: "center",
    render: (status: Order["status"]) => <OrderStatusTag status={status} />,
  },
];

export default function DashboardPage() {
  const { message } = App.useApp();
  const mode = useThemeStore((state) => state.mode);
  const [range, setRange] = useState<DateRangeSearchValue>(DEFAULT_DATE_RANGE);
  const [overview, setOverview] = useState<DashboardOverview>();
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const from = toIsoStart(range.from ?? DEFAULT_DATE_RANGE.from);
  const to = toIsoEnd(range.to ?? DEFAULT_DATE_RANGE.to);

  /**
   * Đổi khoảng ngày nhanh tay có thể để response cũ về sau response mới, nên
   * mỗi lần gọi mang một số thứ tự và chỉ lần gọi mới nhất được ghi vào state.
   */
  const overviewRequestRef = useRef(0);

  const loadOverview = useCallback(async () => {
    const requestId = overviewRequestRef.current + 1;
    overviewRequestRef.current = requestId;
    setLoading(true);
    try {
      const data = await getDashboardOverview({ from, to });
      if (overviewRequestRef.current !== requestId) return;
      setOverview(data);
    } catch (error) {
      if (overviewRequestRef.current !== requestId) return;
      message.error(
        error instanceof Error ? error.message : "Không tải được số liệu tổng quan",
      );
    } finally {
      if (overviewRequestRef.current === requestId) setLoading(false);
    }
  }, [from, to, message]);

  useEffect(() => {
    queueMicrotask(() => void loadOverview());
  }, [loadOverview]);

  // Đơn gần đây không phụ thuộc khoảng thời gian đang chọn — luôn là đơn mới nhất
  // trên toàn hệ thống, nên tách khỏi lời gọi overview.
  const loadRecentOrders = useCallback(async () => {
    setRecentLoading(true);
    try {
      const result = await listOrders({
        page: 1,
        limit: RECENT_ORDERS_LIMIT,
        sortBy: "createdAt",
        sortOrder: "DESC",
      });
      setRecentOrders(result.data);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Không tải được đơn hàng gần đây",
      );
    } finally {
      setRecentLoading(false);
    }
  }, [message]);

  useEffect(() => {
    queueMicrotask(() => void loadRecentOrders());
  }, [loadRecentOrders]);

  const summary = overview?.summary;

  const revenueSeries = useMemo(() => {
    const points = overview?.revenueByDay ?? [];
    return {
      categories: points.map((point) => dayjs(point.date).format("DD/MM")),
      revenue: points.map((point) => point.revenue),
    };
  }, [overview]);

  // Màu gắn cố định theo trạng thái nên lọc bớt cũng không đổi màu phần còn lại
  const statusBreakdown = useMemo(() => {
    const slices = overview?.statusBreakdown ?? [];
    const colorMap = orderStatusColors(mode);
    return {
      labels: slices.map((slice) => ORDER_STATUS_LABEL[slice.status]),
      series: slices.map((slice) => slice.count),
      colors: slices.map((slice) => colorMap[slice.status]),
    };
  }, [mode, overview]);

  const topProducts = useMemo(() => {
    const items = overview?.topProducts ?? [];
    return {
      categories: items.map((item) => item.productName),
      values: items.map((item) => item.revenue),
    };
  }, [overview]);

  return (
    <>
      <PageHeader
        title="Tổng quan"
        description="Số liệu kinh doanh của cửa hàng theo khoảng thời gian đã chọn"
        extra={
          <Link href={routes.orders.index}>
            <Button icon={<ArrowRight size={16} />} iconPosition="end">
              Xem tất cả đơn hàng
            </Button>
          </Link>
        }
      />

      {/* Một hàng bộ lọc duy nhất, áp dụng cho toàn bộ số liệu bên dưới */}
      <div className="bg-card border-line shadow-card mb-4 rounded-lg border p-4">
        <div className="max-w-md">
          <DatePickerPresetRange value={range} onChange={setRange} />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Doanh thu"
          value={formatCompactCurrency(summary?.revenue.value ?? 0)}
          icon={<Wallet size={18} />}
          loading={loading}
          trend={
            summary && {
              value: Math.abs(summary.revenue.trend),
              direction: summary.revenue.trend >= 0 ? "up" : "down",
            }
          }
          hint="đơn đã hoàn tất, so với kỳ trước"
        />
        <StatCard
          title="Số đơn hoàn tất"
          value={formatNumber(summary?.orderCount.value ?? 0)}
          icon={<ShoppingCart size={18} />}
          loading={loading}
          trend={
            summary && {
              value: Math.abs(summary.orderCount.trend),
              direction: summary.orderCount.trend >= 0 ? "up" : "down",
            }
          }
          hint="so với kỳ trước"
        />
        <StatCard
          title="Khách hàng mới"
          value={formatNumber(summary?.newCustomerCount.value ?? 0)}
          icon={<UserRound size={18} />}
          loading={loading}
          trend={
            summary && {
              value: Math.abs(summary.newCustomerCount.trend),
              direction: summary.newCustomerCount.trend >= 0 ? "up" : "down",
            }
          }
          hint="so với kỳ trước"
        />
        <StatCard
          title="Sản phẩm sắp hết"
          value={formatNumber(summary?.lowStockCount ?? 0)}
          icon={<AlertTriangle size={18} />}
          loading={loading}
          hint="cần nhập thêm hàng"
        />
      </div>

      {/* Doanh thu và số đơn tách thành hai chart riêng — không dùng hai trục y trên cùng một đồ thị */}
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <LineAreaChart
          className="xl:col-span-2"
          title="Doanh thu theo ngày"
          description="Chỉ tính đơn đã hoàn tất"
          area
          loading={loading}
          series={[{ name: "Doanh thu", data: revenueSeries.revenue }]}
          categories={revenueSeries.categories}
          valueFormatter={formatCompactCurrency}
          height={300}
        />

        <PieDonutChart
          title="Cơ cấu trạng thái đơn"
          description="Tính cả đơn đã huỷ"
          loading={loading}
          series={statusBreakdown.series}
          labels={statusBreakdown.labels}
          colors={statusBreakdown.colors}
          valueFormatter={(value) => `${formatNumber(value)} đơn`}
          height={300}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <BarChart
          className="xl:col-span-2"
          title="Sản phẩm bán chạy"
          description="Xếp theo doanh thu trong khoảng thời gian đã chọn"
          horizontal
          loading={loading}
          series={[{ name: "Doanh thu", data: topProducts.values }]}
          categories={topProducts.categories}
          valueFormatter={formatCompactCurrency}
          height={340}
        />

        <section className="bg-card border-line shadow-card rounded-lg border p-4">
          <header className="mb-3">
            <h3 className="text-fg text-base font-semibold">
              Đơn hàng gần đây
            </h3>
            <p className="text-muted mt-0.5 text-xs">
              {RECENT_ORDERS_LIMIT} đơn mới nhất trên toàn hệ thống
            </p>
          </header>

          <Table<Order>
            rowKey="id"
            size="small"
            loading={recentLoading}
            columns={recentOrderColumns}
            dataSource={recentOrders}
            pagination={false}
            scroll={{ x: "max-content" }}
          />
        </section>
      </div>
    </>
  );
}
