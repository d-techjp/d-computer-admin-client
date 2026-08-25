"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Input, Tooltip } from "antd";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { type ReactNode } from "react";
import { Controller, useFieldArray, type Control, type FieldValues, type Path } from "react-hook-form";

import { ImageUploadField } from "@/components/form/fields";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { cn } from "@/lib/utils";

interface SocialLinksFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  disabled?: boolean;
}

/** Dùng sortable animation thay vì native drag để các card trượt ngay khi đổi vị trí. */
export function SocialLinksField<T extends FieldValues>({ control, name, disabled }: SocialLinksFieldProps<T>) {
  const { fields, append, remove, move } = useFieldArray({ control, name: name as never });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  return (
    <FormItemLayout label="Link mạng xã hội" helpText="Kéo tay cầm để đổi thứ tự hiển thị ở footer và các nút social nổi.">
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
            {fields.map((row, index) => (
              <SortableSocialLink key={row.id} id={row.id} disabled={disabled}>
                {({ attributes, listeners, setActivatorNodeRef, isDragging }) => (
                  <div
                    className={cn(
                      "flex items-start gap-3 rounded-lg border-[0.5px] border-[#E1E8F0] bg-subtle p-3 shadow-sm transition-shadow",
                      isDragging && "z-10 border-[#D2DFEA] shadow-md ring-1 ring-primary/10",
                    )}
                    {...attributes}
                  >
                    <button
                      type="button"
                      ref={setActivatorNodeRef}
                      disabled={disabled}
                      aria-label={`Kéo để đổi vị trí link ${index + 1}`}
                      className="text-muted hover:text-fg mt-7 flex shrink-0 cursor-grab items-center justify-center rounded p-1 transition-colors active:cursor-grabbing disabled:cursor-default"
                      {...listeners}
                    >
                      <GripVertical size={16} />
                    </button>

                    <div className="w-20 shrink-0">
                      <ImageUploadField
                        name={`${name}.${index}.logo` as Path<T>}
                        control={control}
                        maxCount={1}
                        compact
                        replaceOnly
                        disabled={disabled}
                        helpText="Logo vuông"
                        rules={{ validate: (value) => (Array.isArray(value) && value.length > 0) || "Vui lòng chọn logo" }}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-fg text-sm font-semibold">Kênh mạng xã hội #{index + 1}</span>
                        <Tooltip title="Xoá link">
                          <Button type="text" size="small" danger disabled={disabled} icon={<Trash2 size={16} />} onClick={() => remove(index)} aria-label={`Xoá link ${index + 1}`} />
                        </Tooltip>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(150px,0.45fr)_minmax(0,1fr)]">
                        <div>
                          <span className="text-muted mb-1 block text-xs font-medium">Nền tảng</span>
                          <Controller
                            control={control}
                            name={`${name}.${index}.name` as Path<T>}
                            rules={{ required: "Vui lòng nhập tên" }}
                            render={({ field, fieldState }) => <Input {...field} disabled={disabled} placeholder="VD: Facebook" status={fieldState.error ? "error" : undefined} aria-label={`Tên mạng xã hội ${index + 1}`} />}
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-muted mb-1 block text-xs font-medium">Liên kết</span>
                          <Controller
                            control={control}
                            name={`${name}.${index}.url` as Path<T>}
                            rules={{ required: "Vui lòng nhập link liên kết" }}
                            render={({ field, fieldState }) => <Input {...field} disabled={disabled} placeholder="https://facebook.com/..." status={fieldState.error ? "error" : undefined} aria-label={`Link liên kết ${index + 1}`} />}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </SortableSocialLink>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button type="dashed" block disabled={disabled} icon={<Plus size={16} />} className="mt-3" onClick={() => append({ name: "", logo: [], url: "" } as never)}>
        Thêm link mạng xã hội
      </Button>
    </FormItemLayout>
  );
}

function SortableSocialLink({ id, disabled, children }: { id: string; disabled?: boolean; children: (props: SortableSocialLinkProps) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }}>{children({ attributes, listeners, setActivatorNodeRef, isDragging })}</div>;
}

type SortableSocialLinkProps = Pick<ReturnType<typeof useSortable>, "attributes" | "listeners" | "setActivatorNodeRef" | "isDragging">;

export default SocialLinksField;
