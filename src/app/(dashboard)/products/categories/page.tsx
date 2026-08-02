"use client";

import { useMemo, useState } from "react";
import { App, Button, Input, Modal, Select, Space, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { SelectField, TextField } from "@/components/form/fields";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import { useListQuery } from "@/hooks/useListQuery";
import { fakeMutate, matchEquals, matchText } from "@/lib/fakeFetch";
import { formatNumber } from "@/lib/utils";
import { categories } from "@/mock/catalog";
import type { Category } from "@/types/product";

interface CategoryFilters {
  keyword: string;
  parentId?: string;
}

interface CategoryFormValues {
  name: string;
  slug: string;
  parentId?: string;
}

const PARENT_OPTIONS = categories
  .filter((item) => !item.parentId)
  .map((item) => ({ label: item.name, value: item.id }));

export default function CategoriesPage() {
  const { message, modal } = App.useApp();
  const [editing, setEditing] = useState<Category | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { rows, loading, filters, patchFilters, search, reset, pagination } =
    useListQuery<Category, CategoryFilters>({
      source: categories,
      initialFilters: { keyword: "" },
      buildFilters: (f) => [
        matchText(f.keyword, (item) => [item.name, item.slug]),
        matchEquals(f.parentId, (item) => item.parentId ?? ""),
      ],
    });

  const {
    control,
    handleSubmit,
    reset: resetForm,
  } = useForm<CategoryFormValues>({ defaultValues: { name: "", slug: "" } });

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
    await fakeMutate(values);
    setSubmitting(false);
    setModalOpen(false);
    message.success(
      editing ? `Đã cập nhật danh mục ${values.name}` : "Đã thêm danh mục mới",
    );
  });

  const columns = useMemo<ColumnsType<Category>>(
    () => [
      { title: "Tên danh mục", dataIndex: "name", width: 220 },
      { title: "Đường dẫn", dataIndex: "slug", width: 180 },
      {
        title: "Danh mục cha",
        dataIndex: "parentName",
        width: 160,
        render: (value?: string) =>
          value ?? <span className="text-muted">—</span>,
      },
      {
        title: "Số sản phẩm",
        dataIndex: "productCount",
        width: 120,
        align: "right",
        sorter: (a, b) => a.productCount - b.productCount,
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
                onClick={() =>
                  modal.confirm({
                    title: `Xoá danh mục ${record.name}?`,
                    content: `Danh mục đang chứa ${record.productCount} sản phẩm.`,
                    okText: "Xoá",
                    cancelText: "Huỷ",
                    okButtonProps: { danger: true },
                    onOk: () => message.success("Đã xoá danh mục"),
                  })
                }
              />
            </Tooltip>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [message, modal],
  );

  return (
    <>
      <PageHeader
        title="Danh mục sản phẩm"
        description="Cây danh mục dùng để phân loại sản phẩm trên cửa hàng"
        extra={
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => openModal()}
          >
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
            options={PARENT_OPTIONS}
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
        pagination={pagination}
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
            required
            helpText="Dùng cho URL, chỉ gồm chữ thường và dấu gạch ngang"
            rules={{ required: "Vui lòng nhập đường dẫn" }}
          />
          <SelectField
            name="parentId"
            control={control}
            label="Danh mục cha"
            options={PARENT_OPTIONS}
            helpText="Bỏ trống nếu đây là danh mục gốc"
          />
        </div>
      </Modal>
    </>
  );
}
