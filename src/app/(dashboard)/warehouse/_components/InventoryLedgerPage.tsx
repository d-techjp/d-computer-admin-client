"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { App, Button, Input, Select, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { PackageMinus, PackagePlus } from "lucide-react";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import {
  DatePickerPresetRange,
  DEFAULT_DATE_RANGE,
  type DateRangeSearchValue,
} from "@/components/form/DatePickerPresetRange";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import routes from "@/config/routes";
import { listInventoryTransactions } from "@/lib/api/inventory";
import { formatNumber } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE } from "@/types/common";
import {
  INVENTORY_FILTER_REASONS,
  INVENTORY_REASON_LABEL,
  INVENTORY_REFERENCE_TYPE_LABEL,
  type InventoryReasonCode,
  type InventoryReferenceType,
  type InventoryTransaction,
  type InventoryTransactionType,
} from "@/types/inventory";

import { InventoryMovementModal } from "./InventoryMovementModal";

interface LedgerFilters {
  keyword: string;
  reasonCode?: InventoryReasonCode;
  referenceType?: InventoryReferenceType;
  dateRange: DateRangeSearchValue;
}

const DEFAULT_FILTERS: LedgerFilters = { keyword: "", dateRange: DEFAULT_DATE_RANGE };

const REFERENCE_OPTIONS = Object.entries(INVENTORY_REFERENCE_TYPE_LABEL).map(
  ([value, label]) => ({ label, value }),
);

interface InventoryLedgerPageProps {
  type: InventoryTransactionType;
  title: string;
  description: string;
}

/**
 * Sổ nhập kho / sổ xuất kho — cùng một `GET /inventory/transactions`, chỉ khác
 * `type`, nên dùng chung một component thay vì nhân đôi hai trang gần y hệt.
 *
 * Đây là **sổ ghi**, không phải phiếu kho: mỗi dòng là một lần tồn kho đổi, kể
 * cả những lần do đơn hàng tự sinh (`Từ đơn hàng`) — không chỉnh sửa hay xoá
 * được, muốn bù trừ thì tạo một giao dịch ngược lại.
 */
export function InventoryLedgerPage({ type, title, description }: InventoryLedgerPageProps) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<InventoryTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LedgerFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<LedgerFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [modalOpen, setModalOpen] = useState(false);

  const isImport = type === "in";

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listInventoryTransactions({
        page,
        limit: pageSize,
        type,
        search: appliedFilters.keyword,
        reasonCode: appliedFilters.reasonCode,
        referenceType: appliedFilters.referenceType,
        from: appliedFilters.dateRange.from,
        to: appliedFilters.dateRange.to,
        sortBy: "createdAt",
        sortOrder: "DESC",
      });
      setRows(response.data);
      setTotal(response.total);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tải được sổ kho");
    } finally {
      setLoading(false);
    }
  }, [
    appliedFilters.dateRange.from,
    appliedFilters.dateRange.to,
    appliedFilters.keyword,
    appliedFilters.reasonCode,
    appliedFilters.referenceType,
    message,
    page,
    pageSize,
    type,
  ]);

  useEffect(() => {
    queueMicrotask(() => void loadRows());
  }, [loadRows]);

  const columns = useMemo<ColumnsType<InventoryTransaction>>(
    () => [
      {
        title: "Thời gian",
        dataIndex: "createdAt",
        fixed: "left",
        width: 150,
        render: (value: string) => dayjs(value).format("HH:mm DD/MM/YYYY"),
      },
      {
        title: "Sản phẩm",
        dataIndex: "productName",
        width: 280,
        render: (productName: string, record) => (
          <div className="min-w-0">
            <div className="truncate font-medium">
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
        ),
      },
      {
        title: "Số lượng",
        dataIndex: "quantity",
        width: 110,
        align: "right",
        render: (value: number) => (
          <span className={isImport ? "text-success font-semibold" : "text-danger font-semibold"}>
            {isImport ? "+" : "−"}
            {formatNumber(value)}
          </span>
        ),
      },
      {
        title: "Tồn sau",
        dataIndex: "stockAfter",
        width: 100,
        align: "right",
        render: (value?: number) => (value === undefined ? "—" : formatNumber(value)),
      },
      {
        title: "Lý do",
        dataIndex: "reasonCode",
        width: 170,
        render: (reasonCode: InventoryReasonCode) => INVENTORY_REASON_LABEL[reasonCode],
      },
      {
        title: "Nguồn",
        dataIndex: "referenceType",
        width: 160,
        render: (referenceType: InventoryReferenceType, record) => (
          <div className="flex items-center gap-2">
            <Tag color={referenceType === "order" ? "blue" : "default"} className="m-0">
              {INVENTORY_REFERENCE_TYPE_LABEL[referenceType]}
            </Tag>
            {referenceType === "order" && record.referenceId && (
              <Link
                href={routes.orders.detail(record.referenceId)}
                className="truncate text-xs"
              >
                {record.referenceCode || "Xem đơn"}
              </Link>
            )}
          </div>
        ),
      },
      {
        title: "Người thực hiện",
        dataIndex: "performedByName",
        width: 170,
        render: (value?: string) => value || "Hệ thống",
      },
      {
        title: "Ghi chú",
        dataIndex: "note",
        width: 240,
        render: (value?: string) =>
          value ? (
            <Tooltip title={value}>
              <span className="line-clamp-2">{value}</span>
            </Tooltip>
          ) : (
            "—"
          ),
      },
    ],
    [isImport],
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
        title={title}
        description={description}
        extra={
          <Button
            type="primary"
            danger={!isImport}
            icon={isImport ? <PackagePlus size={16} /> : <PackageMinus size={16} />}
            onClick={() => setModalOpen(true)}
          >
            {isImport ? "Nhập kho" : "Xuất kho"}
          </Button>
        }
      />

      <SearchFilterBar onSearch={search} onReset={reset} loading={loading}>
        <FormItemLayout label="Sản phẩm / SKU">
          <Input
            allowClear
            placeholder="Nhập tên sản phẩm hoặc SKU"
            value={filters.keyword}
            onChange={(event) =>
              setFilters((current) => ({ ...current, keyword: event.target.value }))
            }
          />
        </FormItemLayout>

        <FormItemLayout label="Lý do">
          <Select
            allowClear
            placeholder="Tất cả lý do"
            options={INVENTORY_FILTER_REASONS[type].map((code) => ({
              value: code,
              label: INVENTORY_REASON_LABEL[code],
            }))}
            value={filters.reasonCode}
            onChange={(reasonCode?: InventoryReasonCode) =>
              setFilters((current) => ({ ...current, reasonCode }))
            }
            className="w-full"
          />
        </FormItemLayout>

        <FormItemLayout label="Nguồn">
          <Select
            allowClear
            placeholder="Tất cả nguồn"
            options={REFERENCE_OPTIONS}
            value={filters.referenceType}
            onChange={(referenceType?: InventoryReferenceType) =>
              setFilters((current) => ({ ...current, referenceType }))
            }
            className="w-full"
          />
        </FormItemLayout>

        <DatePickerPresetRange
          label="Thời gian"
          value={filters.dateRange}
          onChange={(dateRange) => setFilters((current) => ({ ...current, dateRange }))}
        />
      </SearchFilterBar>

      <DataTable<InventoryTransaction>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        emptyText={`Chưa có giao dịch ${isImport ? "nhập" : "xuất"} kho nào`}
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
        type={type}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onDone={() => void loadRows()}
      />
    </>
  );
}

export default InventoryLedgerPage;
