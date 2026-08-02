"use client";

import { useMemo, useState } from "react";
import { Button, Descriptions, Drawer, Input, Select, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Eye } from "lucide-react";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import {
  CustomerStatusTag,
  CustomerTierTag,
} from "@/components/common/StatusTag";
import {
  DatePickerPresetRange,
  resolvePreset,
  type DateRangeSearchValue,
} from "@/components/form/DatePickerPresetRange";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import { useListQuery } from "@/hooks/useListQuery";
import { matchDateRange, matchEquals, matchText } from "@/lib/fakeFetch";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { customers } from "@/mock/customers";
import {
  CUSTOMER_STATUS_LABEL,
  CUSTOMER_TIER_LABEL,
  type Customer,
  type CustomerStatus,
  type CustomerTier,
} from "@/types/customer";

interface CustomerFilters {
  keyword: string;
  status?: CustomerStatus;
  tier?: CustomerTier;
  joinedRange: DateRangeSearchValue;
}

// Mặc định không giới hạn ngày tham gia để bảng hiện đủ dữ liệu ngay lần đầu
const INITIAL_FILTERS: CustomerFilters = {
  keyword: "",
  joinedRange: resolvePreset("custom"),
};

const STATUS_OPTIONS = Object.entries(CUSTOMER_STATUS_LABEL).map(
  ([value, label]) => ({ label, value }),
);
const TIER_OPTIONS = Object.entries(CUSTOMER_TIER_LABEL).map(
  ([value, label]) => ({ label, value }),
);

export default function CustomersPage() {
  const [selected, setSelected] = useState<Customer | null>(null);

  const { rows, loading, filters, patchFilters, search, reset, pagination } =
    useListQuery<Customer, CustomerFilters>({
      source: customers,
      initialFilters: INITIAL_FILTERS,
      buildFilters: (f) => [
        matchText(f.keyword, (item) => [item.name, item.email, item.phone]),
        matchEquals(f.status, (item) => item.status),
        matchEquals(f.tier, (item) => item.tier),
        matchDateRange(
          f.joinedRange.from,
          f.joinedRange.to,
          (item) => item.createdAt,
        ),
      ],
      sorter: (a, b) => b.totalSpent - a.totalSpent,
    });

  const columns = useMemo<ColumnsType<Customer>>(
    () => [
      {
        title: "Khách hàng",
        dataIndex: "name",
        fixed: "left",
        width: 220,
        render: (name: string, record) => (
          <div className="min-w-0">
            <div className="truncate font-semibold">{name}</div>
            <div className="text-muted truncate text-xs">{record.email}</div>
          </div>
        ),
      },
      { title: "Điện thoại", dataIndex: "phone", width: 130 },
      {
        title: "Hạng",
        dataIndex: "tier",
        width: 110,
        align: "center",
        render: (tier: CustomerTier) => <CustomerTierTag tier={tier} />,
      },
      {
        title: "Số đơn",
        dataIndex: "totalOrders",
        width: 100,
        align: "right",
        sorter: (a, b) => a.totalOrders - b.totalOrders,
        render: (value: number) => formatNumber(value),
      },
      {
        title: "Tổng chi tiêu",
        dataIndex: "totalSpent",
        width: 170,
        align: "right",
        sorter: (a, b) => a.totalSpent - b.totalSpent,
        render: (value: number) => (
          <span className="font-semibold">{formatCurrency(value)}</span>
        ),
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        width: 140,
        align: "center",
        render: (status: CustomerStatus) => (
          <CustomerStatusTag status={status} />
        ),
      },
      {
        title: "Ngày tham gia",
        dataIndex: "createdAt",
        width: 130,
        sorter: (a, b) => a.createdAt.localeCompare(b.createdAt),
        render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
      },
      {
        title: "",
        key: "actions",
        width: 60,
        align: "center",
        fixed: "right",
        render: (_, record) => (
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              size="small"
              icon={<Eye size={16} />}
              onClick={() => setSelected(record)}
            />
          </Tooltip>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Khách hàng"
        description="Danh sách khách hàng mua sắm trên cửa hàng"
      />

      <SearchFilterBar onSearch={search} onReset={reset} loading={loading}>
        <FormItemLayout label="Tên / email / SĐT">
          <Input
            allowClear
            placeholder="Nhập từ khoá tìm kiếm"
            value={filters.keyword}
            onChange={(event) => patchFilters({ keyword: event.target.value })}
          />
        </FormItemLayout>

        <FormItemLayout label="Trạng thái">
          <Select
            allowClear
            placeholder="Tất cả trạng thái"
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(status) => patchFilters({ status })}
            className="w-full"
          />
        </FormItemLayout>

        <FormItemLayout label="Hạng khách hàng">
          <Select
            allowClear
            placeholder="Tất cả hạng"
            options={TIER_OPTIONS}
            value={filters.tier}
            onChange={(tier) => patchFilters({ tier })}
            className="w-full"
          />
        </FormItemLayout>

        <DatePickerPresetRange
          label="Ngày tham gia"
          value={filters.joinedRange}
          onChange={(joinedRange) => patchFilters({ joinedRange })}
        />
      </SearchFilterBar>

      <DataTable<Customer>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={pagination}
      />

      <Drawer
        title={selected?.name}
        open={!!selected}
        onClose={() => setSelected(null)}
        width={480}
      >
        {selected && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Email">{selected.email}</Descriptions.Item>
            <Descriptions.Item label="Điện thoại">
              {selected.phone}
            </Descriptions.Item>
            <Descriptions.Item label="Địa chỉ">
              {selected.address}
            </Descriptions.Item>
            <Descriptions.Item label="Hạng">
              <CustomerTierTag tier={selected.tier} />
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <CustomerStatusTag status={selected.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Số đơn đã đặt">
              {formatNumber(selected.totalOrders)}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng chi tiêu">
              {formatCurrency(selected.totalSpent)}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tham gia">
              {dayjs(selected.createdAt).format("DD/MM/YYYY")}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </>
  );
}
