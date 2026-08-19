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
import { App, Button, Space, Switch, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ExternalLink, ImageOff, Pencil, Plus, Save, Trash2 } from "lucide-react";
import Image from "next/image";

import { DataTable, DragHandle, SortableRow } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import {
  deleteTiktokVideo,
  listTiktokVideos,
  reorderTiktokVideos,
  updateTiktokVideo,
} from "@/lib/api/tiktok";
import type { TiktokVideo } from "@/types/tiktok";

import { TiktokVideoFormModal } from "./_components/TiktokVideoFormModal";

/** Danh sách video luôn nhỏ và cần kéo-thả toàn cục nên nạp một lần, không phân trang. */
const FETCH_LIMIT = 100;

export default function TiktokVideosPage() {
  const { message, modal } = App.useApp();

  const [rows, setRows] = useState<TiktokVideo[]>([]);
  const [savedOrderIds, setSavedOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TiktokVideo | null>(null);

  const orderDirty = useMemo(
    () => rows.map((row) => row.id).join() !== savedOrderIds.join(),
    [rows, savedOrderIds],
  );

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listTiktokVideos({
        page: 1,
        limit: FETCH_LIMIT,
        sortBy: "sortOrder",
        sortOrder: "ASC",
      });
      setRows(response.data);
      setSavedOrderIds(response.data.map((video) => video.id));
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tải được danh sách video");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    queueMicrotask(() => void loadRows());
  }, [loadRows]);

  const sensors = useSensors(
    // distance: 4 để một cú bấm dứt khoát vào nút vẫn là click, không thành kéo
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
      await reorderTiktokVideos(rows.map((row, index) => ({ id: row.id, sortOrder: index })));
      setSavedOrderIds(rows.map((row) => row.id));
      message.success("Đã cập nhật thứ tự hiển thị");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không cập nhật được thứ tự");
    } finally {
      setSavingOrder(false);
    }
  };

  /** Lật switch ăn ngay rồi mới gọi API — hỏng thì trả lại trạng thái cũ. */
  const handleToggleActive = useCallback(
    async (record: TiktokVideo, isActive: boolean) => {
      setRows((prev) =>
        prev.map((item) => (item.id === record.id ? { ...item, isActive } : item)),
      );
      try {
        await updateTiktokVideo(record.id, { isActive });
        message.success(isActive ? "Đã bật hiển thị video" : "Đã tắt hiển thị video");
      } catch (error) {
        setRows((prev) =>
          prev.map((item) => (item.id === record.id ? { ...item, isActive: !isActive } : item)),
        );
        message.error(
          error instanceof Error ? error.message : "Không cập nhật được trạng thái hiển thị",
        );
      }
    },
    [message],
  );

  const handleDelete = useCallback(
    (record: TiktokVideo) => {
      modal.confirm({
        title: "Xoá video này?",
        content: record.description || record.videoUrl,
        okText: "Xoá",
        cancelText: "Huỷ",
        okButtonProps: { danger: true },
        onOk: async () => {
          await deleteTiktokVideo(record.id);
          message.success("Đã xoá video");
          await loadRows();
        },
      });
    },
    [loadRows, message, modal],
  );

  const openModal = useCallback((video?: TiktokVideo) => {
    setEditing(video ?? null);
    setModalOpen(true);
  }, []);

  const columns = useMemo<ColumnsType<TiktokVideo>>(
    () => [
      { key: "sort", width: 40, align: "center", render: () => <DragHandle /> },
      {
        title: "Ảnh",
        dataIndex: "thumbnailUrl",
        width: 80,
        align: "center",
        render: (thumbnailUrl: string | undefined, record) => (
          <div className="bg-card border-line relative mx-auto h-14 w-10 overflow-hidden rounded border">
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt={record.description || "Video TikTok"}
                fill
                unoptimized
                sizes="40px"
                className="object-cover"
              />
            ) : (
              <span className="text-muted flex h-full items-center justify-center">
                <ImageOff size={14} />
              </span>
            )}
          </div>
        ),
      },
      {
        title: "Mô tả",
        dataIndex: "description",
        render: (description: string | undefined) =>
          description || <span className="text-muted">—</span>,
      },
      {
        title: "Link video",
        dataIndex: "videoUrl",
        width: 260,
        render: (videoUrl: string) => (
          <a
            href={videoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-brand inline-flex max-w-full items-center gap-1 underline!"
          >
            <span className="truncate">{videoUrl}</span>
            <ExternalLink size={13} className="shrink-0" />
          </a>
        ),
      },
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
                onClick={() => handleDelete(record)}
              />
            </Tooltip>
          </Space>
        ),
      },
    ],
    [handleDelete, handleToggleActive, openModal],
  );

  return (
    <>
      <PageHeader
        title="Video TikTok"
        description="Danh sách video hiển thị trên storefront, kéo thả để đổi thứ tự"
        extra={
          <Space>
            <Tooltip title={orderDirty ? undefined : "Kéo tay cầm ở đầu hàng để đổi thứ tự"}>
              <Button
                icon={<Save size={16} />}
                disabled={!orderDirty}
                loading={savingOrder}
                onClick={() => void handleSaveOrder()}
              >
                Cập nhật thứ tự
              </Button>
            </Tooltip>
            <Button type="primary" icon={<Plus size={16} />} onClick={() => openModal()}>
              Thêm video
            </Button>
          </Space>
        }
      />

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext
          items={rows.map((row) => row.id)}
          strategy={verticalListSortingStrategy}
        >
          <DataTable<TiktokVideo>
            rowKey="id"
            columns={columns}
            dataSource={rows}
            loading={loading}
            pagination={false}
            emptyText="Chưa có video TikTok nào"
            components={{ body: { row: SortableRow } }}
          />
        </SortableContext>
      </DndContext>

      <TiktokVideoFormModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSaved={loadRows}
      />
    </>
  );
}
