"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button, Input, Select, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Eye } from "lucide-react";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { OrderStatusTag } from "@/components/common/StatusTag";
import {
  DatePickerPresetRange,
  DEFAULT_DATE_RANGE,
  type DateRangeSearchValue,
} from "@/components/form/DatePickerPresetRange";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import routes from "@/config/routes";
import { useListQuery } from "@/hooks/useListQuery";
import { matchDateRange, matchIncludes, matchText } from "@/lib/fakeFetch";
import { formatCurrency } from "@/lib/utils";
import { orders } from "@/mock/orders";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  type Order,
  type OrderStatus,
  type PaymentMethod,
} from "@/types/order";

interface OrderFilters {
  keyword: string;
  statuses: OrderStatus[];
  paymentMethod?: PaymentMethod;
  dateRange: DateRangeSearchValue;
}

const INITIAL_FILTERS: OrderFilters = {
  keyword: "",
  statuses: [],
  dateRange: DEFAULT_DATE_RANGE,
};

const STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABEL).map(
  ([value, label]) => ({ label, value }),
);

const PAYMENT_OPTIONS = Object.entries(PAYMENT_METHOD_LABEL).map(
  ([value, label]) => ({ label, value }),
);

export default function OrdersPage() {
  const { rows, loading, filters, patchFilters, search, reset, pagination } =
    useListQuery<Order, OrderFilters>({
      source: orders,
      initialFilters: INITIAL_FILTERS,
      buildFilters: (f) => [
        matchText(f.keyword, (item) => [
          item.code,
          item.customerName,
          item.customerPhone,
        ]),
        matchIncludes(f.statuses, (item) => item.status),
        matchIncludes(
          f.paymentMethod ? [f.paymentMethod] : undefined,
          (item) => item.paymentMethod,
        ),
        matchDateRange(
          f.dateRange.from,
          f.dateRange.to,
          (item) => item.createdAt,
        ),
      ],
    });

  const columns = useMemo<ColumnsType<Order>>(
    () => [
      {
        title: "Mã đơn",
        dataIndex: "code",
        fixed: "left",
        width: 140,
        render: (code: string, record) => (
          <Link href={routes.orders.detail(record.id)} className="font-semibold">
            {code}
          </Link>
        ),
      },
      {
        title: "Khách hàng",
        dataIndex: "customerName",
        width: 200,
        render: (name: string, record) => (
          <div className="min-w-0">
            <div className="truncate">{name}</div>
            <div className="text-muted text-xs">{record.customerPhone}</div>
          </div>
        ),
      },
      {
        title: "Số SP",
        key: "itemCount",
        width: 80,
        align: "right",
        render: (_, record) => record.items.length,
      },
      {
        title: "Tổng tiền",
        dataIndex: "total",
        width: 150,
        align: "right",
        sorter: (a, b) => a.total - b.total,
        render: (value: number) => (
          <span className="font-semibold">{formatCurrency(value)}</span>
        ),
      },
      {
        title: "Thanh toán",
        dataIndex: "paymentMethod",
        width: 160,
        render: (method: PaymentMethod) => PAYMENT_METHOD_LABEL[method],
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        width: 140,
        align: "center",
        render: (status: OrderStatus) => <OrderStatusTag status={status} />,
      },
      {
        title: "Ngày đặt",
        dataIndex: "createdAt",
        width: 150,
        sorter: (a, b) => a.createdAt.localeCompare(b.createdAt),
        render: (value: string) => dayjs(value).format("DD/MM/YYYY HH:mm"),
      },
      {
        title: "",
        key: "actions",
        width: 60,
        align: "center",
        fixed: "right",
        render: (_, record) => (
          <Tooltip title="Xem chi tiết">
            <Link href={routes.orders.detail(record.id)}>
              <Button type="text" size="small" icon={<Eye size={16} />} />
            </Link>
          </Tooltip>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Quản lý đơn hàng"
        description="Theo dõi và xử lý đơn hàng của khách"
      />

      <SearchFilterBar onSearch={search} onReset={reset} loading={loading}>
        <FormItemLayout label="Mã đơn / khách hàng">
          <Input
            allowClear
            placeholder="Nhập mã đơn, tên hoặc SĐT"
            value={filters.keyword}
            onChange={(event) => patchFilters({ keyword: event.target.value })}
          />
        </FormItemLayout>

        <FormItemLayout label="Trạng thái">
          <Select
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            placeholder="Tất cả trạng thái"
            options={STATUS_OPTIONS}
            value={filters.statuses}
            onChange={(statuses) => patchFilters({ statuses })}
            className="w-full"
          />
        </FormItemLayout>

        <FormItemLayout label="Hình thức thanh toán">
          <Select
            allowClear
            placeholder="Tất cả hình thức"
            options={PAYMENT_OPTIONS}
            value={filters.paymentMethod}
            onChange={(paymentMethod) => patchFilters({ paymentMethod })}
            className="w-full"
          />
        </FormItemLayout>

        <DatePickerPresetRange
          label="Ngày đặt hàng"
          value={filters.dateRange}
          onChange={(dateRange) => patchFilters({ dateRange })}
        />
      </SearchFilterBar>

      <DataTable<Order>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={pagination}
      />
    </>
  );
}
