"use client";

import { useMemo } from "react";
import { Input, Select, Switch } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { StockLevelTag } from "@/components/common/StatusTag";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import { useListQuery } from "@/hooks/useListQuery";
import { matchEquals, matchText } from "@/lib/fakeFetch";
import { formatNumber } from "@/lib/utils";
import { categories } from "@/mock/catalog";
import { stockItems } from "@/mock/warehouse";
import { stockLevelOf, type StockItem } from "@/types/warehouse";

interface StockFilters {
  keyword: string;
  categoryName?: string;
  onlyLowStock: boolean;
}

const CATEGORY_OPTIONS = categories.map((item) => ({
  label: item.name,
  value: item.name,
}));

export default function WarehousePage() {
  const { rows, loading, filters, patchFilters, search, reset, pagination } =
    useListQuery<StockItem, StockFilters>({
      source: stockItems,
      initialFilters: { keyword: "", onlyLowStock: false },
      buildFilters: (f) => [
        matchText(f.keyword, (item) => [
          item.productName,
          item.sku,
          item.location,
        ]),
        matchEquals(f.categoryName, (item) => item.categoryName),
        // Bộ lọc dạng bật/tắt: chỉ áp dụng khi được bật
        f.onlyLowStock
          ? (item: StockItem) => stockLevelOf(item) !== "in_stock"
          : () => true,
      ],
      sorter: (a, b) => a.available - b.available,
    });

  const columns = useMemo<ColumnsType<StockItem>>(
    () => [
      {
        title: "Sản phẩm",
        dataIndex: "productName",
        fixed: "left",
        width: 260,
        render: (name: string, record) => (
          <div className="min-w-0">
            <div className="truncate font-semibold">{name}</div>
            <div className="text-muted text-xs">{record.sku}</div>
          </div>
        ),
      },
      { title: "Danh mục", dataIndex: "categoryName", width: 140 },
      { title: "Vị trí kho", dataIndex: "location", width: 110, align: "center" },
      {
        title: "Tồn kho",
        dataIndex: "quantity",
        width: 110,
        align: "right",
        sorter: (a, b) => a.quantity - b.quantity,
        render: (value: number) => formatNumber(value),
      },
      {
        title: "Đang giữ",
        dataIndex: "reserved",
        width: 110,
        align: "right",
        render: (value: number) => formatNumber(value),
      },
      {
        title: "Khả dụng",
        dataIndex: "available",
        width: 110,
        align: "right",
        sorter: (a, b) => a.available - b.available,
        render: (value: number) => (
          <span className="font-semibold">{formatNumber(value)}</span>
        ),
      },
      {
        title: "Định mức",
        dataIndex: "reorderPoint",
        width: 110,
        align: "right",
        render: (value: number) => formatNumber(value),
      },
      {
        title: "Tình trạng",
        key: "level",
        width: 130,
        align: "center",
        render: (_, record) => <StockLevelTag level={stockLevelOf(record)} />,
      },
      {
        title: "Cập nhật",
        dataIndex: "updatedAt",
        width: 130,
        render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Tồn kho"
        description="Theo dõi số lượng tồn, số đang giữ chỗ và cảnh báo sắp hết hàng"
      />

      <SearchFilterBar onSearch={search} onReset={reset} loading={loading}>
        <FormItemLayout label="Sản phẩm / SKU / vị trí">
          <Input
            allowClear
            placeholder="Nhập từ khoá tìm kiếm"
            value={filters.keyword}
            onChange={(event) => patchFilters({ keyword: event.target.value })}
          />
        </FormItemLayout>

        <FormItemLayout label="Danh mục">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Tất cả danh mục"
            options={CATEGORY_OPTIONS}
            value={filters.categoryName}
            onChange={(categoryName) => patchFilters({ categoryName })}
            className="w-full"
          />
        </FormItemLayout>

        <FormItemLayout label="Chỉ hiện hàng sắp hết">
          <div>
            <Switch
              checked={filters.onlyLowStock}
              onChange={(onlyLowStock) => patchFilters({ onlyLowStock })}
              checkedChildren="Bật"
              unCheckedChildren="Tắt"
            />
          </div>
        </FormItemLayout>
      </SearchFilterBar>

      <DataTable<StockItem>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={pagination}
      />
    </>
  );
}
