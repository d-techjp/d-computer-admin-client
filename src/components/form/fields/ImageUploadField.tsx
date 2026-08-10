"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { App, Button, Tooltip } from "antd";
import { ImagePlus, Star, Trash2, Upload } from "lucide-react";
import type { FieldValues } from "react-hook-form";
import { useController } from "react-hook-form";

import {
  ACCEPTED_IMAGE_TYPES,
  isAcceptedImageType,
  isWithinImageSizeLimit,
  MAX_IMAGE_SIZE_MB,
  readAsDataUrl,
} from "@/lib/imageUpload";
import { cn } from "@/lib/utils";

import { FormItemLayout } from "../FormItemLayout";
import type { BaseFieldProps } from "./types";

export interface UploadedImage {
  id: string;
  name: string;
  /** Preview URL; ảnh mới giữ thêm `file` để submit multipart/form-data. */
  url: string;
  size: number;
  file?: File;
}

interface ImageUploadFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  maxCount?: number;
  minCount?: number;
}

/**
 * Chọn ảnh từ máy và xem trước ngay, không cần backend: file được đọc thành
 * data URL rồi lưu vào giá trị của form. Hỗ trợ kéo-thả để thêm ảnh và kéo
 * để đổi thứ tự; ảnh đầu tiên được coi là ảnh đại diện.
 *
 * Preview dùng data URL, còn file gốc vẫn được giữ trong value để submit
 * multipart/form-data hoặc upload qua API.
 */
export function ImageUploadField<T extends FieldValues>({
  name,
  control,
  rules,
  label,
  required,
  helpText,
  disabled,
  className,
  maxCount = 6,
  minCount = 0,
}: ImageUploadFieldProps<T>) {
  const { message, modal } = App.useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const { field, fieldState } = useController({ name, control, rules });
  // useMemo để tham chiếu mảng ổn định giữa các lần render, tránh tạo lại callback
  const images = useMemo<UploadedImage[]>(() => field.value ?? [], [field.value]);

  const addFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) return;

      const room = maxCount - images.length;
      if (room <= 0) {
        message.warning(`Chỉ được tải lên tối đa ${maxCount} ảnh`);
        return;
      }

      const accepted: UploadedImage[] = [];

      for (const file of Array.from(fileList).slice(0, room)) {
        if (!isAcceptedImageType(file)) {
          message.error(`${file.name}: chỉ nhận ảnh JPG, PNG, WEBP, AVIF hoặc GIF`);
          continue;
        }
        if (!isWithinImageSizeLimit(file)) {
          message.error(`${file.name}: ảnh vượt quá ${MAX_IMAGE_SIZE_MB}MB`);
          continue;
        }
        accepted.push({
          id: `${file.name}-${file.lastModified}-${file.size}`,
          name: file.name,
          url: await readAsDataUrl(file),
          size: file.size,
          file,
        });
      }

      if (accepted.length) field.onChange([...images, ...accepted]);
    },
    [field, images, maxCount, message],
  );

  const removeAt = (index: number) =>
    field.onChange(images.filter((_, i) => i !== index));

  /**
   * Sàn tính trên **cả** ảnh cũ lẫn ảnh mới chưa lưu: thêm 1 ảnh rồi xoá ảnh
   * cũ là thao tác thay ảnh hợp lệ, nhưng xoá tiếp tấm còn lại thì danh sách
   * rỗng — trạng thái mà backend không lưu được.
   */
  const canRemove = images.length > minCount;

  const confirmRemoveAt = (index: number) => {
    modal.confirm({
      title: "Xoá ảnh này?",
      okText: "Xoá",
      cancelText: "Huỷ",
      okButtonProps: { danger: true },
      onOk: () => removeAt(index),
    });
  };

  /** Kéo ảnh sang vị trí khác để đổi thứ tự hiển thị */
  const moveTo = (from: number, to: number) => {
    if (from === to) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    field.onChange(next);
  };

  const isFull = images.length >= maxCount;

  return (
    <FormItemLayout
      label={label}
      required={required}
      error={fieldState.error?.message}
      helpText={
        helpText ??
        `Tối đa ${maxCount} ảnh, mỗi ảnh dưới ${MAX_IMAGE_SIZE_MB}MB. Kéo ảnh để đổi thứ tự, bấm ngôi sao để chọn ảnh đại diện.`
      }
      className={className}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          {images.map((image, index) => {
            const isCover = index === 0;

            return (
              <figure
                key={image.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (dragIndex !== null) moveTo(dragIndex, index);
                  setDragIndex(null);
                }}
                className={cn(
                  "bg-card w-36 shrink-0 overflow-hidden rounded-lg border transition-colors",
                  isCover ? "border-brand" : "border-line",
                  dragIndex === index && "opacity-40",
                )}
              >
                {/* Chỉ vùng ảnh mới kéo được, thanh nút bên dưới vẫn bấm bình thường */}
                <div
                  draggable={!disabled}
                  onDragStart={() => setDragIndex(index)}
                  onDragEnd={() => setDragIndex(null)}
                  className={cn(
                    "bg-subtle relative h-28 w-full",
                    !disabled && "cursor-grab active:cursor-grabbing",
                  )}
                >
                  <Image
                    src={image.url}
                    alt={image.name}
                    fill
                    unoptimized
                    sizes="144px"
                    className="object-cover"
                  />

                  {isCover && (
                    <span className="bg-brand absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      <Star size={10} fill="currentColor" /> Đại diện
                    </span>
                  )}
                </div>

                {/* Thanh thao tác luôn hiện, không cần rê chuột mới thấy */}
                <figcaption className="border-line flex items-center justify-between gap-1 border-t px-1 py-1">
                  <Tooltip
                    title={
                      isCover
                        ? "Đây là ảnh đại diện"
                        : "Đặt làm ảnh đại diện"
                    }
                  >
                    <Button
                      size="small"
                      type="text"
                      disabled={disabled || isCover}
                      aria-label="Đặt làm ảnh đại diện"
                      onClick={() => moveTo(index, 0)}
                      icon={
                        <Star
                          size={15}
                          className={isCover ? "text-brand" : "text-muted"}
                          fill={isCover ? "currentColor" : "none"}
                        />
                      }
                    />
                  </Tooltip>

                  <span className="text-muted truncate px-1 text-[11px]">
                    {index + 1}/{images.length}
                  </span>

                  <Tooltip
                    title={
                      canRemove
                        ? "Xoá ảnh"
                        : `Phải giữ lại ít nhất ${minCount} ảnh — thêm ảnh mới trước rồi mới xoá ảnh này`
                    }
                  >
                    {/* span để tooltip vẫn hiện khi nút bị disable */}
                    <span className="inline-flex">
                      <Button
                        size="small"
                        type="text"
                        danger
                        disabled={disabled || !canRemove}
                        aria-label="Xoá ảnh"
                        icon={<Trash2 size={15} />}
                        onClick={() => confirmRemoveAt(index)}
                      />
                    </span>
                  </Tooltip>
                </figcaption>
              </figure>
            );
          })}

          {!isFull && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                void addFiles(event.dataTransfer.files);
              }}
              className={cn(
                "text-muted hover:border-brand hover:text-brand flex h-[calc(7rem+34px)] w-36 shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed transition-colors",
                dragOver ? "border-brand text-brand bg-brand/5" : "border-line",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              {dragOver ? <Upload size={22} /> : <ImagePlus size={22} />}
              <span className="text-xs font-medium">
                {dragOver ? "Thả ảnh vào đây" : "Thêm ảnh"}
              </span>
              <span className="text-[11px]">
                {images.length}/{maxCount}
              </span>
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          multiple={maxCount > 1}
          hidden
          onChange={(event) => {
            void addFiles(event.target.files);
            // Reset để chọn lại đúng file vừa xoá vẫn kích hoạt onChange
            event.target.value = "";
          }}
        />
      </div>
    </FormItemLayout>
  );
}

export default ImageUploadField;
