"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { App, Button, Image as AntImage, Tooltip } from "antd";
import { ImagePlus, Pencil, Star, Trash2, Upload, ZoomIn } from "lucide-react";
import type { FieldValues } from "react-hook-form";
import { useController } from "react-hook-form";

import { useProductImageCropper } from "@/components/common/ProductImageCropper";
import {
  ACCEPTED_IMAGE_TYPES,
  isAcceptedImageType,
  isWithinImageSizeLimit,
  MAX_IMAGE_SIZE_MB,
  readAsDataUrl,
} from "@/lib/imageUpload";
import { PRODUCT_IMAGE_ASPECT_LABEL } from "@/lib/imageCrop";
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
  /** Biến thể thumbnail gọn cho logo/icon trong các form dạng danh sách. */
  compact?: boolean;
  /** Ảnh bắt buộc giữ lại; nút thao tác chỉ cho thay ảnh hiện tại. */
  replaceOnly?: boolean;
  /**
   * Bắt buộc cắt ảnh mới chọn về khung chuẩn ảnh sản phẩm trước khi vào
   * preview. Chỉ bật ở ảnh sản phẩm/biến thể — ảnh bìa bài viết dùng 16:9 nên
   * để nguyên.
   */
  crop?: boolean;
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
  compact = false,
  replaceOnly = false,
  crop = false,
}: ImageUploadFieldProps<T>) {
  const { message, modal } = App.useApp();
  const { cropFiles, cropperNode } = useProductImageCropper();
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceIndexRef = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  /** Vị trí ảnh đang xem phóng to; `null` là đang đóng preview */
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const { field, fieldState } = useController({ name, control, rules });
  // useMemo để tham chiếu mảng ổn định giữa các lần render, tránh tạo lại callback
  const images = useMemo<UploadedImage[]>(() => field.value ?? [], [field.value]);

  const addFiles = useCallback(
    async (fileList: FileList | null, replaceIndex?: number) => {
      if (!fileList?.length) return;

      const room = replaceIndex === undefined ? maxCount - images.length : 1;
      if (room <= 0) {
        message.warning(`Chỉ được tải lên tối đa ${maxCount} ảnh`);
        return;
      }

      const valid: File[] = [];

      for (const file of Array.from(fileList).slice(0, room)) {
        if (!isAcceptedImageType(file)) {
          message.error(`${file.name}: chỉ nhận ảnh JPG, PNG, WEBP, AVIF hoặc GIF`);
          continue;
        }
        if (!isWithinImageSizeLimit(file)) {
          message.error(`${file.name}: ảnh vượt quá ${MAX_IMAGE_SIZE_MB}MB`);
          continue;
        }
        valid.push(file);
      }

      // Cắt về khung chuẩn trước khi ảnh vào preview/draft, nên từ đây trở đi luồng cũ
      // không đổi: vẫn là File trong value, upload lúc submit. Ảnh bị bỏ qua ở
      // bước cắt thì không được thêm vào danh sách.
      const ready = crop ? await cropFiles(valid) : valid;

      const accepted: UploadedImage[] = await Promise.all(
        ready.map(async (file) => ({
          id: `${file.name}-${file.lastModified}-${file.size}`,
          name: file.name,
          url: await readAsDataUrl(file),
          size: file.size,
          file,
        })),
      );

      if (accepted.length) {
        field.onChange(
          replaceIndex === undefined
            ? [...images, ...accepted]
            : images.map((image, index) => (index === replaceIndex ? accepted[0] : image)),
        );
      }
    },
    [crop, cropFiles, field, images, maxCount, message],
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

  const pickReplacement = (index: number) => {
    replaceIndexRef.current = index;
    inputRef.current?.click();
  };

  const replaceButton = (index: number) => (
    <Tooltip title="Thay ảnh khác">
      <Button
        size="small"
        type="text"
        disabled={disabled}
        aria-label="Thay ảnh"
        icon={<Pencil size={15} />}
        onClick={() => pickReplacement(index)}
      />
    </Tooltip>
  );

  return (
    <FormItemLayout
      label={label}
      required={required}
      error={fieldState.error?.message}
      helpText={
        (helpText ??
          `Tối đa ${maxCount} ảnh, mỗi ảnh dưới ${MAX_IMAGE_SIZE_MB}MB. Kéo ảnh để đổi thứ tự, bấm ngôi sao để chọn ảnh đại diện.`) +
        (crop ? ` Ảnh mới chọn được cắt về khung ${PRODUCT_IMAGE_ASPECT_LABEL} trước khi thêm.` : "")
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
                  "bg-card shrink-0 overflow-hidden rounded-lg border transition-colors",
                  compact ? "w-20" : "w-36",
                  isCover ? "border-brand" : "border-line",
                  dragIndex === index && "opacity-40",
                )}
              >
                {/* Chỉ vùng ảnh mới kéo được, thanh nút bên dưới vẫn bấm bình thường */}
                <div
                  draggable={!disabled}
                  onDragStart={() => setDragIndex(index)}
                  onDragEnd={() => setDragIndex(null)}
                  // Kéo-thả xong trình duyệt không bắn click, nên bấm vào ảnh
                  // để xem lớn không đụng tới thao tác đổi thứ tự.
                  onClick={() => setPreviewIndex(index)}
                  title="Bấm để xem ảnh lớn"
                  className={cn(
                    "bg-subtle group relative w-full cursor-zoom-in",
                    compact ? "h-16" : "h-28",
                  )}
                >
                  <Image
                    src={image.url}
                    alt={image.name}
                    fill
                    unoptimized
                    sizes={compact ? "80px" : "144px"}
                    className="object-cover"
                  />

                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <ZoomIn size={compact ? 16 : 22} />
                  </span>

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

                  <span className="inline-flex items-center">
                    {/* Thẻ compact chỉ rộng 80px, không đủ chỗ cho cả 2 nút */}
                    {(replaceOnly || !compact) && replaceButton(index)}

                    {!replaceOnly && (
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
                    )}
                  </span>
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
            const replaceIndex = replaceIndexRef.current;
            replaceIndexRef.current = null;
            void addFiles(event.target.files, replaceIndex ?? undefined);
            // Reset để chọn lại đúng file vừa xoá vẫn kích hoạt onChange
            event.target.value = "";
          }}
        />

        {/* Preview dùng chung cho cả danh sách, mở ở ảnh vừa bấm và lướt được sang ảnh khác */}
        <AntImage.PreviewGroup
          items={images.map((image) => image.url)}
          preview={{
            visible: previewIndex !== null,
            current: previewIndex ?? 0,
            onVisibleChange: (visible) => {
              if (!visible) setPreviewIndex(null);
            },
            onChange: (current) => setPreviewIndex(current),
          }}
        />

        {cropperNode}
      </div>
    </FormItemLayout>
  );
}

export default ImageUploadField;
