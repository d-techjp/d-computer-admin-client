"use client";

import { useEffect, useState } from "react";
import { App, Modal } from "antd";
import { useForm } from "react-hook-form";

import {
  ImageUploadField,
  TextAreaField,
  TextField,
  type UploadedImage,
} from "@/components/form/fields";
import { createTiktokVideo, updateTiktokVideo } from "@/lib/api/tiktok";
import { uploadImage } from "@/lib/api/uploads";
import { TIKTOK_URL_PATTERN, type TiktokVideo } from "@/types/tiktok";

interface TiktokVideoFormValues {
  videoUrl: string;
  description?: string;
  thumbnail: UploadedImage[];
}

export interface TiktokVideoFormModalProps {
  open: boolean;
  /** `null` = thêm mới; có giá trị = sửa video đó */
  editing: TiktokVideo | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

const EMPTY_VALUES: TiktokVideoFormValues = { videoUrl: "", description: "", thumbnail: [] };

/** Ảnh đã lưu quay lại form dưới dạng `UploadedImage` không kèm `file` — nghĩa là "giữ nguyên URL cũ". */
function toFormValues(video: TiktokVideo | null): TiktokVideoFormValues {
  if (!video) return EMPTY_VALUES;

  return {
    videoUrl: video.videoUrl,
    description: video.description ?? "",
    thumbnail: video.thumbnailUrl
      ? [{ id: video.id, name: "thumbnail", url: video.thumbnailUrl, size: 0 }]
      : [],
  };
}

export function TiktokVideoFormModal({
  open,
  editing,
  onClose,
  onSaved,
}: TiktokVideoFormModalProps) {
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);
  const { control, handleSubmit, reset } = useForm<TiktokVideoFormValues>({
    defaultValues: EMPTY_VALUES,
  });

  // Nạp lại mỗi lần mở: modal `destroyOnHidden` huỷ DOM nhưng `useForm` sống ở
  // component cha nên state cũ vẫn còn nếu không reset.
  useEffect(() => {
    if (open) reset(toFormValues(editing));
  }, [open, editing, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const [cover] = values.thumbnail;
      // Ảnh mới chọn (còn giữ File) thì upload lên R2 trước để lấy URL công khai.
      // Xoá hết ảnh -> `null` tường minh, vì `undefined` sẽ bị lọc khỏi payload
      // và backend hiểu là "giữ nguyên ảnh cũ".
      const thumbnailUrl = cover?.file
        ? await uploadImage(cover.file, "tiktok")
        : (cover?.url ?? null);

      const payload = {
        videoUrl: values.videoUrl.trim(),
        description: values.description?.trim() || null,
        thumbnailUrl,
      };

      if (editing) {
        await updateTiktokVideo(editing.id, payload);
      } else {
        await createTiktokVideo(payload);
      }

      message.success(editing ? "Đã cập nhật video" : "Đã thêm video mới");
      onClose();
      await onSaved();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không lưu được video");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Modal
      title={editing ? "Chỉnh sửa video TikTok" : "Thêm video TikTok"}
      open={open}
      onCancel={onClose}
      onOk={onSubmit}
      okText={editing ? "Lưu" : "Thêm"}
      cancelText="Huỷ"
      confirmLoading={submitting}
      destroyOnHidden
      width={560}
    >
      <div className="space-y-4 pt-2">
        <TextField
          name="videoUrl"
          control={control}
          label="Link video"
          required
          placeholder="https://www.tiktok.com/@tai-khoan/video/..."
          rules={{
            required: "Vui lòng nhập link video TikTok",
            pattern: {
              value: TIKTOK_URL_PATTERN,
              message: "Link phải là địa chỉ https trỏ tới tiktok.com",
            },
          }}
        />

        <ImageUploadField
          name="thumbnail"
          control={control}
          label="Ảnh đại diện"
          maxCount={1}
          helpText="Ảnh hiển thị thay cho video trên storefront, tỉ lệ khuyến nghị 9:16, dưới 5MB."
        />

        <TextAreaField
          name="description"
          control={control}
          label="Mô tả"
          rows={3}
          maxLength={1000}
          placeholder="Nội dung ngắn hiển thị kèm video"
        />
      </div>
    </Modal>
  );
}

export default TiktokVideoFormModal;
