"use client";

import { useEffect, useState } from "react";
import { App, Button, Skeleton } from "antd";
import { useForm } from "react-hook-form";

import { RichTextField } from "@/components/form/fields";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { fetchProductDescription, updateProductDescription } from "@/lib/api/products";

interface DescriptionFormValues {
  description: string;
}

/**
 * Mô tả chi tiết — `GET`/`PUT /products/{id}/description`.
 *
 * Nội dung nằm ở endpoint riêng nên tab này tự tải khi được mở lần đầu; nhờ
 * vậy mở trang sửa sản phẩm không phải dựng sẵn TipTap (nặng) khi người dùng
 * chỉ định sửa giá.
 */
export function DescriptionTab({ productId }: { productId: string }) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { control, handleSubmit, reset, formState } = useForm<DescriptionFormValues>({
    defaultValues: { description: "" },
  });

  useUnsavedChangesGuard(formState.isDirty && !saving);

  useEffect(() => {
    let cancelled = false;

    fetchProductDescription(productId)
      .then((content) => {
        // `reset` thay vì `setValue` để nội dung vừa tải về không bị tính là "chưa lưu"
        if (!cancelled) reset({ description: content });
      })
      .catch((error) => {
        if (!cancelled) {
          message.error(
            error instanceof Error ? error.message : "Không tải được mô tả chi tiết",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [message, productId, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    try {
      await updateProductDescription(productId, values.description);
      reset({ description: values.description });
      message.success("Đã lưu mô tả chi tiết");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không lưu được mô tả chi tiết");
    } finally {
      setSaving(false);
    }
  });

  if (loading) {
    return (
      <div className="bg-card border-line shadow-card rounded-lg border p-4">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <section className="bg-card border-line shadow-card space-y-3 rounded-lg border p-4">
        <div>
          <h3 className="text-fg font-semibold">Mô tả chi tiết</h3>
          <p className="text-muted text-sm">
            Nội dung hiển thị ở trang chi tiết sản phẩm trên cửa hàng.
          </p>
        </div>

        <RichTextField
          name="description"
          control={control}
          minHeight={360}
          disabled={saving}
          placeholder="Soạn mô tả chi tiết, thông số nổi bật, chính sách bảo hành..."
        />
      </section>

      <div className="flex justify-end">
        <Button type="primary" htmlType="submit" loading={saving} disabled={!formState.isDirty}>
          Lưu mô tả chi tiết
        </Button>
      </div>
    </form>
  );
}

export default DescriptionTab;
