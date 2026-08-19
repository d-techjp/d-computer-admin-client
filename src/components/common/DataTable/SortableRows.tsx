"use client";

import { createContext, useContext, useMemo } from "react";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

/**
 * Kéo-thả đổi thứ tự các dòng của `DataTable`.
 *
 * Trang dùng vẫn tự nắm `DndContext` + `SortableContext` (vì chỉ trang mới biết
 * mảng dữ liệu và cách lưu thứ tự mới); ở đây chỉ gói phần khó tái tạo: dòng
 * `<tr>` biết tự dịch chuyển, và tay cầm tách rời khỏi thân dòng.
 *
 * Tay cầm phải tách riêng vì thân dòng còn chứa link/nút — gắn drag listener lên
 * cả `<tr>` thì mọi cú bấm trong dòng đều bị nuốt thành thao tác kéo.
 *
 * Cách dùng: `components={{ body: { row: SortableRow } }}` trên `DataTable`, và
 * một cột đầu bảng `render: () => <DragHandle />`.
 */

interface RowContextValue {
  setActivatorNodeRef?: (element: HTMLElement | null) => void;
  listeners?: DraggableSyntheticListeners;
}

const RowContext = createContext<RowContextValue>({});

export function DragHandle() {
  const { setActivatorNodeRef, listeners } = useContext(RowContext);

  return (
    <button
      type="button"
      aria-label="Kéo để đổi thứ tự"
      ref={setActivatorNodeRef}
      className="text-muted flex cursor-grab items-center justify-center border-0 bg-transparent p-0 active:cursor-grabbing"
      {...listeners}
    >
      <GripVertical size={16} />
    </button>
  );
}

export interface SortableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** antd tự truyền xuống từ `rowKey` — chính là id dùng cho `SortableContext` */
  "data-row-key"?: string;
}

/**
 * rc-table dùng CHUNG `components.body.row` cho cả dòng placeholder lúc bảng
 * rỗng, và dòng đó không có `data-row-key`. Gọi `useSortable({ id: undefined })`
 * ở đó là hỏng: `isDragging` được tính bằng `active?.id === id`, mà lúc không kéo
 * gì `active?.id` cũng là `undefined` — nên dòng rỗng luôn tự nhận mình "đang bị
 * kéo", ăn `zIndex: 9999` và đè lên cả modal đang mở.
 *
 * Vì hook không được gọi có điều kiện, phần sortable tách hẳn sang component con.
 */
export function SortableRow(props: SortableRowProps) {
  const rowKey = props["data-row-key"];
  if (!rowKey) return <tr {...props} />;

  return <SortableRowInner {...props} data-row-key={rowKey} />;
}

function SortableRowInner(props: SortableRowProps & { "data-row-key": string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props["data-row-key"] });

  const style: React.CSSProperties = {
    ...props.style,
    // Translate (không phải Transform) để dòng không bị co giãn theo scale
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging ? { position: "relative", zIndex: 9999 } : {}),
  };

  const contextValue = useMemo<RowContextValue>(
    () => ({ setActivatorNodeRef, listeners }),
    [setActivatorNodeRef, listeners],
  );

  return (
    <RowContext.Provider value={contextValue}>
      <tr {...props} ref={setNodeRef} style={style} {...attributes} />
    </RowContext.Provider>
  );
}
