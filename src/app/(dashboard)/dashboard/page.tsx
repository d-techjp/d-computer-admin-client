"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
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
import {
  buildRevenueSeries,
  buildStatusBreakdown,
  buildSummary,
  buildTopProducts,
} from "@/lib/analytics";
import { orderStatusColors } from "@/lib/chart-colors";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
} from "@/lib/utils";
import { orders } from "@/mock/orders";
import { useThemeStore } from "@/store/useThemeStore";
import type { Order } from "@/types/order";

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
  const mode = useThemeStore((state) => state.mode);
  const [range, setRange] = useState<DateRangeSearchValue>(DEFAULT_DATE_RANGE);

  const from = range.from ?? DEFAULT_DATE_RANGE.from!;
  const to = range.to ?? DEFAULT_DATE_RANGE.to!;

  const summary = useMemo(() => buildSummary(from, to), [from, to]);
  const revenueSeries = useMemo(() => buildRevenueSeries(from, to), [from, to]);
  const statusBreakdown = useMemo(
    () => buildStatusBreakdown(from, to),
    [from, to],
  );
  const topProducts = useMemo(() => buildTopProducts(from, to), [from, to]);

  // Màu gắn cố định theo trạng thái nên lọc bớt cũng không đổi màu phần còn lại
  const statusColors = useMemo(() => {
    const map = orderStatusColors(mode);
    return statusBreakdown.statuses.map((status) => map[status]);
  }, [mode, statusBreakdown.statuses]);

  const recentOrders = useMemo(() => orders.slice(0, 6), []);

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
          value={formatCompactCurrency(summary.revenue)}
          icon={<Wallet size={18} />}
          trend={{
            value: Math.abs(summary.revenueTrend),
            direction: summary.revenueTrend >= 0 ? "up" : "down",
          }}
          hint="so với kỳ trước"
        />
        <StatCard
          title="Số đơn hàng"
          value={formatNumber(summary.orderCount)}
          icon={<ShoppingCart size={18} />}
          trend={{
            value: Math.abs(summary.orderTrend),
            direction: summary.orderTrend >= 0 ? "up" : "down",
          }}
          hint="so với kỳ trước"
        />
        <StatCard
          title="Khách hàng mới"
          value={formatNumber(summary.customerCount)}
          icon={<UserRound size={18} />}
          trend={{
            value: Math.abs(summary.customerTrend),
            direction: summary.customerTrend >= 0 ? "up" : "down",
          }}
          hint="so với kỳ trước"
        />
        <StatCard
          title="Sản phẩm sắp hết"
          value={formatNumber(summary.lowStockCount)}
          icon={<AlertTriangle size={18} />}
          hint="cần nhập thêm hàng"
        />
      </div>

      {/* Doanh thu và số đơn tách thành hai chart riêng — không dùng hai trục y trên cùng một đồ thị */}
      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <LineAreaChart
          className="xl:col-span-2"
          title="Doanh thu theo ngày"
          description="Đơn đã huỷ không được tính vào doanh thu"
          area
          series={[{ name: "Doanh thu", data: revenueSeries.revenue }]}
          categories={revenueSeries.categories}
          valueFormatter={formatCompactCurrency}
          height={300}
        />

        <PieDonutChart
          title="Cơ cấu trạng thái đơn"
          series={statusBreakdown.series}
          labels={statusBreakdown.labels}
          colors={statusColors}
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
              6 đơn mới nhất trên toàn hệ thống
            </p>
          </header>

          <Table<Order>
            rowKey="id"
            size="small"
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
