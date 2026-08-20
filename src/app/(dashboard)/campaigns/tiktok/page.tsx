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
const DESCRIPTION_PREVIEW_LENGTH = 90;

// Reordering table rows is strictly vertical. This prevents a dragged row from
// following tiny horizontal pointer movements beside Ant Design's scroll bar.
const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

// The table's horizontal scroller must remain user-controlled during a drag;
// otherwise dnd-kit repeatedly auto-scrolls it at the right edge and jitters.
const canAutoScroll = (element: Element) => !element.classList.contains("ant-table-content");

export default function TiktokVideosPage() {
  const { message, modal } = App.useApp();

  const [rows, setRows] = useState<TiktokVideo[]>([]);
  const [savedOrderIds, setSavedOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TiktokVideo | null>(null);
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState<Set<string>>(new Set());

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

  const toggleDescription = useCallback((id: string) => {
    setExpandedDescriptionIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
        width: 280,
        onCell: () => ({ style: { width: 280, minWidth: 280, maxWidth: 280 } }),
        render: (description: string | undefined, record) => {
          if (!description) return <span className="text-muted">—</span>;

          const isLong = description.length > DESCRIPTION_PREVIEW_LENGTH;
          const expanded = expandedDescriptionIds.has(record.id);
          const preview = `${description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}…`;

          if (!isLong) return <span className="block break-words">{description}</span>;

          return expanded ? (
            <div className="w-[280px] min-w-[280px] max-w-[280px] break-words">
              <span>{description}</span>
              <Button
                type="link"
                size="small"
                className="h-auto px-1 text-xs"
                onClick={() => toggleDescription(record.id)}
              >
                Thu gọn
              </Button>
            </div>
          ) : (
            <div className="flex w-[280px] min-w-[280px] max-w-[280px] items-baseline gap-1 overflow-hidden">
              <span className="min-w-0 flex-1 truncate">{preview}</span>
              <Button
                type="link"
                size="small"
                className="h-auto shrink-0 px-0 text-xs"
                onClick={() => toggleDescription(record.id)}
              >
                Xem thêm
              </Button>
            </div>
          );
        },
      },
      {
        title: "Link video",
        dataIndex: "videoUrl",
        width: 230,
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
        fixed: "right",
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
    [expandedDescriptionIds, handleDelete, handleToggleActive, openModal, toggleDescription],
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

      <DndContext
        sensors={sensors}
        modifiers={[restrictToVerticalAxis]}
        autoScroll={{ canScroll: canAutoScroll }}
        onDragEnd={handleDragEnd}
      >
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
