"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { App, Button, Input, Select, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SorterResult } from "antd/es/table/interface";
import dayjs from "dayjs";
import { Eye } from "lucide-react";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { OrderStatusTag, PaymentStatusTag } from "@/components/common/StatusTag";
import {
  DatePickerPresetRange,
  DEFAULT_DATE_RANGE,
  type DateRangeSearchValue,
} from "@/components/form/DatePickerPresetRange";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import routes from "@/config/routes";
import { listOrders } from "@/lib/api/orders";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE } from "@/types/common";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  type Order,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "@/types/order";

interface OrderFilters {
  keyword: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  dateRange: DateRangeSearchValue;
}

const INITIAL_FILTERS: OrderFilters = {
  keyword: "",
  dateRange: DEFAULT_DATE_RANGE,
};

interface OrderSort {
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

const DEFAULT_SORT: OrderSort = { sortBy: "createdAt", sortOrder: "DESC" };

const STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABEL).map(
  ([value, label]) => ({ label, value }),
);

const PAYMENT_OPTIONS = Object.entries(PAYMENT_METHOD_LABEL).map(
  ([value, label]) => ({ label, value }),
);

const PAYMENT_STATUS_OPTIONS = Object.entries(PAYMENT_STATUS_LABEL).map(
  ([value, label]) => ({ label, value }),
);

function rangeStart(value?: string) {
  return value ? dayjs(value).startOf("day").toISOString() : undefined;
}

function rangeEnd(value?: string) {
  return value ? dayjs(value).endOf("day").toISOString() : undefined;
}

export default function OrdersPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<OrderFilters>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<OrderFilters>(INITIAL_FILTERS);
  const [sort, setSort] = useState<OrderSort>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listOrders({
        page,
        limit: pageSize,
        search: appliedFilters.keyword,
        status: appliedFilters.status,
        paymentStatus: appliedFilters.paymentStatus,
        paymentMethod: appliedFilters.paymentMethod,
        from: rangeStart(appliedFilters.dateRange.from),
        to: rangeEnd(appliedFilters.dateRange.to),
        sortBy: sort.sortBy,
        sortOrder: sort.sortOrder,
      });
      setRows(response.data);
      setTotal(response.total);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tải được danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  }, [
    appliedFilters.dateRange.from,
    appliedFilters.dateRange.to,
    appliedFilters.keyword,
    appliedFilters.paymentMethod,
    appliedFilters.paymentStatus,
    appliedFilters.status,
    message,
    page,
    pageSize,
    sort.sortBy,
    sort.sortOrder,
  ]);

  useEffect(() => {
    queueMicrotask(() => void loadRows());
  }, [loadRows]);

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
        sorter: true,
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
        title: "TT thanh toán",
        dataIndex: "paymentStatus",
        width: 140,
        align: "center",
        render: (status: PaymentStatus) => <PaymentStatusTag status={status} />,
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
        sorter: true,
        defaultSortOrder: "descend",
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

  const search = () => {
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const reset = () => {
    setPage(1);
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setSort(DEFAULT_SORT);
  };

  const onTableChange = (
    _pagination: unknown,
    _filters: unknown,
    sorter: SorterResult<Order> | SorterResult<Order>[],
  ) => {
    const single = Array.isArray(sorter) ? sorter[0] : sorter;
    const next: OrderSort = single?.order
      ? {
          sortBy: String(single.field ?? DEFAULT_SORT.sortBy),
          sortOrder: single.order === "ascend" ? "ASC" : "DESC",
        }
      : DEFAULT_SORT;

    setSort((current) =>
      current.sortBy === next.sortBy && current.sortOrder === next.sortOrder ? current : next,
    );
  };

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
            onChange={(event) =>
              setFilters((current) => ({ ...current, keyword: event.target.value }))
            }
          />
        </FormItemLayout>

        <FormItemLayout label="Trạng thái">
          <Select
            allowClear
            placeholder="Tất cả trạng thái"
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(status) => setFilters((current) => ({ ...current, status }))}
            className="w-full"
          />
        </FormItemLayout>

        <FormItemLayout label="TT thanh toán">
          <Select
            allowClear
            placeholder="Tất cả"
            options={PAYMENT_STATUS_OPTIONS}
            value={filters.paymentStatus}
            onChange={(paymentStatus) =>
              setFilters((current) => ({ ...current, paymentStatus }))
            }
            className="w-full"
          />
        </FormItemLayout>

        <FormItemLayout label="Hình thức thanh toán">
          <Select
            allowClear
            placeholder="Tất cả hình thức"
            options={PAYMENT_OPTIONS}
            value={filters.paymentMethod}
            onChange={(paymentMethod) => setFilters((current) => ({ ...current, paymentMethod }))}
            className="w-full"
          />
        </FormItemLayout>

        <DatePickerPresetRange
          label="Ngày đặt hàng"
          value={filters.dateRange}
          onChange={(dateRange) => setFilters((current) => ({ ...current, dateRange }))}
        />
      </SearchFilterBar>

      <DataTable<Order>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        onChange={onTableChange}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          },
        }}
      />
    </>
  );
}
