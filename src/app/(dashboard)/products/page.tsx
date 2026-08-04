"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { App, Button, Input, InputNumber, Popconfirm, Select, Space, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ImageOff, Pencil, Plus, Trash2 } from "lucide-react";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { ProductStatusTag } from "@/components/common/StatusTag";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import routes from "@/config/routes";
import {
  brandOptionsFrom,
  categoryOptionsFrom,
  deleteProduct,
  listBrands,
  listCategories,
  listProducts,
} from "@/lib/api/products";
import {
  currencyInputFormatter,
  currencyInputParser,
  formatCurrency,
  formatNumber,
} from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, type SelectOption } from "@/types/common";
import { PRODUCT_STATUS_LABEL, type Product, type ProductStatus } from "@/types/product";

interface ProductFilters {
  keyword: string;
  categoryId?: string;
  brandId?: string;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
}

const STATUS_OPTIONS = Object.entries(PRODUCT_STATUS_LABEL).map(([value, label]) => ({
  label,
  value,
}));

export default function ProductsPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>({ keyword: "" });
  const [appliedFilters, setAppliedFilters] = useState<ProductFilters>({ keyword: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [brandOptions, setBrandOptions] = useState<SelectOption[]>([]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listProducts({
        page,
        limit: pageSize,
        search: appliedFilters.keyword,
        categoryId: appliedFilters.categoryId,
        includeSubCategories: !!appliedFilters.categoryId,
        brandId: appliedFilters.brandId,
        status: appliedFilters.status,
        minPrice: appliedFilters.minPrice,
        maxPrice: appliedFilters.maxPrice,
        sortBy: "createdAt",
        sortOrder: "DESC",
      });
      setRows(response.data);
      setTotal(response.total);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tải được danh sách sản phẩm");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, message, page, pageSize]);

  useEffect(() => {
    queueMicrotask(() => void loadRows());
  }, [loadRows]);

  useEffect(() => {
    Promise.all([
      listCategories({ page: 1, limit: 100, sortBy: "name", sortOrder: "ASC", isActive: true }),
      listBrands({ page: 1, limit: 100, sortBy: "name", sortOrder: "ASC", isActive: true }),
    ])
      .then(([categories, brands]) => {
        setCategoryOptions(categoryOptionsFrom(categories.data));
        setBrandOptions(brandOptionsFrom(brands.data));
      })
      .catch(() => {
        setCategoryOptions([]);
        setBrandOptions([]);
      });
  }, []);

  const patchFilters = (patch: Partial<ProductFilters>) => {
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

  const handleDelete = async (record: Product) => {
    try {
      await deleteProduct(record.id);
      message.success(`Đã xoá ${record.name}`);
      await loadRows();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không xoá được sản phẩm");
    }
  };

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
              <Link href={routes.products.detail(record.id)} className="line-clamp-1 font-semibold">
                {record.name}
              </Link>
              <div className="text-muted text-xs">{record.sku}</div>
            </div>
          </div>
        ),
      },
      { title: "Danh mục", dataIndex: "categoryName", width: 140, render: (value?: string) => value || "—" },
      { title: "Thương hiệu", dataIndex: "brandName", width: 120, render: (value?: string) => value || "—" },
      {
        title: "Giá bán",
        dataIndex: "price",
        width: 140,
        align: "right",
        render: (value: number) => formatCurrency(value),
      },
      {
        title: "Tồn kho",
        dataIndex: "stock",
        width: 100,
        align: "right",
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
        render: (status: Product["status"]) => <ProductStatusTag status={status} />,
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
              onConfirm={() => handleDelete(record)}
            >
              <Tooltip title="Xoá">
                <Button type="text" size="small" danger icon={<Trash2 size={16} />} />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
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

        <FormItemLayout label="Khoảng giá (JPY)" className="sm:col-span-2">
          <Space.Compact className="w-full">
            <InputNumber
              placeholder="Giá từ"
              className="w-1/2"
              min={0}
              step={10_000}
              formatter={currencyInputFormatter}
              parser={currencyInputParser}
              value={filters.minPrice}
              onChange={(minPrice) => patchFilters({ minPrice: minPrice ?? undefined })}
            />
            <InputNumber
              placeholder="Giá đến"
              className="w-1/2"
              min={0}
              step={10_000}
              formatter={currencyInputFormatter}
              parser={currencyInputParser}
              value={filters.maxPrice}
              onChange={(maxPrice) => patchFilters({ maxPrice: maxPrice ?? undefined })}
            />
          </Space.Compact>
        </FormItemLayout>
      </SearchFilterBar>

      <DataTable<Product>
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
    </>
  );
}
