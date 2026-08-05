"use client";

import { useState } from "react";
import { Button, Input, Tooltip } from "antd";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import {
  Controller,
  useFieldArray,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

import { FormItemLayout } from "@/components/form/FormItemLayout";
import { cn } from "@/lib/utils";
import type { ProductSpec } from "@/types/product";

// Cột: tay cầm kéo | tên thông số (nửa trái) | giá trị (nửa phải) | nút xoá
const ROW_GRID = "grid grid-cols-[20px_1fr_1fr_32px] items-center gap-2";

interface SpecListFieldProps<T extends FieldValues> {
  control: Control<T>;
  /** Đường dẫn tới mảng `ProductSpec[]` trong form */
  name: Path<T>;
  disabled?: boolean;
}

/**
 * Bảng thông số kỹ thuật động: mỗi dòng là một cặp nhãn/giá trị, thêm bớt tuỳ ý
 * và kéo để đổi thứ tự. Thay cho 4 ô cố định CPU/RAM/Ổ cứng/Màn hình trước đây,
 * vì mỗi nhóm hàng có bộ thông số rất khác nhau.
 *
 * Đây là thông số **dùng chung mọi biến thể** — thông số khác nhau giữa các
 * biến thể phải khai bằng option ở tab "Trục biến thể".
 */
export function SpecListField<T extends FieldValues>({
  control,
  name,
  disabled,
}: SpecListFieldProps<T>) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    // useFieldArray yêu cầu ArrayPath; `name` luôn trỏ tới mảng ProductSpec[]
    name: name as never,
  });
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  return (
    <FormItemLayout
      label="Thông số kỹ thuật"
      helpText="Thông số dùng chung mọi phiên bản. Kéo biểu tượng bên trái để đổi thứ tự hiển thị."
    >
      <div className="space-y-2">
        {fields.length > 0 && (
          <div className={cn(ROW_GRID, "text-muted px-0 text-xs font-medium")}>
            <span />
            <span>Tên thông số</span>
            <span>Nội dung</span>
            <span />
          </div>
        )}

        {fields.map((row, index) => (
          <div
            key={row.id}
            // Chỉ dòng là vùng thả; thuộc tính draggable nằm ở tay cầm riêng,
            // vì đặt draggable lên thẻ bọc ngoài sẽ chặn focus và bôi đen text
            // của các ô input bên trong.
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (dragIndex !== null && dragIndex !== index) {
                move(dragIndex, index);
              }
              setDragIndex(null);
            }}
            className={cn(ROW_GRID, dragIndex === index && "opacity-40")}
          >
            <span
              draggable={!disabled}
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => setDragIndex(null)}
              role="button"
              tabIndex={-1}
              aria-label={`Kéo để đổi vị trí thông số ${index + 1}`}
              className="text-muted hover:text-fg flex shrink-0 cursor-grab justify-center active:cursor-grabbing"
            >
              <GripVertical size={16} />
            </span>

            <Controller
              control={control}
              name={`${name}.${index}.label` as Path<T>}
              render={({ field }) => (
                <Input
                  {...field}
                  disabled={disabled}
                  placeholder="VD: CPU, Trọng lượng..."
                  aria-label={`Tên thông số ${index + 1}`}
                />
              )}
            />

            <Controller
              control={control}
              name={`${name}.${index}.value` as Path<T>}
              render={({ field }) => (
                <Input
                  {...field}
                  disabled={disabled}
                  placeholder="VD: Intel Core i7-14700HX"
                  aria-label={`Giá trị thông số ${index + 1}`}
                />
              )}
            />

            <Tooltip title="Xoá dòng">
              <Button
                type="text"
                danger
                disabled={disabled}
                icon={<Trash2 size={16} />}
                onClick={() => remove(index)}
                aria-label={`Xoá thông số ${index + 1}`}
              />
            </Tooltip>
          </div>
        ))}

        <Button
          type="dashed"
          block
          disabled={disabled}
          icon={<Plus size={16} />}
          onClick={() => append({ label: "", value: "" } as never)}
        >
          Thêm thông số
        </Button>
      </div>
    </FormItemLayout>
  );
}

/** Chuyển mảng nhãn/giá trị của form về object `specifications` mà API nhận */
export function toSpecifications(specs: ProductSpec[]) {
  return Object.fromEntries(
    specs
      .filter((spec) => spec.label.trim() && spec.value.trim())
      .map((spec) => [spec.label.trim(), spec.value.trim()]),
  );
}

export default SpecListField;
