"use client";

import { useMemo, useState } from "react";
import { App, Alert, Input, InputNumber, Modal, Tag } from "antd";

import { FormItemLayout } from "@/components/form/FormItemLayout";
import { generateVariants } from "@/lib/api/variants";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

/** Trên ngưỡng này thì cảnh báo trước khi sinh — 50 dòng đã là bảng rất dài */
const LARGE_COMBINATION_WARNING = 50;

interface Combination {
  key: string;
  label: string;
  exists: boolean;
}

/** Tích Descartes các giá trị option, theo đúng thứ tự option đang khai */
function buildCombinations(product: Product): Combination[] {
  if (product.options.length === 0) return [];

  const existing = new Set(
    product.variants
      .filter((variant) => variant.optionValues.length > 0)
      .map((variant) =>
        variant.optionValues
          .map((value) => value.id)
          .sort()
          .join("|"),
      ),
  );

  let rows: { ids: string[]; labels: string[] }[] = [{ ids: [], labels: [] }];
  for (const option of product.options) {
    rows = rows.flatMap((row) =>
      option.values.map((value) => ({
        ids: [...row.ids, value.id],
        labels: [...row.labels, value.value],
      })),
    );
  }

  return rows.map((row) => ({
    key: row.ids.join("|"),
    label: row.labels.join(" / "),
    exists: existing.has([...row.ids].sort().join("|")),
  }));
}

/**
 * Sinh biến thể cho mọi tổ hợp option — `POST /products/{id}/variants/generate`.
 *
 * Endpoint idempotent: tổ hợp đã có được bỏ qua, response trả về **toàn bộ**
 * biến thể. Bảng preview bên dưới hiển thị trước tổ hợp nào sẽ được tạo và tổ
 * hợp nào giữ nguyên, để người dùng không phải đoán.
 */
export function GenerateVariantsModal({
  open,
  product,
  onClose,
  onGenerated,
}: {
  open: boolean;
  product: Product;
  onClose: () => void;
  onGenerated: () => Promise<void> | void;
}) {
  const { message } = App.useApp();
  const [skuPrefix, setSkuPrefix] = useState("");
  const [price, setPrice] = useState<number>();
  const [stock, setStock] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const combinations = useMemo(() => buildCombinations(product), [product]);
  const missing = combinations.filter((item) => !item.exists);

  // Mở lại thì gợi ý sẵn từ biến thể mặc định: SKU gốc và giá đang bán.
  // Chỉnh state ngay trong lúc render thay vì trong effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const base = product.variants.find((variant) => variant.isDefault) ?? product.variants[0];
      setSkuPrefix(base?.sku.split("-").slice(0, 2).join("-") ?? "");
      setPrice(base?.price);
      setStock(0);
    }
  }

  const invalid = !skuPrefix.trim() || price === undefined || missing.length === 0;

  const onSubmit = async () => {
    if (invalid) return;

    setSubmitting(true);
    try {
      const variants = await generateVariants(product.id, {
        skuPrefix: skuPrefix.trim(),
        price,
        stock: stock ?? 0,
      });
      await onGenerated();
      message.success(`Đã sinh xong, sản phẩm hiện có ${variants.length} phiên bản`);
      onClose();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không sinh được phiên bản");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Sinh phiên bản từ trục biến thể"
      open={open}
      onCancel={onClose}
      onOk={onSubmit}
      okText={missing.length > 0 ? `Sinh ${missing.length} phiên bản` : "Không có gì để sinh"}
      cancelText="Huỷ"
      confirmLoading={submitting}
      okButtonProps={{ disabled: invalid }}
      destroyOnHidden
      width={640}
    >
      <div className="space-y-4 pt-2">
        {missing.length === 0 ? (
          <Alert
            type="success"
            showIcon
            message="Đã đủ phiên bản"
            description="Mọi tổ hợp của các trục biến thể hiện tại đều đã có phiên bản."
          />
        ) : (
          missing.length > LARGE_COMBINATION_WARNING && (
            <Alert
              type="warning"
              showIcon
              message={`Sắp tạo ${missing.length} phiên bản`}
              description="Số lượng lớn sẽ khiến bảng phiên bản rất dài. Cân nhắc bớt giá trị ở các trục biến thể."
            />
          )
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormItemLayout
            label="Tiền tố SKU"
            required
            helpText="SKU sinh ra dạng {tiền tố}-{tổ hợp}."
            className="sm:col-span-3"
          >
            <Input
              value={skuPrefix}
              onChange={(event) => setSkuPrefix(event.target.value)}
              placeholder="VD: ASU-ROG-G16"
            />
          </FormItemLayout>

          <FormItemLayout label="Giá khởi tạo" required className="sm:col-span-2">
            <InputNumber
              value={price}
              onChange={(value) => setPrice(value ?? undefined)}
              min={0}
              step={1000}
              className="w-full"
            />
          </FormItemLayout>

          <FormItemLayout label="Tồn khởi tạo">
            <InputNumber
              value={stock}
              onChange={(value) => setStock(value ?? 0)}
              min={0}
              className="w-full"
            />
          </FormItemLayout>
        </div>

        <p className="text-muted text-xs">
          Chỉnh giá và tồn kho riêng cho từng phiên bản ở tab &ldquo;Phiên bản &amp; kho&rdquo;
          sau khi sinh xong. Gọi lại nhiều lần vẫn an toàn — tổ hợp đã có được giữ nguyên.
        </p>

        <div>
          <p className="text-fg mb-2 text-sm font-medium">
            {combinations.length} tổ hợp · {missing.length} sẽ được tạo
          </p>
          <div className="border-line max-h-56 overflow-y-auto rounded-md border p-2">
            <div className="flex flex-wrap gap-1.5">
              {combinations.map((item) => (
                <Tag
                  key={item.key}
                  className={cn("m-0", item.exists && "opacity-50")}
                  color={item.exists ? "default" : "green"}
                >
                  {item.label}
                  {item.exists && <span className="ms-1 text-xs">(đã có)</span>}
                </Tag>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default GenerateVariantsModal;
