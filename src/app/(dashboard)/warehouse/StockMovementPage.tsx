"use client";

import { useMemo, useState } from "react";
import { App, Button, Input, Modal } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import {
  DatePickerPresetRange,
  resolvePreset,
  type DateRangeSearchValue,
} from "@/components/form/DatePickerPresetRange";
import { SelectField, TextAreaField, TextField } from "@/components/form/fields";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import { useListQuery } from "@/hooks/useListQuery";
import { fakeMutate, matchDateRange, matchText } from "@/lib/fakeFetch";
import { formatNumber } from "@/lib/utils";
import { productOptions } from "@/mock/products";
import type { StockMovement, StockMovementType } from "@/types/warehouse";

interface MovementFilters {
  keyword: string;
  dateRange: DateRangeSearchValue;
}

interface MovementFormValues {
  productId?: string;
  quantity?: number;
  partner: string;
  note: string;
}

interface StockMovementPageProps {
  type: StockMovementType;
  source: StockMovement[];
  title: string;
  description: string;
  /** Nhãn cột và trường "đối tác": nhà cung cấp khi nhập, lý do khi xuất */
  partnerLabel: string;
}

/**
 * Trang phiếu nhập và phiếu xuất chỉ khác nhãn và nguồn dữ liệu, nên dùng
 * chung một component thay vì nhân đôi hai trang gần như y hệt.
 */
export function StockMovementPage({
  type,
  source,
  title,
  description,
  partnerLabel,
}: StockMovementPageProps) {
  const { message } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { rows, loading, filters, patchFilters, search, reset, pagination } =
    useListQuery<StockMovement, MovementFilters>({
      source,
      initialFilters: { keyword: "", dateRange: resolvePreset("custom") },
      buildFilters: (f) => [
        matchText(f.keyword, (item) => [
          item.code,
          item.productName,
          item.sku,
          item.partner,
        ]),
        matchDateRange(
          f.dateRange.from,
          f.dateRange.to,
          (item) => item.createdAt,
        ),
      ],
    });

  const {
    control,
    handleSubmit,
    reset: resetForm,
  } = useForm<MovementFormValues>({
    defaultValues: { partner: "", note: "" },
  });

  const openModal = () => {
    resetForm({ partner: "", note: "", productId: undefined, quantity: undefined });
    setModalOpen(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    await fakeMutate(values);
    setSubmitting(false);
    setModalOpen(false);
    message.success(
      type === "in" ? "Đã tạo phiếu nhập kho" : "Đã tạo phiếu xuất kho",
    );
  });

  const columns = useMemo<ColumnsType<StockMovement>>(
    () => [
      { title: "Mã phiếu", dataIndex: "code", fixed: "left", width: 140 },
      {
        title: "Sản phẩm",
        dataIndex: "productName",
        width: 260,
        render: (name: string, record) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{name}</div>
            <div className="text-muted text-xs">{record.sku}</div>
          </div>
        ),
      },
      {
        title: "Số lượng",
        dataIndex: "quantity",
        width: 110,
        align: "right",
        sorter: (a, b) => a.quantity - b.quantity,
        render: (value: number) => (
          <span
            className={
              type === "in" ? "text-success font-semibold" : "text-danger font-semibold"
            }
          >
            {type === "in" ? "+" : "−"}
            {formatNumber(value)}
          </span>
        ),
      },
      { title: partnerLabel, dataIndex: "partner", width: 260 },
      { title: "Người tạo", dataIndex: "createdBy", width: 180 },
      {
        title: "Thời gian",
        dataIndex: "createdAt",
        width: 160,
        sorter: (a, b) => a.createdAt.localeCompare(b.createdAt),
        render: (value: string) => dayjs(value).format("HH:mm DD/MM/YYYY"),
      },
    ],
    [type, partnerLabel],
  );

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        extra={
          <Button type="primary" icon={<Plus size={16} />} onClick={openModal}>
            {type === "in" ? "Tạo phiếu nhập" : "Tạo phiếu xuất"}
          </Button>
        }
      />

      <SearchFilterBar onSearch={search} onReset={reset} loading={loading}>
        <FormItemLayout label="Mã phiếu / sản phẩm">
          <Input
            allowClear
            placeholder="Nhập mã phiếu, tên sản phẩm hoặc SKU"
            value={filters.keyword}
            onChange={(event) => patchFilters({ keyword: event.target.value })}
          />
        </FormItemLayout>

        <DatePickerPresetRange
          label="Thời gian tạo phiếu"
          value={filters.dateRange}
          onChange={(dateRange) => patchFilters({ dateRange })}
        />
      </SearchFilterBar>

      <DataTable<StockMovement>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={pagination}
      />

      <Modal
        title={type === "in" ? "Tạo phiếu nhập kho" : "Tạo phiếu xuất kho"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onSubmit}
        okText="Tạo phiếu"
        cancelText="Huỷ"
        confirmLoading={submitting}
        destroyOnHidden
      >
        <div className="space-y-4 pt-2">
          <SelectField
            name="productId"
            control={control}
            label="Sản phẩm"
            required
            options={productOptions}
            rules={{ required: "Vui lòng chọn sản phẩm" }}
          />
          <TextField
            name="quantity"
            control={control}
            label="Số lượng"
            type="number"
            required
            min={1}
            rules={{ required: "Vui lòng nhập số lượng" }}
          />
          <TextField
            name="partner"
            control={control}
            label={partnerLabel}
            required
            rules={{ required: `Vui lòng nhập ${partnerLabel.toLowerCase()}` }}
          />
          <TextAreaField
            name="note"
            control={control}
            label="Ghi chú"
            rows={2}
          />
        </div>
      </Modal>
    </>
  );
}

export default StockMovementPage;
