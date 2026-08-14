"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { App, Button, Input, InputNumber, Space, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SorterResult } from "antd/es/table/interface";
import dayjs from "dayjs";
import { ImageOff, PackageMinus, PackagePlus } from "lucide-react";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { StockLevelTag } from "@/components/common/StatusTag";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import routes from "@/config/routes";
import { listInventoryStock } from "@/lib/api/inventory";
import { formatNumber } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE } from "@/types/common";
import {
  inventoryStockLevelOf,
  type InventoryStockItem,
  type InventoryTransactionType,
} from "@/types/inventory";

import { InventoryMovementModal } from "./_components/InventoryMovementModal";

interface StockFilters {
  keyword: string;
  minStock?: number;
  maxStock?: number;
}

const DEFAULT_FILTERS: StockFilters = { keyword: "" };

interface StockSort {
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

/** Hàng sắp hết cần thấy trước, nên mặc định tồn tăng dần thay vì mới nhất trước */
const DEFAULT_SORT: StockSort = { sortBy: "stock", sortOrder: "ASC" };

/**
 * Tồn kho theo **biến thể** (`GET /inventory/stock`) — mỗi dòng là một SKU bán
 * được, kèm tổng đã nhập/đã bán từ trước tới nay.
 *
 * Lọc và sắp xếp đều chạy ở server để số liệu khớp với phân trang; vì vậy
 * "sắp hết hàng" không có ô lọc riêng (contract chỉ nhận khoảng `minStock`/
 * `maxStock`) — thay vào đó mặc định sắp xếp tồn tăng dần và mỗi dòng có nhãn
 * tình trạng tính từ ngưỡng cảnh báo của chính biến thể đó.
 */
export default function WarehousePage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<InventoryStockItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<StockFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<StockFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  /** Modal nhập/xuất: mở từ nút ở header thì chưa chọn biến thể, mở từ dòng thì chọn sẵn */
  const [movement, setMovement] = useState<{
    type: InventoryTransactionType;
    item?: InventoryStockItem;
  }>();

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listInventoryStock({
        page,
        limit: pageSize,
        search: appliedFilters.keyword,
        minStock: appliedFilters.minStock,
        maxStock: appliedFilters.maxStock,
        sortBy: sort.sortBy,
        sortOrder: sort.sortOrder,
      });
      setRows(response.data);
      setTotal(response.total);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tải được tồn kho");
    } finally {
      setLoading(false);
    }
  }, [
    appliedFilters.keyword,
    appliedFilters.maxStock,
    appliedFilters.minStock,
    message,
    page,
    pageSize,
    sort.sortBy,
    sort.sortOrder,
  ]);

  useEffect(() => {
    queueMicrotask(() => void loadRows());
  }, [loadRows]);

  const columns = useMemo<ColumnsType<InventoryStockItem>>(
    () => [
      {
        title: "Sản phẩm",
        dataIndex: "productName",
        fixed: "left",
        width: 300,
        render: (productName: string, record) => (
          <div className="flex items-center gap-2">
            <div className="bg-subtle relative h-10 w-10 shrink-0 overflow-hidden rounded">
              {record.thumbnail ? (
                <Image
                  src={record.thumbnail}
                  alt=""
                  fill
                  unoptimized
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <span className="text-muted flex h-full w-full items-center justify-center">
                  <ImageOff size={14} />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold">
                {record.productId ? (
                  <Link href={routes.products.detail(record.productId)}>{productName}</Link>
                ) : (
                  productName
                )}
              </div>
              <div className="text-muted truncate text-xs">
                {record.sku}
                {record.variantName ? ` · ${record.variantName}` : ""}
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Tồn kho",
        dataIndex: "stock",
        width: 110,
        align: "right",
        sorter: true,
        defaultSortOrder: "ascend",
        render: (value: number) => <span className="font-semibold">{formatNumber(value)}</span>,
      },
      {
        title: "Ngưỡng cảnh báo",
        dataIndex: "lowStockThreshold",
        width: 140,
        align: "right",
        render: (value: number) => (value > 0 ? formatNumber(value) : "—"),
      },
      {
        title: "Đã nhập",
        dataIndex: "totalIn",
        width: 110,
        align: "right",
        render: (value: number) => formatNumber(value),
      },
      {
        title: "Đã bán",
        dataIndex: "totalSold",
        width: 110,
        align: "right",
        render: (value: number) => formatNumber(value),
      },
      {
        title: "Tình trạng",
        key: "level",
        width: 130,
        align: "center",
        render: (_, record) => <StockLevelTag level={inventoryStockLevelOf(record)} />,
      },
      {
        title: "Cập nhật",
        dataIndex: "updatedAt",
        width: 120,
        render: (value?: string) => (value ? dayjs(value).format("DD/MM/YYYY") : "—"),
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 100,
        align: "center",
        fixed: "right",
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="Nhập kho">
              <Button
                type="text"
                size="small"
                icon={<PackagePlus size={16} />}
                onClick={() => setMovement({ type: "in", item: record })}
              />
            </Tooltip>
            <Tooltip title="Xuất kho">
              <Button
                type="text"
                size="small"
                danger
                icon={<PackageMinus size={16} />}
                onClick={() => setMovement({ type: "out", item: record })}
              />
            </Tooltip>
          </Space>
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
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setSort(DEFAULT_SORT);
  };

  /**
   * Sắp xếp chạy ở server nên phải bắt từ Table thay vì để antd tự sắp trên
   * trang hiện tại. `onChange` của Table còn bắn cả khi đổi trang, nên phải bỏ
   * qua lần không đổi gì — nếu không, mỗi lần sang trang sẽ gọi API hai lần.
   */
  const onTableChange = (
    _pagination: unknown,
    _filters: unknown,
    sorter: SorterResult<InventoryStockItem> | SorterResult<InventoryStockItem>[],
  ) => {
    const single = Array.isArray(sorter) ? sorter[0] : sorter;
    const next: StockSort = single?.order
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
        title="Tồn kho"
        description="Tồn hiện tại của từng biến thể, kèm tổng đã nhập và đã bán"
        extra={
          <Space>
            <Button icon={<PackagePlus size={16} />} onClick={() => setMovement({ type: "in" })}>
              Nhập kho
            </Button>
            <Button
              danger
              icon={<PackageMinus size={16} />}
              onClick={() => setMovement({ type: "out" })}
            >
              Xuất kho
            </Button>
          </Space>
        }
      />

      <SearchFilterBar onSearch={search} onReset={reset} loading={loading}>
        <FormItemLayout label="Sản phẩm / SKU">
          <Input
            allowClear
            placeholder="Nhập tên sản phẩm, tên biến thể hoặc SKU"
            value={filters.keyword}
            onChange={(event) =>
              setFilters((current) => ({ ...current, keyword: event.target.value }))
            }
          />
        </FormItemLayout>

        <FormItemLayout label="Khoảng tồn">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <InputNumber
              min={0}
              placeholder="Từ"
              value={filters.minStock}
              onChange={(value) =>
                setFilters((current) => ({ ...current, minStock: value ?? undefined }))
              }
              className="w-full"
            />
            <span className="text-muted text-sm">-</span>
            <InputNumber
              min={0}
              placeholder="Đến"
              value={filters.maxStock}
              onChange={(value) =>
                setFilters((current) => ({ ...current, maxStock: value ?? undefined }))
              }
              className="w-full"
            />
          </div>
        </FormItemLayout>
      </SearchFilterBar>

      <DataTable<InventoryStockItem>
        rowKey="variantId"
        columns={columns}
        dataSource={rows}
        loading={loading}
        onChange={onTableChange}
        emptyText="Chưa có biến thể nào khớp bộ lọc"
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

      <InventoryMovementModal
        type={movement?.type ?? "in"}
        open={!!movement}
        item={movement?.item}
        onClose={() => setMovement(undefined)}
        onDone={() => void loadRows()}
      />
    </>
  );
}
