"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { App, Button, Modal, Tooltip } from "antd";
import { ImagePlus, Star, Trash2, Upload } from "lucide-react";

import { useProductImageCropper } from "@/components/common/ProductImageCropper";
import { updateVariant } from "@/lib/api/variants";
import {
  ACCEPTED_IMAGE_TYPES,
  isAcceptedImageType,
  isWithinImageSizeLimit,
  MAX_IMAGE_SIZE_MB,
  readAsDataUrl,
} from "@/lib/imageUpload";
import { cn } from "@/lib/utils";
import type { ProductVariant } from "@/types/variant";

interface ImageEntry {
  id: string;
  /** Preview URL — ảnh đã có trên R2 hoặc data URL của file vừa chọn */
  url: string;
  /** Chỉ có ở ảnh mới chọn từ máy, chưa upload */
  file?: File;
}

function toEntries(variant: ProductVariant): ImageEntry[] {
  const urls = [variant.thumbnail, ...variant.images].filter(
    (url, index, all): url is string => !!url && all.indexOf(url) === index,
  );
  return urls.map((url, index) => ({ id: `${variant.id}-${index}-${url}`, url }));
}

interface VariantImagesModalProps {
  /** `undefined` = đóng modal */
  variant?: ProductVariant;
  /** Ảnh sản phẩm dùng làm ảnh dự phòng khi biến thể chưa có ảnh riêng */
  fallbackThumbnail?: string;
  onClose: () => void;
  onSaved: (variant: ProductVariant) => void;
}

/**
 * Ảnh riêng của biến thể — `PATCH /variants/{id}` (multipart).
 *
 * Đây là **API duy nhất** gán được ảnh riêng cho biến thể: lúc tạo sản phẩm
 * (hàng loạt biến thể trong một request), backend chỉ nhận `thumbnail`/`images`
 * dạng URL có sẵn, không nhận file — nên ảnh riêng luôn là thao tác bước hai,
 * sau khi biến thể đã tồn tại. Vì vậy modal này chỉ có ở màn sửa sản phẩm.
 *
 * Ảnh đầu tiên trong danh sách là ảnh đại diện của biến thể; không gửi
 * `thumbnail` thì backend giữ nguyên ảnh cũ — **không có cách xoá hết ảnh
 * riêng** để quay về dùng ảnh sản phẩm (giới hạn hiện tại của backend). Vì vậy
 * ảnh đã lưu chỉ xoá được khi còn ảnh khác thay thế, và nút Lưu bị khoá khi
 * danh sách rỗng thay vì âm thầm gửi một request không có tác dụng gì.
 */
export function VariantImagesModal({
  variant,
  fallbackThumbnail,
  onClose,
  onSaved,
}: VariantImagesModalProps) {
  const { message } = App.useApp();
  const { cropFiles, cropperNode } = useProductImageCropper();
  const [images, setImages] = useState<ImageEntry[]>(variant ? toEntries(variant) : []);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Nạp lại danh sách mỗi lần mở cho một biến thể khác, ngay trong lúc render
  // để tránh một nhịp hiển thị dữ liệu của biến thể trước.
  const [openedFor, setOpenedFor] = useState(variant?.id);
  if (variant?.id !== openedFor) {
    setOpenedFor(variant?.id);
    setImages(variant ? toEntries(variant) : []);
  }

  const addFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) return;

      const valid: File[] = [];
      for (const file of Array.from(fileList)) {
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

      // Cắt về 4:3 như ảnh sản phẩm — ảnh biến thể hiển thị trong cùng khung ở
      // storefront. Ảnh đã lưu trên R2 giữ nguyên, chỉ file mới chọn mới qua đây.
      const accepted: ImageEntry[] = await Promise.all(
        (await cropFiles(valid)).map(async (file) => ({
          id: `${file.name}-${file.lastModified}-${file.size}`,
          url: await readAsDataUrl(file),
          file,
        })),
      );

      if (accepted.length) setImages((current) => [...current, ...accepted]);
    },
    [cropFiles, message],
  );

  const moveTo = (from: number, to: number) => {
    if (from === to) return;
    setImages((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const removeAt = (index: number) => setImages((current) => current.filter((_, i) => i !== index));

  /**
   * Biến thể đã có ảnh riêng thì danh sách không được về rỗng — backend không
   * nhận "xoá sạch ảnh riêng", xoá hết rồi lưu thì ảnh cũ vẫn nguyên đó. Sàn
   * suy từ `variant` (dữ liệu server) chứ không từ `images` đang sửa: thêm ảnh
   * mới rồi xoá ảnh cũ là thay ảnh hợp lệ, nhưng tấm cuối vẫn phải ở lại.
   */
  const minImages = variant?.thumbnail || variant?.images.length ? 1 : 0;
  const canRemove = images.length > minImages;

  const onSave = async () => {
    if (!variant || images.length === 0) return;

    setSaving(true);
    try {
      const updated = await updateVariant(
        variant.id,
        {},
        images.map((image) => (image.file ? { file: image.file } : { url: image.url })),
      );
      onSaved(updated);
      message.success(`Đã lưu ảnh riêng cho ${updated.sku}`);
      onClose();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không lưu được ảnh");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={variant ? `Ảnh riêng — ${variant.sku}` : "Ảnh riêng"}
      open={!!variant}
      onCancel={onClose}
      onOk={onSave}
      okText="Lưu ảnh"
      cancelText="Huỷ"
      confirmLoading={saving}
      okButtonProps={{ disabled: images.length === 0 }}
      destroyOnHidden
      width={560}
    >
      {variant && (
        <div className="space-y-3 pt-2">
          <p className="text-muted text-sm">
            Ảnh riêng dùng thay ảnh sản phẩm ở trang chi tiết khi khách chọn đúng phiên bản này
            (VD: màu Đỏ có ảnh khác màu Xanh). Bỏ trống thì hiển thị ảnh sản phẩm.
          </p>

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
                    "bg-card w-28 shrink-0 overflow-hidden rounded-lg border transition-colors",
                    isCover ? "border-brand" : "border-line",
                    dragIndex === index && "opacity-40",
                  )}
                >
                  <div
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragEnd={() => setDragIndex(null)}
                    className="bg-subtle relative h-20 w-full cursor-grab active:cursor-grabbing"
                  >
                    <Image
                      src={image.url}
                      alt=""
                      fill
                      unoptimized
                      sizes="112px"
                      className="object-cover"
                    />
                    {isCover && (
                      <span className="bg-brand absolute left-1 top-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-[9px] font-semibold text-white">
                        <Star size={9} fill="currentColor" /> Đại diện
                      </span>
                    )}
                  </div>

                  <figcaption className="border-line flex items-center justify-between border-t px-1 py-0.5">
                    <Tooltip title={isCover ? "Đây là ảnh đại diện" : "Đặt làm ảnh đại diện"}>
                      <Button
                        size="small"
                        type="text"
                        disabled={isCover}
                        aria-label="Đặt làm ảnh đại diện"
                        onClick={() => moveTo(index, 0)}
                        icon={
                          <Star
                            size={13}
                            className={isCover ? "text-brand" : "text-muted"}
                            fill={isCover ? "currentColor" : "none"}
                          />
                        }
                      />
                    </Tooltip>
                    <Tooltip
                      title={
                        canRemove
                          ? "Xoá khỏi biến thể này"
                          : "Phải giữ lại ít nhất 1 ảnh — thêm ảnh mới trước rồi mới xoá ảnh này"
                      }
                    >
                      {/* span để tooltip vẫn hiện khi nút bị disable */}
                      <span className="inline-flex">
                        <Button
                          size="small"
                          type="text"
                          danger
                          disabled={!canRemove}
                          aria-label="Xoá ảnh"
                          icon={<Trash2 size={13} />}
                          onClick={() => removeAt(index)}
                        />
                      </span>
                    </Tooltip>
                  </figcaption>
                </figure>
              );
            })}

            <label
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
                "text-muted hover:border-brand hover:text-brand flex h-[104px] w-28 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed transition-colors",
                dragOver ? "border-brand text-brand bg-brand/5" : "border-line",
              )}
            >
              {dragOver ? <Upload size={20} /> : <ImagePlus size={20} />}
              <span className="text-xs font-medium">{dragOver ? "Thả vào đây" : "Thêm ảnh"}</span>
              <input
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                multiple
                hidden
                onChange={(event) => {
                  void addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
          </div>

          {images.length === 0 && (
            <p className="text-warning text-xs">
              {fallbackThumbnail
                ? "Chưa có ảnh nào — thêm ít nhất 1 ảnh để lưu, hoặc bấm Huỷ để tiếp tục dùng ảnh sản phẩm."
                : "Thêm ít nhất 1 ảnh để lưu."}
            </p>
          )}

          {cropperNode}
        </div>
      )}
    </Modal>
  );
}

export default VariantImagesModal;
