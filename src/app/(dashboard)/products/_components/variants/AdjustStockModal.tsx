"use client";

import { useState } from "react";
import { App, Button, Input, InputNumber, Modal } from "antd";

import { FormItemLayout } from "@/components/form/FormItemLayout";
import { adjustVariantStock } from "@/lib/api/variants";
import { cn, formatNumber } from "@/lib/utils";
import type { ProductVariant } from "@/types/variant";

/** Bấm nhanh thay vì gõ tay — phần lớn thao tác nhập hàng là số tròn nhỏ */
const QUICK_DELTAS = [1, 5, 10, -1];

interface AdjustStockModalProps {
  /** `undefined` = đóng modal */
  variant?: ProductVariant;
  onClose: () => void;
  onAdjusted: (variant: ProductVariant) => void;
}

/**
 * Điều chỉnh tồn kho bằng `PATCH /variants/{id}/stock`.
 *
 * Cố tình dùng `delta` + `reason` thay vì cho sửa thẳng ô `stock`: backend ghi
 * lý do vào nhật ký hoạt động, và thao tác này thuộc quyền `inventory.manage`
 * chứ không phải `product.manage` như phần còn lại của trang sản phẩm.
 */
export function AdjustStockModal({ variant, onClose, onAdjusted }: AdjustStockModalProps) {
  const { message } = App.useApp();
  const [delta, setDelta] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Mỗi lần mở cho một biến thể khác thì làm sạch form. Chỉnh state ngay trong
  // lúc render (thay vì effect) để không có một nhịp hiển thị giá trị cũ.
  const [openedFor, setOpenedFor] = useState(variant?.id);
  if (variant?.id !== openedFor) {
    setOpenedFor(variant?.id);
    setDelta(null);
    setReason("");
  }

  // Combo derived_from_components lấy tồn kho từ thành phần — backend từ chối
  // mọi điều chỉnh trực tiếp, nên chặn ngay ở UI thay vì để rơi ra lỗi 400.
  const isDerivedBundle = variant?.bundleInventoryPolicy === "derived_from_components";
  const nextStock = (variant?.stock ?? 0) + (delta ?? 0);
  const invalid = !delta || nextStock < 0;

  const onSubmit = async () => {
    if (!variant || !delta) return;

    setSubmitting(true);
    try {
      const updated = await adjustVariantStock(variant.id, {
        delta,
        reason: reason.trim() || undefined,
      });
      onAdjusted(updated);
      message.success(
        `Đã ${delta > 0 ? "nhập thêm" : "trừ"} ${formatNumber(Math.abs(delta))} cho ${variant.sku}`,
      );
      onClose();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không điều chỉnh được tồn kho");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Điều chỉnh tồn kho"
      open={!!variant}
      onCancel={onClose}
      onOk={onSubmit}
      okText="Xác nhận"
      cancelText="Huỷ"
      confirmLoading={submitting}
      okButtonProps={{ disabled: invalid || isDerivedBundle }}
      destroyOnHidden
    >
      {variant && (
        <div className="space-y-4 pt-2">
          <div className="bg-subtle rounded-md px-3 py-2">
            <div className="font-medium">{variant.name}</div>
            <div className="text-muted text-xs">{variant.sku}</div>
          </div>

          {isDerivedBundle ? (
            <p className="text-danger text-sm">
              Combo này lấy tồn kho từ thành phần, không nhập tay được. Hãy điều chỉnh tồn
              kho của các thành phần thay vì combo.
            </p>
          ) : (
            <>
              <FormItemLayout
                label="Số lượng thay đổi"
                required
                helpText="Số dương để nhập thêm, số âm để trừ kho."
              >
                <InputNumber
                  autoFocus
                  value={delta}
                  onChange={setDelta}
                  placeholder="VD: 10 hoặc -3"
                  className="w-full"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {QUICK_DELTAS.map((quick) => (
                    <Button
                      key={quick}
                      size="small"
                      onClick={() => setDelta((current) => (current ?? 0) + quick)}
                    >
                      {quick > 0 ? `+${quick}` : quick}
                    </Button>
                  ))}
                </div>
              </FormItemLayout>

              <FormItemLayout label="Lý do" helpText="Ghi vào nhật ký hoạt động.">
                <Input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="VD: Nhập hàng lô tháng 8, kiểm kê cuối tháng..."
                  maxLength={200}
                />
              </FormItemLayout>

              <div className="border-line flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="text-muted">
                  Tồn hiện tại {formatNumber(variant.stock)}
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    nextStock < 0 && "text-danger",
                    nextStock >= 0 && (delta ?? 0) !== 0 && "text-brand",
                  )}
                >
                  → {formatNumber(nextStock)}
                </span>
              </div>

              {nextStock < 0 && (
                <p className="text-danger text-sm">
                  Tồn kho sau điều chỉnh không được nhỏ hơn 0.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

export default AdjustStockModal;
