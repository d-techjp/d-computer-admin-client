"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Button, Input, Modal, Select, Space, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { SelectField, TextField } from "@/components/form/fields";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import {
  categoryOptionsFrom,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/lib/api/catalog";
import { formatNumber } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, type SelectOption } from "@/types/common";
import type { Category } from "@/types/product";

interface CategoryFilters {
  keyword: string;
  parentId?: string;
}

interface CategoryFormValues {
  name: string;
  slug?: string;
  parentId?: string;
}

export default function CategoriesPage() {
  const { message, modal } = App.useApp();
  const [rows, setRows] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CategoryFilters>({ keyword: "" });
  const [appliedFilters, setAppliedFilters] = useState<CategoryFilters>({ keyword: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [parentOptions, setParentOptions] = useState<SelectOption[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listCategories({
        page,
        limit: pageSize,
        search: appliedFilters.keyword,
        parentId: appliedFilters.parentId,
        sortBy: "createdAt",
        sortOrder: "DESC",
      });
      setRows(response.data);
      setTotal(response.total);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tải được danh mục");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, message, page, pageSize]);

  const loadParentOptions = useCallback(async () => {
    try {
      const response = await listCategories({
        page: 1,
        limit: 100,
        rootOnly: true,
        sortBy: "name",
        sortOrder: "ASC",
      });
      setParentOptions(categoryOptionsFrom(response.data));
    } catch {
      setParentOptions([]);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadRows());
  }, [loadRows]);

  useEffect(() => {
    queueMicrotask(() => void loadParentOptions());
  }, [loadParentOptions]);

  const { control, handleSubmit, reset: resetForm } = useForm<CategoryFormValues>({
    defaultValues: { name: "", slug: "" },
  });

  const openModal = (category?: Category) => {
    setEditing(category ?? null);
    resetForm({
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      parentId: category?.parentId,
    });
    setModalOpen(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        slug: values.slug,
        parentId: values.parentId,
        isActive: true,
      };

      if (editing) {
        await updateCategory(editing.id, payload);
      } else {
        await createCategory({ ...payload, name: values.name });
      }

      setModalOpen(false);
      message.success(
        editing ? `Đã cập nhật danh mục ${values.name}` : "Đã thêm danh mục mới",
      );
      await Promise.all([loadRows(), loadParentOptions()]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không lưu được danh mục");
    } finally {
      setSubmitting(false);
    }
  });

  const handleDelete = (record: Category) => {
    modal.confirm({
      title: `Xoá danh mục ${record.name}?`,
      content:
        record.productCount > 0
          ? `Danh mục đang chứa ${record.productCount} sản phẩm.`
          : "Thao tác không thể hoàn tác.",
      okText: "Xoá",
      cancelText: "Huỷ",
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteCategory(record.id);
        message.success("Đã xoá danh mục");
        await Promise.all([loadRows(), loadParentOptions()]);
      },
    });
  };

  const columns = useMemo<ColumnsType<Category>>(
    () => [
      { title: "Tên danh mục", dataIndex: "name", width: 220 },
      { title: "Đường dẫn", dataIndex: "slug", width: 180 },
      {
        title: "Danh mục cha",
        dataIndex: "parentName",
        width: 160,
        render: (value?: string) => value ?? <span className="text-muted">—</span>,
      },
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
    [modal, message, loadRows, loadParentOptions],
  );

  const patchFilters = (patch: Partial<CategoryFilters>) => {
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
        title="Danh mục sản phẩm"
        description="Cây danh mục dùng để phân loại sản phẩm trên cửa hàng"
        extra={
          <Button type="primary" icon={<Plus size={16} />} onClick={() => openModal()}>
            Thêm danh mục
          </Button>
        }
      />

      <SearchFilterBar onSearch={search} onReset={reset} loading={loading}>
        <FormItemLayout label="Tên danh mục">
          <Input
            allowClear
            placeholder="Nhập tên hoặc đường dẫn"
            value={filters.keyword}
            onChange={(event) => patchFilters({ keyword: event.target.value })}
          />
        </FormItemLayout>

        <FormItemLayout label="Danh mục cha">
          <Select
            allowClear
            placeholder="Tất cả"
            options={parentOptions}
            value={filters.parentId}
            onChange={(parentId) => patchFilters({ parentId })}
            className="w-full"
          />
        </FormItemLayout>
      </SearchFilterBar>

      <DataTable<Category>
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
        title={editing ? "Chỉnh sửa danh mục" : "Thêm danh mục"}
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
            label="Tên danh mục"
            required
            rules={{ required: "Vui lòng nhập tên danh mục" }}
          />
          <TextField
            name="slug"
            control={control}
            label="Đường dẫn"
            helpText="Bỏ trống để backend tự sinh từ tên danh mục"
          />
          <SelectField
            name="parentId"
            control={control}
            label="Danh mục cha"
            options={parentOptions.filter((item) => item.value !== editing?.id)}
            helpText="Bỏ trống nếu đây là danh mục gốc"
          />
        </div>
      </Modal>
    </>
  );
}
