"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DragEndEvent, Modifier } from "@dnd-kit/core";
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { App, Button, Input, Select, Space, Switch, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Copy, ExternalLink, Pencil, Plus, Save, Trash2 } from "lucide-react";

import { DataTable, DragHandle, SortableRow } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import {
  deleteCarousel,
  listCarousels,
  reorderCarousels,
  updateCarousel,
} from "@/lib/api/carousels";
import { loadCatalogOptions } from "@/lib/api/catalog";
import { carouselViewAllUrl } from "@/lib/carouselFilter";
import { formatNumber } from "@/lib/utils";
import {
  CAROUSEL_SORT_LABEL,
  CAROUSEL_SORT_ORDER_LABEL,
  type Carousel,
} from "@/types/carousel";
import type { SelectOption } from "@/types/common";
import { PRODUCT_TYPE_LABEL } from "@/types/product";

import { CarouselFormModal } from "./_components/CarouselFormModal";

interface CarouselFilters {
  keyword: string;
  isActive?: boolean;
}

const DEFAULT_FILTERS: CarouselFilters = { keyword: "" };

/** Danh sách carousel luôn nhỏ và cần kéo-thả toàn cục nên nạp một lần, không phân trang. */
const FETCH_LIMIT = 100;

// Kéo-thả chỉ theo chiều dọc — chặn dòng đang kéo trôi ngang theo con trỏ.
const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

// Không để dnd-kit tự cuộn vùng ngang của Ant Design Table khi kéo sát mép;
// cuộn trang theo chiều dọc vẫn hoạt động nên không còn hiện tượng giật liên tục.
const canAutoScroll = (element: Element) => !element.classList.contains("ant-table-content");

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
  const [savedOrderIds, setSavedOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [updatingVisibilityId, setUpdatingVisibilityId] = useState<string>();
  const [filters, setFilters] = useState<CarouselFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<CarouselFilters>(DEFAULT_FILTERS);
  const [editing, setEditing] = useState<Carousel>();
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [brandOptions, setBrandOptions] = useState<SelectOption[]>([]);

  // Kéo-thả cần thấy đúng thứ tự TOÀN CỤC — đang lọc thì bảng chỉ còn một phần
  // carousel, kéo-thả lúc đó sẽ ghi đè sai thứ tự của những dòng đang bị ẩn.
  // Nên chỉ cho sắp xếp khi không áp dụng bộ lọc nào.
  const filtersActive = !!appliedFilters.keyword || appliedFilters.isActive !== undefined;

  const orderDirty = useMemo(
    () => rows.map((row) => row.id).join() !== savedOrderIds.join(),
    [rows, savedOrderIds],
  );

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listCarousels({
        page: 1,
        limit: FETCH_LIMIT,
        search: appliedFilters.keyword,
        isActive: appliedFilters.isActive,
        sortBy: "sortOrder",
        sortOrder: "ASC",
        withProductCount: true,
      });
      setRows(response.data);
      setSavedOrderIds(response.data.map((carousel) => carousel.id));
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tải được danh sách carousel");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters.isActive, appliedFilters.keyword, message]);

  useEffect(() => {
    queueMicrotask(() => void loadRows());
  }, [loadRows]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setRows((prev) => {
      const from = prev.findIndex((item) => item.id === active.id);
      const to = prev.findIndex((item) => item.id === over.id);
      if (from === -1 || to === -1) return prev;
      return arrayMove(prev, from, to);
    });
  }, []);

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    try {
      await reorderCarousels(rows.map((row, index) => ({ id: row.id, sortOrder: index })));
      setSavedOrderIds(rows.map((row) => row.id));
      message.success("Đã cập nhật thứ tự hiển thị");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không cập nhật được thứ tự");
    } finally {
      setSavingOrder(false);
    }
  };

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

  const handleToggleVisibility = useCallback(
    async (record: Carousel, isActive: boolean) => {
      setUpdatingVisibilityId(record.id);
      try {
        await updateCarousel(record.id, { isActive });
        message.success(isActive ? "Đã bật hiển thị carousel" : "Đã tắt hiển thị carousel");
        await loadRows();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "Không cập nhật được trạng thái carousel");
      } finally {
        setUpdatingVisibilityId(undefined);
      }
    },
    [loadRows, message],
  );

  const columns = useMemo<ColumnsType<Carousel>>(
    () => [
      // Kéo-thả chỉ khả dụng khi đang xem toàn bộ danh sách (không lọc) — xem
      // giải thích ở `filtersActive`.
      ...(filtersActive
        ? []
        : [{ key: "sort", width: 40, align: "center" as const, render: () => <DragHandle /> }]),
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
      {
        title: "Hiển thị",
        dataIndex: "isActive",
        width: 120,
        align: "center",
        render: (isActive: boolean, record) => (
          <Switch
            checked={isActive}
            checkedChildren="Bật"
            unCheckedChildren="Tắt"
            loading={updatingVisibilityId === record.id}
            onChange={(checked) => void handleToggleVisibility(record, checked)}
            aria-label={`${isActive ? "Tắt" : "Bật"} hiển thị carousel ${record.name}`}
          />
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
    [
      brandOptions,
      categoryOptions,
      filtersActive,
      handleToggleVisibility,
      loadRows,
      message,
      modal,
      updatingVisibilityId,
    ],
  );

  const search = () => {
    setAppliedFilters({ ...filters });
  };

  const reset = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  };

  return (
    <>
      <PageHeader
        title="Carousel sản phẩm"
        description="Các khối sản phẩm trên storefront — lấy hàng theo bộ lọc, không gắn tay từng sản phẩm"
        extra={
          <Space>
            <Tooltip
              title={
                filtersActive
                  ? "Bỏ lọc để sắp xếp lại thứ tự"
                  : orderDirty
                    ? undefined
                    : "Kéo tay cầm ở đầu hàng để đổi thứ tự"
              }
            >
              <Button
                icon={<Save size={16} />}
                disabled={filtersActive || !orderDirty}
                loading={savingOrder}
                onClick={() => void handleSaveOrder()}
              >
                Cập nhật thứ tự
              </Button>
            </Tooltip>
            <Button type="primary" icon={<Plus size={16} />} onClick={() => openModal()}>
              Tạo carousel
            </Button>
          </Space>
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

      <DndContext
        sensors={sensors}
        modifiers={[restrictToVerticalAxis]}
        autoScroll={{ canScroll: canAutoScroll }}
        onDragEnd={filtersActive ? undefined : handleDragEnd}
      >
        <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
          <DataTable<Carousel>
            rowKey="id"
            columns={columns}
            dataSource={rows}
            loading={loading}
            emptyText="Chưa có carousel nào"
            pagination={false}
            components={filtersActive ? undefined : { body: { row: SortableRow } }}
          />
        </SortableContext>
      </DndContext>

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
