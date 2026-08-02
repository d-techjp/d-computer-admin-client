"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  App,
  Button,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { ImageOff, Pencil, Plus, Trash2 } from "lucide-react";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { ProductStatusTag } from "@/components/common/StatusTag";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import routes from "@/config/routes";
import { useListQuery } from "@/hooks/useListQuery";
import { matchEquals, matchNumberRange, matchText } from "@/lib/fakeFetch";
import {
  currencyInputFormatter,
  currencyInputParser,
  formatCurrency,
  formatNumber,
} from "@/lib/utils";
import { brandOptions, categoryOptions } from "@/mock/catalog";
import { products } from "@/mock/products";
import { PRODUCT_STATUS_LABEL, type Product } from "@/types/product";

interface ProductFilters {
  keyword: string;
  categoryId?: string;
  brandId?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
}

const INITIAL_FILTERS: ProductFilters = { keyword: "" };

const STATUS_OPTIONS = Object.entries(PRODUCT_STATUS_LABEL).map(
  ([value, label]) => ({ label, value }),
);

export default function ProductsPage() {
  const { message } = App.useApp();

  const { rows, loading, filters, patchFilters, search, reset, pagination } =
    useListQuery<Product, ProductFilters>({
      source: products,
      initialFilters: INITIAL_FILTERS,
      buildFilters: (f) => [
        matchText(f.keyword, (item) => [item.name, item.sku]),
        matchEquals(f.categoryId, (item) => item.categoryId),
        matchEquals(f.brandId, (item) => item.brandId),
        matchEquals(f.status, (item) => item.status),
        matchNumberRange(f.minPrice, f.maxPrice, (item) => item.price),
      ],
      sorter: (a, b) => b.createdAt.localeCompare(a.createdAt),
    });

  const columns = useMemo<ColumnsType<Product>>(
    () => [
      {
        title: "Sản phẩm",
        dataIndex: "name",
        fixed: "left",
        width: 300,
        render: (_, record) => (
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-subtle border-line relative h-11 w-11 shrink-0 overflow-hidden rounded border">
              {record.images[0] ? (
                <Image
                  src={record.images[0]}
                  alt={record.name}
                  fill
                  unoptimized
                  sizes="44px"
                  className="object-cover"
                />
              ) : (
                <span className="text-muted flex h-full items-center justify-center">
                  <ImageOff size={16} />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <Link
                href={routes.products.detail(record.id)}
                className="line-clamp-1 font-semibold"
              >
                {record.name}
              </Link>
              <div className="text-muted text-xs">{record.sku}</div>
            </div>
          </div>
        ),
      },
      { title: "Danh mục", dataIndex: "categoryName", width: 140 },
      { title: "Thương hiệu", dataIndex: "brandName", width: 120 },
      {
        title: "Giá bán",
        dataIndex: "price",
        width: 140,
        align: "right",
        sorter: (a, b) => a.price - b.price,
        render: (value: number) => formatCurrency(value),
      },
      {
        title: "Tồn kho",
        dataIndex: "stock",
        width: 100,
        align: "right",
        sorter: (a, b) => a.stock - b.stock,
        render: (value: number) => (
          <span className={value === 0 ? "text-danger font-semibold" : ""}>
            {formatNumber(value)}
          </span>
        ),
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        width: 120,
        align: "center",
        render: (status: Product["status"]) => (
          <ProductStatusTag status={status} />
        ),
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 100,
        align: "center",
        fixed: "right",
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="Sửa">
              <Link href={routes.products.detail(record.id)}>
                <Button type="text" size="small" icon={<Pencil size={16} />} />
              </Link>
            </Tooltip>
            <Popconfirm
              title="Xoá sản phẩm này?"
              description="Thao tác không thể hoàn tác."
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
              onConfirm={() => message.success(`Đã xoá ${record.name}`)}
            >
              <Tooltip title="Xoá">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<Trash2 size={16} />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [message],
  );

  return (
    <>
      <PageHeader
        title="Danh sách sản phẩm"
        description="Quản lý sản phẩm điện tử và linh kiện máy tính đang kinh doanh"
        extra={
          <Link href={routes.products.new}>
            <Button type="primary" icon={<Plus size={16} />}>
              Thêm sản phẩm
            </Button>
          </Link>
        }
      />

      <SearchFilterBar onSearch={search} onReset={reset} loading={loading}>
        <FormItemLayout label="Tên hoặc mã SKU">
          <Input
            allowClear
            placeholder="Nhập tên sản phẩm hoặc SKU"
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
            options={categoryOptions}
            value={filters.categoryId}
            onChange={(categoryId) => patchFilters({ categoryId })}
            className="w-full"
          />
        </FormItemLayout>

        <FormItemLayout label="Thương hiệu">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Tất cả thương hiệu"
            options={brandOptions}
            value={filters.brandId}
            onChange={(brandId) => patchFilters({ brandId })}
            className="w-full"
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

        {/* <FormItemLayout label="Khoảng giá (JPY)" className="sm:col-span-2">
          <Space.Compact className="w-full">
            <InputNumber
              placeholder="Giá từ"
              className="w-1/2"
              min={0}
              step={10_000}
              formatter={currencyInputFormatter}
              parser={currencyInputParser}
              value={filters.minPrice}
              onChange={(minPrice) =>
                patchFilters({ minPrice: minPrice ?? undefined })
              }
            />
            <InputNumber
              placeholder="Giá đến"
              className="w-1/2"
              min={0}
              step={10_000}
              formatter={currencyInputFormatter}
              parser={currencyInputParser}
              value={filters.maxPrice}
              onChange={(maxPrice) =>
                patchFilters({ maxPrice: maxPrice ?? undefined })
              }
            />
          </Space.Compact>
        </FormItemLayout> */}
      </SearchFilterBar>

      <DataTable<Product>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={pagination}
      />
    </>
  );
}
