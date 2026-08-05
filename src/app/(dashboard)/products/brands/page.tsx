"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Button, Input, Modal, Space, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { TextField } from "@/components/form/fields";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import { createBrand, deleteBrand, listBrands, updateBrand } from "@/lib/api/catalog";
import { formatNumber } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE } from "@/types/common";
import type { Brand } from "@/types/product";

interface BrandFilters {
  keyword: string;
}

interface BrandFormValues {
  name: string;
  slug?: string;
  country?: string;
}

export default function BrandsPage() {
  const { message, modal } = App.useApp();
  const [rows, setRows] = useState<Brand[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<BrandFilters>({ keyword: "" });
  const [appliedFilters, setAppliedFilters] = useState<BrandFilters>({ keyword: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listBrands({
        page,
        limit: pageSize,
        search: appliedFilters.keyword,
        sortBy: "createdAt",
        sortOrder: "DESC",
      });
      setRows(response.data);
      setTotal(response.total);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tải được thương hiệu");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters.keyword, message, page, pageSize]);

  useEffect(() => {
    queueMicrotask(() => void loadRows());
  }, [loadRows]);

  const { control, handleSubmit, reset: resetForm } = useForm<BrandFormValues>({
    defaultValues: { name: "", slug: "", country: "" },
  });

  const openModal = (brand?: Brand) => {
    setEditing(brand ?? null);
    resetForm({
      name: brand?.name ?? "",
      slug: brand?.slug ?? "",
      country: brand?.country ?? "",
    });
    setModalOpen(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        slug: values.slug,
        country: values.country,
        isActive: true,
      };

      if (editing) {
        await updateBrand(editing.id, payload);
      } else {
        await createBrand({ ...payload, name: values.name });
      }

      setModalOpen(false);
      message.success(
        editing ? `Đã cập nhật thương hiệu ${values.name}` : "Đã thêm thương hiệu mới",
      );
      await loadRows();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không lưu được thương hiệu");
    } finally {
      setSubmitting(false);
    }
  });

  const handleDelete = (record: Brand) => {
    modal.confirm({
      title: `Xoá thương hiệu ${record.name}?`,
      content:
        record.productCount > 0
          ? `Thương hiệu đang gắn với ${record.productCount} sản phẩm.`
          : "Thao tác không thể hoàn tác.",
      okText: "Xoá",
      cancelText: "Huỷ",
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteBrand(record.id);
        message.success("Đã xoá thương hiệu");
        await loadRows();
      },
    });
  };

  const columns = useMemo<ColumnsType<Brand>>(
    () => [
      { title: "Thương hiệu", dataIndex: "name", width: 200 },
      { title: "Đường dẫn", dataIndex: "slug", width: 180 },
      { title: "Xuất xứ", dataIndex: "country", width: 160, render: (value?: string) => value || "—" },
      {
        title: "Số sản phẩm",
        dataIndex: "productCount",
        width: 120,
        align: "right",
        render: (value: number) => formatNumber(value),
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 100,
        align: "center",
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="Sửa">
              <Button type="text" size="small" icon={<Pencil size={16} />} onClick={() => openModal(record)} />
            </Tooltip>
            <Tooltip title="Xoá">
              <Button type="text" size="small" danger icon={<Trash2 size={16} />} onClick={() => handleDelete(record)} />
            </Tooltip>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modal, message, loadRows],
  );

  const patchFilters = (patch: Partial<BrandFilters>) => {
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

  return (
    <>
      <PageHeader
        title="Thương hiệu"
        description="Danh sách hãng sản xuất đang phân phối tại cửa hàng"
        extra={
          <Button type="primary" icon={<Plus size={16} />} onClick={() => openModal()}>
            Thêm thương hiệu
          </Button>
        }
      />

      <SearchFilterBar onSearch={search} onReset={reset} loading={loading}>
        <FormItemLayout label="Tên thương hiệu">
          <Input
            allowClear
            placeholder="Nhập tên hoặc xuất xứ"
            value={filters.keyword}
            onChange={(event) => patchFilters({ keyword: event.target.value })}
          />
        </FormItemLayout>
      </SearchFilterBar>

      <DataTable<Brand>
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

      <Modal
        title={editing ? "Chỉnh sửa thương hiệu" : "Thêm thương hiệu"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onSubmit}
        okText={editing ? "Lưu" : "Thêm"}
        cancelText="Huỷ"
        confirmLoading={submitting}
        destroyOnHidden
      >
        <div className="space-y-4 pt-2">
          <TextField
            name="name"
            control={control}
            label="Tên thương hiệu"
            required
            rules={{ required: "Vui lòng nhập tên thương hiệu" }}
          />
          <TextField
            name="slug"
            control={control}
            label="Đường dẫn"
            helpText="Bỏ trống để backend tự sinh từ tên thương hiệu"
          />
          <TextField name="country" control={control} label="Xuất xứ" />
        </div>
      </Modal>
    </>
  );
}
