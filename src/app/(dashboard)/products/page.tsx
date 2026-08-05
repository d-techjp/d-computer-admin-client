"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { App, Button, Input, Popconfirm, Select, Space, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ImageOff, Layers, Pencil, Plus, Trash2, Warehouse } from "lucide-react";

import { PermissionGate } from "@/components/auth/PermissionGate";
import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { ProductStatusTag, ProductTypeTag } from "@/components/common/StatusTag";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import {
  DEFAULT_PRICE_RANGE,
  PriceRangePresetFilter,
  type PriceRangeSearchValue,
} from "@/components/form/PriceRangePresetFilter";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import routes from "@/config/routes";
import { brandOptionsFrom, categoryOptionsFrom, listBrands, listCategories } from "@/lib/api/catalog";
import { deleteProduct, listProducts } from "@/lib/api/products";
import { listProductVariants } from "@/lib/api/variants";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, type SelectOption } from "@/types/common";
import {
  defaultVariantOf,
  PRODUCT_STATUS_LABEL,
  PRODUCT_TYPE_LABEL,
  type Product,
  type ProductStatus,
  type ProductType,
} from "@/types/product";
import { optionLabelOf, type ProductVariant } from "@/types/variant";

import { AdjustStockModal } from "./_components/variants/AdjustStockModal";
import { PriceRangeText } from "./_components/shared/PriceRangeText";

interface ProductFilters {
  keyword: string;
  productType?: ProductType;
  categoryId?: string;
  brandId?: string;
  status?: ProductStatus;
  priceRange: PriceRangeSearchValue;
}

const DEFAULT_FILTERS: ProductFilters = { keyword: "", priceRange: DEFAULT_PRICE_RANGE };

const STATUS_OPTIONS = Object.entries(PRODUCT_STATUS_LABEL).map(([value, label]) => ({
  label,
  value,
}));

const TYPE_OPTIONS = Object.entries(PRODUCT_TYPE_LABEL).map(([value, label]) => ({
  label,
  value,
}));

/** Cột của bảng biến thể hiện khi bung một dòng sản phẩm */
const variantColumns: ColumnsType<ProductVariant> = [
  {
    title: "Phiên bản",
    dataIndex: "name",
    render: (name: string, record) => {
      const options = optionLabelOf(record);
      return (
        <div className="min-w-0">
          <div className="truncate font-medium">{options || name}</div>
          <div className="text-muted text-xs">{record.sku}</div>
        </div>
      );
    },
  },
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
    width: 110,
    align: "right",
    render: (value: number, record) =>
      record.trackInventory ? (
        <span className={value <= 0 ? "text-danger font-semibold" : ""}>
          {formatNumber(value)}
        </span>
      ) : (
        <Tooltip title="Không quản lý tồn kho">
          <span className="text-muted">—</span>
        </Tooltip>
      ),
  },
  {
    title: "Trạng thái",
    dataIndex: "isActive",
    width: 120,
    align: "center",
    render: (isActive: boolean, record) => (
      <Space size={4}>
        {record.isDefault && <span className="text-muted text-xs">Mặc định</span>}
        {!isActive && <span className="text-danger text-xs">Đã tắt</span>}
      </Space>
    ),
  },
];

export default function ProductsPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [brandOptions, setBrandOptions] = useState<SelectOption[]>([]);
  const [adjustingVariant, setAdjustingVariant] = useState<ProductVariant>();

  /**
   * Biến thể của từng sản phẩm, nạp lười khi người dùng bung dòng: response
   * danh sách chỉ trả biến thể mặc định (1 phần tử), muốn đủ phải gọi riêng.
   */
  const [variantsByProduct, setVariantsByProduct] = useState<Record<string, ProductVariant[]>>({});
  const [loadingVariants, setLoadingVariants] = useState<Record<string, boolean>>({});

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listProducts({
        page,
        limit: pageSize,
        search: appliedFilters.keyword,
        productType: appliedFilters.productType,
        categoryId: appliedFilters.categoryId,
        includeSubCategories: !!appliedFilters.categoryId,
        brandId: appliedFilters.brandId,
        status: appliedFilters.status,
        minPrice: appliedFilters.priceRange.min,
        maxPrice: appliedFilters.priceRange.max,
        sortBy: "createdAt",
        sortOrder: "DESC",
      });
      setRows(response.data);
      setTotal(response.total);
      // Dữ liệu vừa đổi thì cache biến thể cũ không còn đúng
      setVariantsByProduct({});
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
    setPage(1);
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  };

  const handleDelete = useCallback(
    async (record: Product) => {
      try {
        await deleteProduct(record.id);
        message.success(`Đã xoá ${record.name}`);
        await loadRows();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "Không xoá được sản phẩm");
      }
    },
    [loadRows, message],
  );

  const loadVariants = useCallback(
    async (productId: string) => {
      if (variantsByProduct[productId] || loadingVariants[productId]) return;

      setLoadingVariants((current) => ({ ...current, [productId]: true }));
      try {
        const variants = await listProductVariants(productId);
        setVariantsByProduct((current) => ({ ...current, [productId]: variants }));
      } catch (error) {
        message.error(error instanceof Error ? error.message : "Không tải được danh sách phiên bản");
      } finally {
        setLoadingVariants((current) => ({ ...current, [productId]: false }));
      }
    },
    [loadingVariants, message, variantsByProduct],
  );

  /** Đồng bộ lại số tồn hiển thị sau khi điều chỉnh kho, không cần tải lại cả trang */
  const applyVariantUpdate = (updated: ProductVariant) => {
    setVariantsByProduct((current) => {
      const variants = current[updated.productId];
      if (!variants) return current;
      return {
        ...current,
        [updated.productId]: variants.map((item) => (item.id === updated.id ? updated : item)),
      };
    });

    setRows((current) =>
      current.map((product) =>
        product.id === updated.productId
          ? {
              ...product,
              variants: product.variants.map((item) => (item.id === updated.id ? updated : item)),
              totalStock: product.hasVariants
                ? product.totalStock
                : updated.stock,
            }
          : product,
      ),
    );
  };

  const columns = useMemo<ColumnsType<Product>>(
    () => [
      {
        title: "Sản phẩm",
        dataIndex: "name",
        fixed: "left",
        width: 320,
        render: (_, record) => {
          const thumbnail = record.thumbnail ?? record.images[0];
          const defaultVariant = defaultVariantOf(record);

          return (
            <div className="flex min-w-0 items-center gap-3">
              <div className="bg-subtle border-line relative h-11 w-11 shrink-0 overflow-hidden rounded border">
                {thumbnail ? (
                  <Image
                    src={thumbnail}
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
                <div className="flex min-w-0 items-center gap-2">
                  <Link
                    href={routes.products.detail(record.id)}
                    className="line-clamp-1 font-semibold"
                  >
                    {record.name}
                  </Link>
                  <ProductTypeTag type={record.productType} />
                </div>
                {/* Master không còn SKU — một phiên bản thì hiện SKU của nó,
                    nhiều phiên bản thì hiện số lượng để khỏi chọn bừa một cái */}
                <div className="text-muted text-xs">
                  {record.hasVariants ? (
                    <span className="inline-flex items-center gap-1">
                      <Layers size={12} />
                      {formatNumber(record.variants.length || 0)} phiên bản
                    </span>
                  ) : (
                    (defaultVariant?.sku ?? "—")
                  )}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        title: "Danh mục",
        dataIndex: "categoryName",
        width: 140,
        render: (value?: string) => value || "—",
      },
      {
        title: "Thương hiệu",
        dataIndex: "brandName",
        width: 120,
        render: (value?: string) => value || "—",
      },
      {
        title: "Giá bán",
        key: "price",
        width: 200,
        align: "right",
        render: (_, record) => <PriceRangeText product={record} />,
      },
      {
        title: "Tồn kho",
        dataIndex: "totalStock",
        width: 110,
        align: "right",
        render: (value: number, record) => {
          if (record.productType === "service") {
            return (
              <Tooltip title="Dịch vụ không quản lý tồn kho">
                <span className="text-muted">—</span>
              </Tooltip>
            );
          }
          return (
            <span className={value === 0 ? "text-danger font-semibold" : ""}>
              {formatNumber(value)}
            </span>
          );
        },
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
        width: 130,
        align: "center",
        fixed: "right",
        render: (_, record) => {
          const defaultVariant = defaultVariantOf(record);
          // Sản phẩm nhiều phiên bản không biết chỉnh kho cho phiên bản nào,
          // nên phải vào tab Phiên bản chọn đúng dòng.
          const canQuickAdjust =
            !record.hasVariants &&
            !!defaultVariant &&
            defaultVariant.trackInventory &&
            defaultVariant.bundleInventoryPolicy !== "derived_from_components";

          return (
            <Space size="small">
              {canQuickAdjust && (
                <PermissionGate permission="inventory.manage">
                  <Tooltip title="Điều chỉnh tồn kho">
                    <Button
                      type="text"
                      size="small"
                      icon={<Warehouse size={16} />}
                      onClick={() => setAdjustingVariant(defaultVariant)}
                    />
                  </Tooltip>
                </PermissionGate>
              )}
              <Tooltip title="Sửa">
                <Link href={routes.products.detail(record.id)}>
                  <Button type="text" size="small" icon={<Pencil size={16} />} />
                </Link>
              </Tooltip>
              <Popconfirm
                title="Xoá sản phẩm này?"
                description="Xoá mềm, kéo theo toàn bộ biến thể."
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
          );
        },
      },
    ],
    // `handleDelete` đổi theo bộ lọc/trang hiện tại — phải nằm trong deps,
    // nếu không nút xoá sẽ tải lại danh sách theo bộ lọc của lần render đầu.
    [handleDelete],
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

        <FormItemLayout label="Loại sản phẩm">
          <Select
            allowClear
            placeholder="Tất cả loại"
            options={TYPE_OPTIONS}
            value={filters.productType}
            onChange={(productType) => patchFilters({ productType })}
            className="w-full"
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

        <PriceRangePresetFilter
          value={filters.priceRange}
          onChange={(priceRange) => patchFilters({ priceRange })}
          className="sm:col-span-2"
        />
      </SearchFilterBar>

      <DataTable<Product>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        expandable={{
          // Chỉ sản phẩm nhiều phiên bản mới có gì để bung
          rowExpandable: (record) => record.hasVariants,
          onExpand: (expanded, record) => {
            if (expanded) void loadVariants(record.id);
          },
          expandedRowRender: (record) => (
            <Table<ProductVariant>
              rowKey="id"
              size="small"
              columns={variantColumns}
              dataSource={variantsByProduct[record.id] ?? []}
              loading={loadingVariants[record.id]}
              pagination={false}
            />
          ),
        }}
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

      <AdjustStockModal
        variant={adjustingVariant}
        onClose={() => setAdjustingVariant(undefined)}
        onAdjusted={applyVariantUpdate}
      />
    </>
  );
}
