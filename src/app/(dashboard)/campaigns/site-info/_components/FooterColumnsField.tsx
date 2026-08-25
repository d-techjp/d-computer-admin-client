"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Input, Tooltip } from "antd";
import { ChevronDown, ChevronRight, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Controller, useFieldArray, type Control, type FieldValues, type Path } from "react-hook-form";

import { FormItemLayout } from "@/components/form/FormItemLayout";
import { cn } from "@/lib/utils";

interface FooterColumnsFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  disabled?: boolean;
}

const pointerSensorOptions = { activationConstraint: { distance: 6 } };

/** Cột và link đều dùng dnd-kit để các phần tử xung quanh trượt chừa chỗ khi kéo. */
export function FooterColumnsField<T extends FieldValues>({ control, name, disabled }: FooterColumnsFieldProps<T>) {
  const { fields, append, remove, move } = useFieldArray({ control, name: name as never });
  const sensors = useSensors(
    useSensor(PointerSensor, pointerSensorOptions),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [expandedColumnIds, setExpandedColumnIds] = useState<Set<string>>(() => new Set());
  const [editingColumnIds, setEditingColumnIds] = useState<Set<string>>(() => new Set());

  const toggleColumn = (id: string) => {
    setExpandedColumnIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const enableColumnEditing = (id: string) => {
    setExpandedColumnIds((current) => new Set(current).add(id));
    setEditingColumnIds((current) => new Set(current).add(id));
  };

  const disableColumnEditing = (id: string) => {
    setEditingColumnIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  return (
    <FormItemLayout
      label="Cột điều hướng footer"
      helpText="Kéo tay cầm để đổi vị trí. Mở một cột khi cần chỉnh các link bên trong."
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (disabled || !over || active.id === over.id) return;
          const from = fields.findIndex((field) => field.id === active.id);
          const to = fields.findIndex((field) => field.id === over.id);
          if (from !== -1 && to !== -1) move(from, to);
        }}
      >
        <SortableContext items={fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {fields.map((column, index) => {
              const expanded = expandedColumnIds.has(column.id);
              const editing = editingColumnIds.has(column.id);
              const columnDisabled = disabled || !editing;

              return (
                <SortableItem key={column.id} id={column.id} disabled={disabled}>
                  {({ attributes, listeners, setActivatorNodeRef, isDragging }) => (
                    <div
                      className={cn(
                        "overflow-hidden rounded-lg border-[0.5px] border-[#D8E4F0] bg-[#EFF6FF] shadow-sm transition-shadow",
                        isDragging && "z-10 border-[#CDDDEA] shadow-md ring-1 ring-primary/10",
                      )}
                      {...attributes}
                    >
                      <div className="flex items-center gap-2 bg-[#E1EEFF] p-3">
                        <DragHandle setActivatorNodeRef={setActivatorNodeRef} listeners={listeners} disabled={columnDisabled} label={`Kéo để đổi vị trí cột ${index + 1}`} />
                        <Button type="text" size="small" icon={expanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />} onClick={() => toggleColumn(column.id)} aria-label={expanded ? `Thu gọn cột ${index + 1}` : `Mở cột ${index + 1}`} />
                        <Tooltip title={editing ? "Huỷ chỉnh sửa" : "Chỉnh sửa cột và các link"}>
                          <Button
                            type={editing ? "primary" : "text"}
                            danger={editing}
                            size="small"
                            disabled={disabled}
                            icon={editing ? <X size={15} /> : <Pencil size={15} />}
                            onClick={() => (editing ? disableColumnEditing(column.id) : enableColumnEditing(column.id))}
                            aria-label={editing ? `Huỷ chỉnh sửa cột ${index + 1}` : `Chỉnh sửa cột ${index + 1}`}
                          />
                        </Tooltip>
                        <Controller
                          control={control}
                          name={`${name}.${index}.title` as Path<T>}
                          rules={{ required: "Vui lòng nhập tên cột" }}
                          render={({ field, fieldState }) => (
                            <Input {...field} disabled={columnDisabled} placeholder="Tên cột — VD: Sản phẩm · Dịch vụ" status={fieldState.error ? "error" : undefined} aria-label={`Tên cột ${index + 1}`} className="font-medium !text-[#334155] !bg-[#F8FBFF] placeholder:!text-[#94A3B8] disabled:!text-[#475569] disabled:!bg-[#EDF4FC]" />
                          )}
                        />
                        <Tooltip title="Xoá cả cột này">
                          <Button type="text" danger disabled={columnDisabled} icon={<Trash2 size={16} />} onClick={() => remove(index)} aria-label={`Xoá cột ${index + 1}`} />
                        </Tooltip>
                      </div>

                      {expanded ? (
                        <div className="border-t border-[#E3ECF6] bg-[#FAFCFF] px-3 py-3">
                          <FooterColumnLinks control={control} columnName={`${name}.${index}.links` as Path<T>} disabled={columnDisabled} />
                        </div>
                      ) : null}
                    </div>
                  )}
                </SortableItem>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <Button type="dashed" block disabled={disabled} icon={<Plus size={16} />} className="mt-3" onClick={() => append({ title: "", links: [] } as never)}>
        Thêm cột
      </Button>
    </FormItemLayout>
  );
}

function FooterColumnLinks<T extends FieldValues>({ control, columnName, disabled }: { control: Control<T>; columnName: Path<T>; disabled?: boolean }) {
  const { fields, append, remove, move } = useFieldArray({ control, name: columnName as never });
  const sensors = useSensors(
    useSensor(PointerSensor, pointerSensorOptions),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (disabled || !over || active.id === over.id) return;
        const from = fields.findIndex((field) => field.id === active.id);
        const to = fields.findIndex((field) => field.id === over.id);
        if (from !== -1 && to !== -1) move(from, to);
      }}
    >
      <SortableContext items={fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {fields.map((link, index) => (
            <SortableItem key={link.id} id={link.id} disabled={disabled}>
              {({ attributes, listeners, setActivatorNodeRef, isDragging }) => (
                <div className={cn("flex items-center gap-2 rounded-md border-[0.5px] border-[#E7EEF5] bg-white p-2.5 transition-shadow", isDragging && "z-10 border-[#D5E1EC] shadow-md ring-1 ring-primary/10")} {...attributes}>
                  <DragHandle setActivatorNodeRef={setActivatorNodeRef} listeners={listeners} disabled={disabled} label={`Kéo để đổi vị trí link ${index + 1}`} />
                  <Controller
                    control={control}
                    name={`${columnName}.${index}.label` as Path<T>}
                    rules={{ required: "Vui lòng nhập nhãn" }}
                    render={({ field, fieldState }) => <Input {...field} disabled={disabled} placeholder="Nhãn hiển thị" status={fieldState.error ? "error" : undefined} aria-label={`Nhãn link ${index + 1}`} className="flex-1" />}
                  />
                  <Controller
                    control={control}
                    name={`${columnName}.${index}.url` as Path<T>}
                    render={({ field }) => <Input {...field} disabled={disabled} placeholder="/duong-dan hoặc https://..." aria-label={`URL link ${index + 1}`} className="flex-1" />}
                  />
                  <Tooltip title="Xoá link">
                    <Button type="text" size="small" danger disabled={disabled} icon={<Trash2 size={14} />} onClick={() => remove(index)} aria-label={`Xoá link ${index + 1}`} />
                  </Tooltip>
                </div>
              )}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
      <Button type="dashed" size="small" disabled={disabled} icon={<Plus size={14} />} className="mt-2" onClick={() => append({ label: "", url: "" } as never)}>
        Thêm link
      </Button>
    </DndContext>
  );
}

function SortableItem({ id, disabled, children }: { id: string; disabled?: boolean; children: (props: SortableItemChildrenProps) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }}>{children({ attributes, listeners, setActivatorNodeRef, isDragging })}</div>;
}

type SortableItemChildrenProps = Pick<ReturnType<typeof useSortable>, "attributes" | "listeners" | "setActivatorNodeRef" | "isDragging">;

function DragHandle({ setActivatorNodeRef, listeners, disabled, label }: Pick<SortableItemChildrenProps, "setActivatorNodeRef" | "listeners"> & { disabled?: boolean; label: string }) {
  return (
    <button type="button" ref={setActivatorNodeRef} disabled={disabled} aria-label={label} className="text-muted hover:text-fg flex shrink-0 cursor-grab items-center justify-center rounded p-1 transition-colors active:cursor-grabbing disabled:cursor-default" {...listeners}>
      <GripVertical size={16} />
    </button>
  );
}

export default FooterColumnsField;
