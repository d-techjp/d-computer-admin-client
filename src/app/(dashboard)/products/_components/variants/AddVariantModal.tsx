"use client";

import { useMemo, useState } from "react";
import { App, Input, InputNumber, Modal, Select } from "antd";

import { FormItemLayout } from "@/components/form/FormItemLayout";
import { createVariant } from "@/lib/api/variants";
import type { Product } from "@/types/product";
import type { ProductVariant } from "@/types/variant";

interface AddVariantModalProps {
  open: boolean;
  product: Product;
  existingVariants: ProductVariant[];
  onClose: () => void;
  onCreated: (variant: ProductVariant) => void;
}

interface FormState {
  name: string;
  sku: string;
  price?: number;
  compareAtPrice?: number;
  costPrice?: number;
  stock?: number;
  lowStockThreshold?: number;
}

const EMPTY: FormState = { name: "", sku: "", stock: 0, lowStockThreshold: 5 };

/**
 * Thêm một biến thể lẻ — `POST /products/{id}/variants`.
 *
 * Sản phẩm đã khai option thì `optionValueIds` phải phủ **đúng một giá trị cho
 * mỗi option**; thiếu, thừa hoặc trùng tổ hợp đều bị backend trả 400, nên cả
 * ba trường hợp đó được chặn ngay tại đây thay vì để lỗi rơi ra sau khi bấm
 * lưu.
 */
export function AddVariantModal({
  open,
  product,
  existingVariants,
  onClose,
  onCreated,
}: AddVariantModalProps) {
  const { message } = App.useApp();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isService = product.productType === "service";
  const options = product.options;

  // Làm sạch form mỗi lần mở lại, ngay trong lúc render thay vì trong effect
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(EMPTY);
      setSelected({});
    }
  }

  const patch = (next: Partial<FormState>) => setForm((current) => ({ ...current, ...next }));

  const selectedIds = useMemo(
    () => options.map((option) => selected[option.id]).filter(Boolean),
    [options, selected],
  );

  const missingOption = options.length > 0 && selectedIds.length !== options.length;

  /** Tổ hợp option là duy nhất trong một sản phẩm */
  const duplicated = useMemo(() => {
    if (missingOption || options.length === 0) return false;
    const target = new Set(selectedIds);
    return existingVariants.some(
      (variant) =>
        variant.optionValues.length === target.size &&
        variant.optionValues.every((value) => target.has(value.id)),
    );
  }, [existingVariants, missingOption, options.length, selectedIds]);

  const skuDuplicated = existingVariants.some(
    (variant) => variant.sku.trim().toLowerCase() === form.sku.trim().toLowerCase(),
  );

  const invalid =
    !form.sku.trim() || form.price === undefined || missingOption || duplicated || skuDuplicated;

  const onSubmit = async () => {
    if (invalid) return;

    setSubmitting(true);
    try {
      const variant = await createVariant(product.id, {
        name: form.name.trim() || undefined,
        sku: form.sku.trim(),
        price: form.price,
        compareAtPrice: form.compareAtPrice,
        costPrice: form.costPrice,
        stock: isService ? undefined : (form.stock ?? 0),
        lowStockThreshold: isService ? undefined : form.lowStockThreshold,
        trackInventory: isService ? false : undefined,
        optionValueIds: options.length > 0 ? selectedIds : undefined,
      });

      onCreated(variant);
      message.success(`Đã thêm phiên bản ${variant.sku}`);
      onClose();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không thêm được phiên bản");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Thêm phiên bản"
      open={open}
      onCancel={onClose}
      onOk={onSubmit}
      okText="Thêm phiên bản"
      cancelText="Huỷ"
      confirmLoading={submitting}
      okButtonProps={{ disabled: invalid }}
      destroyOnHidden
      width={560}
    >
      <div className="space-y-4 pt-2">
        {options.length > 0 && (
          <div className="border-line space-y-3 rounded-md border p-3">
            <p className="text-fg text-sm font-medium">Cấu hình</p>
            {options.map((option) => (
              <FormItemLayout key={option.id} label={option.name} required>
                <Select
                  value={selected[option.id]}
                  onChange={(value) =>
                    setSelected((current) => ({ ...current, [option.id]: value }))
                  }
                  placeholder={`Chọn ${option.name.toLowerCase()}`}
                  options={option.values.map((value) => ({
                    label: value.value,
                    value: value.id,
                  }))}
                  className="w-full"
                />
              </FormItemLayout>
            ))}
            {duplicated && (
              <p className="text-danger text-xs">
                Tổ hợp này đã có phiên bản. Chọn tổ hợp khác hoặc sửa phiên bản đang có.
              </p>
            )}
          </div>
        )}

        <FormItemLayout
          label="Tên phiên bản"
          helpText="Bỏ trống thì backend tự đặt theo tổ hợp cấu hình."
        >
          <Input
            value={form.name}
            onChange={(event) => patch({ name: event.target.value })}
            placeholder="VD: 16GB / 512GB"
          />
        </FormItemLayout>

        <FormItemLayout
          label="Mã SKU"
          required
          error={skuDuplicated ? "SKU này đã được dùng ở phiên bản khác" : undefined}
        >
          <Input
            value={form.sku}
            status={skuDuplicated ? "error" : undefined}
            onChange={(event) => patch({ sku: event.target.value })}
            placeholder="VD: ASU-16-512"
          />
        </FormItemLayout>

        <div className="grid grid-cols-2 gap-4">
          <FormItemLayout label="Giá bán" required>
            <InputNumber
              value={form.price}
              onChange={(price) => patch({ price: price ?? undefined })}
              min={0}
              step={1000}
              className="w-full"
            />
          </FormItemLayout>
          <FormItemLayout label="Giá so sánh">
            <InputNumber
              value={form.compareAtPrice}
              onChange={(value) => patch({ compareAtPrice: value ?? undefined })}
              min={0}
              step={1000}
              className="w-full"
            />
          </FormItemLayout>
        </div>

        {!isService && (
          <div className="grid grid-cols-2 gap-4">
            <FormItemLayout label="Tồn kho">
              <InputNumber
                value={form.stock}
                onChange={(stock) => patch({ stock: stock ?? undefined })}
                min={0}
                className="w-full"
              />
            </FormItemLayout>
            <FormItemLayout label="Ngưỡng cảnh báo">
              <InputNumber
                value={form.lowStockThreshold}
                onChange={(value) => patch({ lowStockThreshold: value ?? undefined })}
                min={0}
                className="w-full"
              />
            </FormItemLayout>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default AddVariantModal;
