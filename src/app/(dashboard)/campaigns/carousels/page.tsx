"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Button, Input, Select, Space, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Copy, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import { deleteCarousel, listCarousels } from "@/lib/api/carousels";
import { loadCatalogOptions } from "@/lib/api/catalog";
import { carouselViewAllUrl } from "@/lib/carouselFilter";
import { formatNumber } from "@/lib/utils";
import {
  CAROUSEL_SORT_LABEL,
  CAROUSEL_SORT_ORDER_LABEL,
  type Carousel,
} from "@/types/carousel";
import { DEFAULT_PAGE_SIZE, type SelectOption } from "@/types/common";
import { PRODUCT_TYPE_LABEL } from "@/types/product";

import { CarouselFormModal } from "./_components/CarouselFormModal";

interface CarouselFilters {
  keyword: string;
  isActive?: boolean;
}

const DEFAULT_FILTERS: CarouselFilters = { keyword: "" };

const STATUS_OPTIONS: SelectOption<string>[] = [
  { label: "Đang hiển thị", value: "true" },
  { label: "Đang tắt", value: "false" },
];

function labelOf(options: SelectOption[], value?: string) {
  if (!value) return undefined;
  return options.find((option) => option.value === value)?.label ?? value;
}

/** Tóm tắt bộ lọc thành các chip ngắn để đọc lướt được ngay trên bảng */
function filterSummary(
  carousel: Carousel,
  categoryOptions: SelectOption[],
  brandOptions: SelectOption[],
): string[] {
  const { filters } = carousel;
  const chips: string[] = [];

  const category = labelOf(categoryOptions, filters.categoryId);
  if (category) {
    chips.push(filters.includeSubCategories ? `${category} (+ danh mục con)` : category);
  }

  const brand = labelOf(brandOptions, filters.brandId);
  if (brand) chips.push(brand);

  if (filters.productType) chips.push(PRODUCT_TYPE_LABEL[filters.productType]);
  if (filters.search) chips.push(`Từ khoá: ${filters.search}`);
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    chips.push(
      `Giá ${filters.minPrice !== undefined ? formatNumber(filters.minPrice) : "0"}–${
        filters.maxPrice !== undefined ? formatNumber(filters.maxPrice) : "∞"
      }`,
    );
  }
  if (filters.inStock) chips.push("Còn hàng");
  if (filters.isFeatured) chips.push("Nổi bật");

  chips.push(
    `${CAROUSEL_SORT_LABEL[filters.sortBy ?? "createdAt"]} · ${
      CAROUSEL_SORT_ORDER_LABEL[filters.sortOrder ?? "DESC"]
    }`,
  );

  return chips;
}

/**
 * Danh sách carousel của campaign. Mỗi carousel là một khối sản phẩm trên
 * storefront, lấy hàng theo bộ lọc chứ không gắn tay từng sản phẩm — nên bảng
 * này hiển thị luôn tóm tắt bộ lọc và link "Xem tất cả" mà client sẽ dùng.
 */
export default function CarouselsPage() {
  const { message, modal } = App.useApp();
  const [rows, setRows] = useState<Carousel[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CarouselFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<CarouselFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [editing, setEditing] = useState<Carousel>();
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [brandOptions, setBrandOptions] = useState<SelectOption[]>([]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listCarousels({
        page,
        limit: pageSize,
        search: appliedFilters.keyword,
        isActive: appliedFilters.isActive,
        sortBy: "sortOrder",
        sortOrder: "ASC",
        withProductCount: true,
      });
      setRows(response.data);
      setTotal(response.total);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tải được danh sách carousel");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters.isActive, appliedFilters.keyword, message, page, pageSize]);

  useEffect(() => {
    queueMicrotask(() => void loadRows());
  }, [loadRows]);

  // Dropdown danh mục/thương hiệu dùng cho cả form lẫn phần tóm tắt bộ lọc,
  // nên nạp một lần ở trang thay vì mỗi lần mở modal.
  useEffect(() => {
    queueMicrotask(() =>
      void loadCatalogOptions()
        .then((options) => {
          setCategoryOptions(options.categoryOptions);
          setBrandOptions(options.brandOptions);
        })
        .catch(() => {
          // Mất dropdown không chặn được việc xem danh sách carousel
        }),
    );
  }, []);

  const openModal = (carousel?: Carousel) => {
    setEditing(carousel);
    setModalOpen(true);
  };

  const copyLink = async (carousel: Carousel) => {
    try {
      await navigator.clipboard.writeText(carouselViewAllUrl(carousel.filterQuery));
      message.success("Đã copy link xem tất cả");
    } catch {
      message.error("Trình duyệt không cho phép copy tự động");
    }
  };

  const handleDelete = (record: Carousel) => {
    modal.confirm({
      title: `Xoá carousel ${record.name}?`,
      content: "Storefront sẽ ẩn khối này ngay sau khi xoá. Thao tác không thể hoàn tác.",
      okText: "Xoá",
      cancelText: "Huỷ",
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteCarousel(record.id);
        message.success("Đã xoá carousel");
        await loadRows();
      },
    });
  };

  const columns = useMemo<ColumnsType<Carousel>>(
    () => [
      {
        title: "Carousel",
        dataIndex: "name",
        width: 220,
        render: (_, record) => (
          <div className="min-w-0">
            <p className="text-fg truncate font-medium">{record.name}</p>
            <code className="text-muted text-xs">{record.slug}</code>
            {record.subtitle && <p className="text-muted truncate text-xs">{record.subtitle}</p>}
          </div>
        ),
      },
      {
        title: "Bộ lọc",
        key: "filter",
        width: 320,
        render: (_, record) => (
          <div className="flex flex-wrap gap-1">
            {filterSummary(record, categoryOptions, brandOptions).map((chip) => (
              <Tag key={chip} className="m-0">
                {chip}
              </Tag>
            ))}
          </div>
        ),
      },
      {
        title: "Số sản phẩm",
        dataIndex: "itemLimit",
        width: 130,
        align: "right",
        render: (itemLimit: number, record) => (
          <div className="text-right">
            <p>{formatNumber(itemLimit)}</p>
            {record.productCount !== undefined && record.productCount !== null && (
              <p className="text-muted text-xs">khớp {formatNumber(record.productCount)}</p>
            )}
          </div>
        ),
      },
      { title: "Thứ tự", dataIndex: "sortOrder", width: 80, align: "right" },
      {
        title: "Trạng thái",
        dataIndex: "isActive",
        width: 120,
        render: (isActive: boolean) => (
          <Tag color={isActive ? "green" : "default"}>
            {isActive ? "Đang hiển thị" : "Đang tắt"}
          </Tag>
        ),
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 130,
        align: "center",
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="Copy link xem tất cả">
              <Button
                type="text"
                size="small"
                icon={<Copy size={16} />}
                onClick={() => void copyLink(record)}
              />
            </Tooltip>
            <Tooltip title="Mở trang danh sách theo bộ lọc này">
              <Button
                type="text"
                size="small"
                icon={<ExternalLink size={16} />}
                href={carouselViewAllUrl(record.filterQuery)}
                target="_blank"
                rel="noreferrer"
              />
            </Tooltip>
            <Tooltip title="Sửa">
              <Button
                type="text"
                size="small"
                icon={<Pencil size={16} />}
                onClick={() => openModal(record)}
              />
            </Tooltip>
            <Tooltip title="Xoá">
              <Button
                type="text"
                size="small"
                danger
                icon={<Trash2 size={16} />}
                onClick={() => handleDelete(record)}
              />
            </Tooltip>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [brandOptions, categoryOptions, message, modal, loadRows],
  );

  const search = () => {
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const reset = () => {
    setPage(1);
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  };

  return (
    <>
      <PageHeader
        title="Carousel sản phẩm"
        description="Các khối sản phẩm trên storefront — lấy hàng theo bộ lọc, không gắn tay từng sản phẩm"
        extra={
          <Button type="primary" icon={<Plus size={16} />} onClick={() => openModal()}>
            Tạo carousel
          </Button>
        }
      />

      <SearchFilterBar onSearch={search} onReset={reset} loading={loading}>
        <FormItemLayout label="Tên carousel">
          <Input
            allowClear
            placeholder="Nhập tên hoặc slug"
            value={filters.keyword}
            onChange={(event) =>
              setFilters((current) => ({ ...current, keyword: event.target.value }))
            }
          />
        </FormItemLayout>

        <FormItemLayout label="Trạng thái">
          <Select
            allowClear
            placeholder="Tất cả"
            options={STATUS_OPTIONS}
            value={filters.isActive === undefined ? undefined : String(filters.isActive)}
            onChange={(value?: string) =>
              setFilters((current) => ({
                ...current,
                isActive: value === undefined ? undefined : value === "true",
              }))
            }
            className="w-full"
          />
        </FormItemLayout>
      </SearchFilterBar>

      <DataTable<Carousel>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        emptyText="Chưa có carousel nào"
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

      <CarouselFormModal
        open={modalOpen}
        carousel={editing}
        categoryOptions={categoryOptions}
        brandOptions={brandOptions}
        onClose={() => setModalOpen(false)}
        onSaved={() => void loadRows()}
      />
    </>
  );
}
