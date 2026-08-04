"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Descriptions, Drawer, Input, Select, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Eye } from "lucide-react";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { CustomerStatusTag, CustomerTierTag } from "@/components/common/StatusTag";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import { listCustomers } from "@/lib/api/users";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  CUSTOMER_STATUS_LABEL,
  type Customer,
  type CustomerStatus,
} from "@/types/customer";
import { DEFAULT_PAGE_SIZE } from "@/types/common";

interface CustomerFilters {
  keyword: string;
  status?: CustomerStatus;
}

const STATUS_OPTIONS = Object.entries(CUSTOMER_STATUS_LABEL).map(([value, label]) => ({
  label,
  value,
}));

export default function CustomersPage() {
  const [selected, setSelected] = useState<Customer | null>(null);
  const [rows, setRows] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CustomerFilters>({ keyword: "" });
  const [appliedFilters, setAppliedFilters] = useState<CustomerFilters>({ keyword: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listCustomers({
        page,
        limit: pageSize,
        search: appliedFilters.keyword,
        status: appliedFilters.status,
        sortBy: "createdAt",
        sortOrder: "DESC",
      });
      setRows(response.data);
      setTotal(response.total);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, pageSize]);

  useEffect(() => {
    queueMicrotask(() => void loadRows());
  }, [loadRows]);

  const patchFilters = (patch: Partial<CustomerFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const search = () => {
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const reset = () => {
    const next = { keyword: "" };
    setPage(1);
    setFilters(next);
    setAppliedFilters(next);
  };

  const columns = useMemo<ColumnsType<Customer>>(
    () => [
      {
        title: "Khách hàng",
        dataIndex: "name",
        fixed: "left",
        width: 220,
        render: (name: string, record) => (
          <div className="min-w-0">
            <div className="truncate font-semibold">{name || record.username}</div>
            <div className="text-muted truncate text-xs">{record.email ?? record.username}</div>
          </div>
        ),
      },
      { title: "Điện thoại", dataIndex: "phone", width: 130, render: (value?: string) => value ?? "—" },
      {
        title: "Hạng",
        dataIndex: "tier",
        width: 110,
        align: "center",
        render: (tier: Customer["tier"]) => <CustomerTierTag tier={tier} />,
      },
      {
        title: "Số đơn",
        dataIndex: "totalOrders",
        width: 100,
        align: "right",
        render: (value: number) => formatNumber(value),
      },
      {
        title: "Tổng chi tiêu",
        dataIndex: "totalSpent",
        width: 170,
        align: "right",
        render: (value: number) => <span className="font-semibold">{formatCurrency(value)}</span>,
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        width: 140,
        align: "center",
        render: (status: CustomerStatus) => <CustomerStatusTag status={status} />,
      },
      {
        title: "Ngày tham gia",
        dataIndex: "createdAt",
        width: 130,
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
            <Button type="text" size="small" icon={<Eye size={16} />} onClick={() => setSelected(record)} />
          </Tooltip>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader title="Khách hàng" description="Danh sách khách hàng mua sắm trên cửa hàng" />

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
      </SearchFilterBar>

      <DataTable<Customer>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
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

      <Drawer title={selected?.name} open={!!selected} onClose={() => setSelected(null)} width={480}>
        {selected && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Username">{selected.username}</Descriptions.Item>
            <Descriptions.Item label="Email">{selected.email ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Điện thoại">{selected.phone ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Địa chỉ">{selected.address ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Hạng">
              <CustomerTierTag tier={selected.tier} />
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <CustomerStatusTag status={selected.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Số đơn đã đặt">{formatNumber(selected.totalOrders)}</Descriptions.Item>
            <Descriptions.Item label="Tổng chi tiêu">{formatCurrency(selected.totalSpent)}</Descriptions.Item>
            <Descriptions.Item label="Ngày tham gia">
              {dayjs(selected.createdAt).format("DD/MM/YYYY")}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </>
  );
}
