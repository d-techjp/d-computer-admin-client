"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { App, Breadcrumb, Button, Input, Modal, Space, Switch, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Package, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { DataTable, DragHandle, SortableRow } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { SelectField, TextField } from "@/components/form/fields";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import routes from "@/config/routes";
import {
  categoryOptionsFrom,
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  reorderCategories,
  updateCategory,
} from "@/lib/api/catalog";
import type { SelectOption } from "@/types/common";
import type { Category } from "@/types/product";

const ROOT_LABEL = "D-Tech Danh mục sản phẩm";

interface CategoryFormValues {
  name: string;
  slug?: string;
  parentId?: string;
}

interface TrailNode {
  id: string;
  name: string;
}

/** Trèo dần lên cha từng cấp — API chỉ trả tên của cha trực tiếp mỗi lần gọi. */
async function buildAncestorChain(id: string): Promise<TrailNode[]> {
  const chain: TrailNode[] = [];
  let currentId: string | undefined = id;
  while (currentId) {
    const category = await getCategory(currentId);
    chain.unshift({ id: category.id, name: category.name });
    currentId = category.parentId;
  }
  return chain;
}

export default function CategoriesPage() {
  const { message, modal } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const parentId = searchParams.get("parentId") ?? undefined;
  const pathParam = searchParams.get("path") ?? undefined;

  // Trail mang theo từ điều hướng trong app (click vào tên danh mục) — có
  // ngay không cần gọi API. Chỉ dùng khi khớp với parentId hiện tại.
  const parsedTrail = useMemo<TrailNode[] | undefined>(() => {
    if (!parentId || !pathParam) return undefined;
    try {
      const parsed = JSON.parse(pathParam) as TrailNode[];
      if (parsed.length && parsed[parsed.length - 1]?.id === parentId) return parsed;
    } catch {
      // path hỏng (sửa tay URL) — bỏ qua, để effect bên dưới dựng lại từ API
    }
    return undefined;
  }, [parentId, pathParam]);

  const [orderedRows, setOrderedRows] = useState<Category[]>([]);
  const [savedOrderIds, setSavedOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [reconstructedTrail, setReconstructedTrail] = useState<TrailNode[]>([]);
  const trail = useMemo<TrailNode[]>(
    () => (parentId ? (parsedTrail ?? reconstructedTrail) : []),
    [parentId, parsedTrail, reconstructedTrail],
  );
  const [parentOptions, setParentOptions] = useState<SelectOption[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const orderDirty = useMemo(
    () => orderedRows.map((row) => row.id).join() !== savedOrderIds.join(),
    [orderedRows, savedOrderIds],
  );

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listCategories({
        page: 1,
        limit: 100,
        parentId,
        rootOnly: !parentId,
        sortBy: "sortOrder",
        sortOrder: "ASC",
      });
      setOrderedRows(response.data);
      setSavedOrderIds(response.data.map((category) => category.id));
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tải được danh mục");
    } finally {
      setLoading(false);
    }
  }, [message, parentId]);

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

  // Truy cập trực tiếp bằng URL (bookmark, gõ URL tay) không mang theo trail
  // — bù lại bằng cách trèo dần lên cha để dựng lại breadcrumb đầy đủ.
  useEffect(() => {
    if (!parentId || parsedTrail) return;
    let cancelled = false;
    void buildAncestorChain(parentId).then(
      (chain) => {
        if (!cancelled) setReconstructedTrail(chain);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [parentId, parsedTrail]);

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
        // Tạo mới: luôn nằm trong danh mục đang xem, không cho chọn khác.
        // Sửa: vẫn cho đổi cha qua select.
        parentId: editing ? values.parentId : parentId,
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setOrderedRows((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id);
      const newIndex = prev.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    try {
      const items = orderedRows.map((row, index) => ({ id: row.id, sortOrder: index }));
      await reorderCategories(items);
      setSavedOrderIds(orderedRows.map((row) => row.id));
      message.success("Đã cập nhật thứ tự danh mục");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không cập nhật được thứ tự");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleToggleActive = useCallback(
    async (record: Category, isActive: boolean) => {
      setOrderedRows((prev) =>
        prev.map((item) => (item.id === record.id ? { ...item, isActive } : item)),
      );
      try {
        await updateCategory(record.id, { isActive });
        message.success(
          isActive ? `Đã bật hiển thị "${record.name}"` : `Đã tắt hiển thị "${record.name}"`,
        );
      } catch (error) {
        setOrderedRows((prev) =>
          prev.map((item) => (item.id === record.id ? { ...item, isActive: !isActive } : item)),
        );
        message.error(
          error instanceof Error ? error.message : "Không cập nhật được trạng thái hiển thị",
        );
      }
    },
    [message],
  );

  const navigateToTrail = useCallback(
    (nextTrail: TrailNode[]) => {
      if (nextTrail.length === 0) {
        router.push(routes.products.categories);
        return;
      }
      const last = nextTrail[nextTrail.length - 1];
      const qs = new URLSearchParams({ parentId: last.id, path: JSON.stringify(nextTrail) });
      router.push(`${routes.products.categories}?${qs.toString()}`);
    },
    [router],
  );

  const goToRoot = useCallback(() => navigateToTrail([]), [navigateToTrail]);

  const goToTrailLevel = useCallback(
    (index: number) => navigateToTrail(trail.slice(0, index + 1)),
    [trail, navigateToTrail],
  );

  const goToChildren = useCallback(
    (category: Category) => navigateToTrail([...trail, { id: category.id, name: category.name }]),
    [trail, navigateToTrail],
  );

  const columns = useMemo<ColumnsType<Category>>(
    () => [
      {
        key: "sort",
        width: 40,
        align: "center",
        render: () => <DragHandle />,
      },
      {
        title: "Tên danh mục",
        dataIndex: "name",
        width: 220,
        render: (name: string, record) => (
          <button
            type="button"
            className="text-brand cursor-pointer border-0 bg-transparent p-0 font-semibold underline!"
            onClick={() => goToChildren(record)}
          >
            {name}
          </button>
        ),
      },
      { title: "Đường dẫn", dataIndex: "slug", width: 180 },
      {
        title: "Hiển thị",
        dataIndex: "isActive",
        width: 100,
        align: "center",
        render: (isActive: boolean, record) => (
          <Switch
            size="small"
            checked={isActive}
            onChange={(checked) => void handleToggleActive(record, checked)}
          />
        ),
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 140,
        align: "center",
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="Xem sản phẩm thuộc danh mục">
              <Button
                type="text"
                size="small"
                icon={<Package size={16} />}
                href={`${routes.products.index}?category=${record.id}`}
              />
            </Tooltip>
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
    [modal, message, loadRows, loadParentOptions, goToChildren, handleToggleActive],
  );

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

      <div className="bg-card border-line shadow-card mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
        <Breadcrumb
          items={[
            { title: trail.length ? <a onClick={goToRoot}>{ROOT_LABEL}</a> : ROOT_LABEL },
            ...trail.map((node, index) => ({
              title:
                index === trail.length - 1 ? (
                  node.name
                ) : (
                  <a onClick={() => goToTrailLevel(index)}>{node.name}</a>
                ),
            })),
          ]}
        />
        <Tooltip title={orderDirty ? undefined : "Kéo thả tay cầm ở đầu hàng để đổi thứ tự"}>
          <Button
            type="primary"
            icon={<Save size={16} />}
            disabled={!orderDirty}
            loading={savingOrder}
            onClick={() => void handleSaveOrder()}
          >
            Cập nhật thứ tự
          </Button>
        </Tooltip>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext
          items={orderedRows.map((row) => row.id)}
          strategy={verticalListSortingStrategy}
        >
          <DataTable<Category>
            rowKey="id"
            columns={columns}
            dataSource={orderedRows}
            loading={loading}
            pagination={false}
            components={{ body: { row: SortableRow } }}
          />
        </SortableContext>
      </DndContext>

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
          {editing ? (
            <SelectField
              name="parentId"
              control={control}
              label="Danh mục cha"
              options={parentOptions.filter((item) => item.value !== editing?.id)}
              helpText="Bỏ trống nếu đây là danh mục gốc"
            />
          ) : (
            <FormItemLayout
              label="Danh mục cha"
              helpText="Danh mục mới sẽ được tạo trong danh mục đang xem"
            >
              <Input value={trail.length ? trail[trail.length - 1].name : ROOT_LABEL} disabled />
            </FormItemLayout>
          )}
        </div>
      </Modal>
    </>
  );
}
