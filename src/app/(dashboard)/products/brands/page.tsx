"use client";

import { useMemo, useState } from "react";
import { App, Button, Input, Modal, Space, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { TextField } from "@/components/form/fields";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import { useListQuery } from "@/hooks/useListQuery";
import { fakeMutate, matchText } from "@/lib/fakeFetch";
import { formatNumber } from "@/lib/utils";
import { brands } from "@/mock/catalog";
import type { Brand } from "@/types/product";

interface BrandFilters {
  keyword: string;
}

interface BrandFormValues {
  name: string;
  slug: string;
  country: string;
}

export default function BrandsPage() {
  const { message, modal } = App.useApp();
  const [editing, setEditing] = useState<Brand | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { rows, loading, filters, patchFilters, search, reset, pagination } =
    useListQuery<Brand, BrandFilters>({
      source: brands,
      initialFilters: { keyword: "" },
      buildFilters: (f) => [
        matchText(f.keyword, (item) => [item.name, item.slug, item.country]),
      ],
      sorter: (a, b) => b.productCount - a.productCount,
    });

  const {
    control,
    handleSubmit,
    reset: resetForm,
  } = useForm<BrandFormValues>({
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
    await fakeMutate(values);
    setSubmitting(false);
    setModalOpen(false);
    message.success(
      editing
        ? `Đã cập nhật thương hiệu ${values.name}`
        : "Đã thêm thương hiệu mới",
    );
  });

  const columns = useMemo<ColumnsType<Brand>>(
    () => [
      { title: "Thương hiệu", dataIndex: "name", width: 200 },
      { title: "Đường dẫn", dataIndex: "slug", width: 180 },
      { title: "Xuất xứ", dataIndex: "country", width: 160 },
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
                    title: `Xoá thương hiệu ${record.name}?`,
                    content: `Thương hiệu đang gắn với ${record.productCount} sản phẩm.`,
                    okText: "Xoá",
                    cancelText: "Huỷ",
                    okButtonProps: { danger: true },
                    onOk: () => message.success("Đã xoá thương hiệu"),
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
        title="Thương hiệu"
        description="Danh sách hãng sản xuất đang phân phối tại cửa hàng"
        extra={
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => openModal()}
          >
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
        pagination={pagination}
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
            required
            rules={{ required: "Vui lòng nhập đường dẫn" }}
          />
          <TextField name="country" control={control} label="Xuất xứ" />
        </div>
      </Modal>
    </>
  );
}
