"use client";

import { useMemo, useState } from "react";
import { App, Alert, Badge, Button, Input, Popconfirm, Tag, Tooltip } from "antd";
import { Plus, Sparkles, Trash2, X } from "lucide-react";

import { PermissionGate } from "@/components/auth/PermissionGate";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { setProductOptions, type OptionInput } from "@/lib/api/variants";
import type { Product } from "@/types/product";

import { GenerateVariantsModal } from "./GenerateVariantsModal";

interface DraftValue {
  /** Có id nghĩa là giá trị đã tồn tại ở backend — mới là giá trị vừa gõ thêm */
  id?: string;
  value: string;
}

interface DraftOption {
  id?: string;
  name: string;
  values: DraftValue[];
}

function toDrafts(product: Product): DraftOption[] {
  return product.options.map((option) => ({
    id: option.id,
    name: option.name,
    values: option.values.map((value) => ({ id: value.id, value: value.value })),
  }));
}

function sameDrafts(a: DraftOption[], b: DraftOption[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * biến thể — `PUT /products/{id}/options`.
 *
 * Endpoint là **replace-all** và trả 400 nếu payload bỏ mất một giá trị đang
 * có biến thể sử dụng. Vì vậy mỗi chip giá trị hiển thị sẵn số biến thể đang
 * dùng nó và chặn xoá ngay tại UI — để người dùng biết phải xoá biến thể nào
 * trước, thay vì bấm lưu rồi mới nhận thông báo lỗi.
 */
export function OptionsTab({
  product,
  onReload,
}: {
  product: Product;
  onReload: () => Promise<void> | void;
}) {
  const { message } = App.useApp();
  const [drafts, setDrafts] = useState<DraftOption[]>(() => toDrafts(product));
  const [saving, setSaving] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);

  // Nạp lại bản nháp khi tab cha tải lại sản phẩm. Chỉnh state ngay trong lúc
  // render thay vì trong effect để không đẻ thêm một lượt render thừa.
  const [syncedProduct, setSyncedProduct] = useState(product);
  if (syncedProduct !== product) {
    setSyncedProduct(product);
    setDrafts(toDrafts(product));
  }

  const original = useMemo(() => toDrafts(product), [product]);
  const dirty = !sameDrafts(drafts, original);

  /** Số biến thể đang dùng từng optionValue — nguồn để chặn xoá */
  const usageByValueId = useMemo(() => {
    const usage = new Map<string, number>();
    for (const variant of product.variants) {
      for (const value of variant.optionValues) {
        usage.set(value.id, (usage.get(value.id) ?? 0) + 1);
      }
    }
    return usage;
  }, [product.variants]);

  const patchOption = (index: number, patch: Partial<DraftOption>) => {
    setDrafts((current) =>
      current.map((option, position) =>
        position === index ? { ...option, ...patch } : option,
      ),
    );
  };

  const addValue = (index: number, raw: string) => {
    const value = raw.trim();
    if (!value) return;

    setDrafts((current) =>
      current.map((option, position) => {
        if (position !== index) return option;
        const exists = option.values.some(
          (item) => item.value.toLowerCase() === value.toLowerCase(),
        );
        return exists ? option : { ...option, values: [...option.values, { value }] };
      }),
    );
  };

  const removeValue = (optionIndex: number, valueIndex: number) => {
    setDrafts((current) =>
      current.map((option, position) =>
        position === optionIndex
          ? { ...option, values: option.values.filter((_, i) => i !== valueIndex) }
          : option,
      ),
    );
  };

  const onSave = async () => {
    const payload: OptionInput[] = drafts
      .filter((option) => option.name.trim() && option.values.length > 0)
      .map((option) => ({
        name: option.name.trim(),
        values: option.values.map((value) => ({ value: value.value })),
      }));

    setSaving(true);
    try {
      await setProductOptions(product.id, payload);
      await onReload();
      message.success("Đã lưu biến thể");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không lưu được biến thể");
    } finally {
      setSaving(false);
    }
  };

  const savedOptions = product.options;
  const combinationCount = savedOptions.reduce(
    (total, option) => total * Math.max(option.values.length, 1),
    savedOptions.length ? 1 : 0,
  );
  const missingCombinations = Math.max(combinationCount - product.variants.length, 0);

  return (
    <div className="space-y-4">
      <Alert
        type="info"
        showIcon
        message="Khai biến thể trước khi tạo phiên bản"
        description="Phiên bản tạo lúc chưa có biến thể sẽ không nằm trong lưới chọn cấu hình ở trang sản phẩm. Mỗi lần lưu là thay thế toàn bộ danh sách bên dưới."
      />

      <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-fg font-semibold">Biến thể</h3>
            <p className="text-muted text-sm">
              Mỗi biến thể là một thuộc tính khác nhau giữa các phiên bản: RAM, dung lượng, màu...
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <Button disabled={saving} onClick={() => setDrafts(original)}>
                Huỷ thay đổi
              </Button>
            )}
            <PermissionGate permission="product.manage">
              <Button type="primary" loading={saving} disabled={!dirty} onClick={onSave}>
                Lưu biến thể
              </Button>
            </PermissionGate>
          </div>
        </div>

        {drafts.length === 0 ? (
          <div className="border-line text-muted rounded-md border border-dashed p-6 text-center text-sm">
            Chưa khai biến thể nào. Sản phẩm vẫn bán bình thường với các phiên bản đang có.
          </div>
        ) : (
          <div className="space-y-3">
            {drafts.map((option, optionIndex) => (
              <OptionCard
                key={option.id ?? `new-${optionIndex}`}
                option={option}
                disabled={saving}
                usageByValueId={usageByValueId}
                onNameChange={(name) => patchOption(optionIndex, { name })}
                onAddValue={(value) => addValue(optionIndex, value)}
                onRemoveValue={(valueIndex) => removeValue(optionIndex, valueIndex)}
                onRemove={() =>
                  setDrafts((current) => current.filter((_, i) => i !== optionIndex))
                }
              />
            ))}
          </div>
        )}

        <Button
          type="dashed"
          block
          icon={<Plus size={16} />}
          disabled={saving}
          onClick={() => setDrafts((current) => [...current, { name: "", values: [] }])}
        >
          Thêm biến thể
        </Button>
      </section>

      {savedOptions.length > 0 && (
        <section className="bg-card border-line shadow-card space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-fg font-semibold">Sinh phiên bản tự động</h3>
              <p className="text-muted text-sm">
                {combinationCount} tổ hợp từ {savedOptions.length} biến thể · đã có{" "}
                {product.variants.length} phiên bản
                {missingCombinations > 0 ? ` · thiếu ${missingCombinations}` : ""}
              </p>
            </div>
            <PermissionGate permission="product.manage">
              <Button
                type="primary"
                icon={<Sparkles size={16} />}
                disabled={dirty}
                onClick={() => setGenerateOpen(true)}
              >
                Sinh phiên bản
              </Button>
            </PermissionGate>
          </div>

          {dirty && (
            <p className="text-warning text-sm">
              Lưu biến thể trước khi sinh phiên bản.
            </p>
          )}
        </section>
      )}

      <GenerateVariantsModal
        open={generateOpen}
        product={product}
        onClose={() => setGenerateOpen(false)}
        onGenerated={async () => {
          await onReload();
        }}
      />
    </div>
  );
}

function OptionCard({
  option,
  disabled,
  usageByValueId,
  onNameChange,
  onAddValue,
  onRemoveValue,
  onRemove,
}: {
  option: DraftOption;
  disabled?: boolean;
  usageByValueId: Map<string, number>;
  onNameChange: (name: string) => void;
  onAddValue: (value: string) => void;
  onRemoveValue: (index: number) => void;
  onRemove: () => void;
}) {
  const [draftValue, setDraftValue] = useState("");

  const commit = () => {
    onAddValue(draftValue);
    setDraftValue("");
  };

  return (
    <div className="border-line rounded-md border p-3">
      <div className="flex items-start gap-2">
        <FormItemLayout label="Tên biến thể" className="flex-1" required>
          <Input
            value={option.name}
            disabled={disabled}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="VD: RAM, Dung lượng, Màu sắc"
          />
        </FormItemLayout>
        <Tooltip title="Xoá trục này">
          <Button
            type="text"
            danger
            className="mt-6"
            disabled={disabled}
            icon={<Trash2 size={16} />}
            onClick={onRemove}
            aria-label={`Xoá trục ${option.name || "chưa đặt tên"}`}
          />
        </Tooltip>
      </div>

      <FormItemLayout
        label="Giá trị"
        required
        helpText="Gõ rồi nhấn Enter để thêm. Số trên chip là số phiên bản đang dùng giá trị đó."
        className="mt-2"
      >
        <div className="flex flex-wrap items-center gap-2">
          {option.values.map((value, index) => {
            const usage = value.id ? (usageByValueId.get(value.id) ?? 0) : 0;
            const locked = usage > 0;

            return (
              <Badge key={value.id ?? `new-${index}`} count={usage} size="small" color="blue">
                <Tag
                  className="m-0 flex items-center gap-1 py-1"
                  color={locked ? "processing" : "default"}
                >
                  {value.value}
                  {locked ? (
                    <Popconfirm
                      title="Không xoá được giá trị này"
                      description={`Có ${usage} phiên bản đang dùng. Xoá các phiên bản đó ở tab "Phiên bản & kho" trước.`}
                      okText="Đã hiểu"
                      showCancel={false}
                    >
                      <button
                        type="button"
                        disabled={disabled}
                        className="text-muted hover:text-danger"
                        aria-label={`Xoá giá trị ${value.value}`}
                      >
                        <X size={12} />
                      </button>
                    </Popconfirm>
                  ) : (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onRemoveValue(index)}
                      className="text-muted hover:text-danger"
                      aria-label={`Xoá giá trị ${value.value}`}
                    >
                      <X size={12} />
                    </button>
                  )}
                </Tag>
              </Badge>
            );
          })}

          <Input
            value={draftValue}
            disabled={disabled}
            onChange={(event) => setDraftValue(event.target.value)}
            onPressEnter={(event) => {
              event.preventDefault();
              commit();
            }}
            onBlur={commit}
            placeholder="Thêm giá trị..."
            className="w-40"
            size="small"
          />
        </div>
      </FormItemLayout>
    </div>
  );
}

export default OptionsTab;
