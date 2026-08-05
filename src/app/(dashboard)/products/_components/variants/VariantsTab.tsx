"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { App, Alert, Button, Input, InputNumber, Popconfirm, Radio, Switch, Tag, Tooltip } from "antd";
import { ImageOff, Plus, RotateCcw, Trash2, Warehouse } from "lucide-react";

import { PermissionGate } from "@/components/auth/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import { deleteVariant, updateVariant, type VariantPayload } from "@/lib/api/variants";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import type { Product } from "@/types/product";
import { isLowStock, optionLabelOf, type ProductVariant } from "@/types/variant";

import { AddVariantModal } from "./AddVariantModal";
import { AdjustStockModal } from "./AdjustStockModal";

/** Các trường sửa được ngay trên bảng */
interface VariantDraft {
  name: string;
  sku: string;
  price?: number;
  compareAtPrice?: number;
  costPrice?: number;
  lowStockThreshold?: number;
}

// Ảnh | Tên | SKU | Giá | So sánh | Vốn | Tồn | Ngưỡng | Mặc định | Bật | Xoá
const ROW_GRID =
  "grid grid-cols-[44px_minmax(160px,1.4fr)_minmax(140px,1.2fr)_repeat(3,minmax(110px,1fr))_minmax(120px,1fr)_minmax(90px,0.7fr)_72px_64px_44px] items-center gap-2";

function toDraft(variant: ProductVariant): VariantDraft {
  return {
    name: variant.name,
    sku: variant.sku,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    costPrice: variant.costPrice,
    lowStockThreshold: variant.lowStockThreshold,
  };
}

/** Chỉ gửi trường thực sự đổi để PATCH không ghi đè thứ người khác vừa sửa */
function diffDraft(variant: ProductVariant, draft: VariantDraft): VariantPayload {
  const payload: VariantPayload = {};
  if (draft.name !== variant.name) payload.name = draft.name;
  if (draft.sku !== variant.sku) payload.sku = draft.sku;
  if (draft.price !== variant.price) payload.price = draft.price;
  if (draft.compareAtPrice !== variant.compareAtPrice) {
    payload.compareAtPrice = draft.compareAtPrice;
  }
  if (draft.costPrice !== variant.costPrice) payload.costPrice = draft.costPrice;
  if (draft.lowStockThreshold !== variant.lowStockThreshold) {
    payload.lowStockThreshold = draft.lowStockThreshold;
  }
  return payload;
}

function isDirty(payload: VariantPayload) {
  return Object.keys(payload).length > 0;
}

interface VariantsTabProps {
  product: Product;
  onVariantsChange: (variants: ProductVariant[]) => void;
  onReload: () => Promise<void> | void;
}

/**
 * Bảng biến thể — mỗi dòng lưu riêng bằng `PATCH /variants/{id}`.
 *
 * Tồn kho cố tình **không sửa trực tiếp** ở đây: nó đi qua modal điều chỉnh
 * (`PATCH /variants/{id}/stock`) để có `delta` + lý do vào nhật ký, và vì thao
 * tác đó thuộc quyền `inventory.manage` chứ không phải `product.manage`.
 */
export function VariantsTab({ product, onVariantsChange, onReload }: VariantsTabProps) {
  const { message } = App.useApp();
  const { has } = usePermissions();
  const [variants, setVariants] = useState<ProductVariant[]>(product.variants);
  const [drafts, setDrafts] = useState<Record<string, VariantDraft>>({});
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [savingAll, setSavingAll] = useState(false);
  const [adjustingVariant, setAdjustingVariant] = useState<ProductVariant>();
  const [addOpen, setAddOpen] = useState(false);

  const canManage = has("product.manage");
  const isService = product.productType === "service";
  const isBundle = product.productType === "bundle";
  const hasOptions = product.options.length > 0;

  // Đồng bộ lại khi tab cha nạp lại sản phẩm (sinh biến thể, đổi option...).
  // Chỉnh state ngay trong lúc render thay vì trong effect: React xử lý xong
  // vòng render này rồi mới vẽ, nên không có nhấp nháy và không đẻ thêm một
  // lượt render thừa như khi dùng useEffect.
  const [syncedVariants, setSyncedVariants] = useState(product.variants);
  if (syncedVariants !== product.variants) {
    setSyncedVariants(product.variants);
    setVariants(product.variants);
    setDrafts(Object.fromEntries(product.variants.map((item) => [item.id, toDraft(item)])));
    setFailedIds([]);
  }

  const applyVariants = (next: ProductVariant[]) => {
    setVariants(next);
    onVariantsChange(next);
  };

  const replaceVariant = (updated: ProductVariant) => {
    const next = variants.map((item) => (item.id === updated.id ? updated : item));
    applyVariants(next);
    setDrafts((current) => ({ ...current, [updated.id]: toDraft(updated) }));
  };

  const patchDraft = (id: string, patch: Partial<VariantDraft>) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  };

  const dirtyIds = useMemo(
    () =>
      variants
        .filter((variant) => {
          const draft = drafts[variant.id];
          return draft && isDirty(diffDraft(variant, draft));
        })
        .map((variant) => variant.id),
    [drafts, variants],
  );

  /** Lưu một dòng; trả về `true` khi thành công để "Lưu tất cả" đếm được */
  const saveVariant = async (variant: ProductVariant, silent = false) => {
    const draft = drafts[variant.id];
    if (!draft) return true;

    const payload = diffDraft(variant, draft);
    if (!isDirty(payload)) return true;

    setSavingIds((current) => [...current, variant.id]);
    try {
      const updated = await updateVariant(variant.id, payload);
      replaceVariant(updated);
      setFailedIds((current) => current.filter((id) => id !== variant.id));
      if (!silent) message.success(`Đã lưu ${updated.sku}`);
      return true;
    } catch (error) {
      setFailedIds((current) => (current.includes(variant.id) ? current : [...current, variant.id]));
      if (!silent) {
        message.error(error instanceof Error ? error.message : "Không lưu được biến thể");
      }
      return false;
    } finally {
      setSavingIds((current) => current.filter((id) => id !== variant.id));
    }
  };

  /**
   * Lưu tuần tự để lỗi của một dòng không kéo đổ cả bảng: dòng lỗi được giữ
   * nguyên giá trị người dùng vừa nhập và tô đỏ, các dòng còn lại vẫn lưu xong.
   */
  const saveAll = async () => {
    setSavingAll(true);
    let failed = 0;
    for (const id of dirtyIds) {
      const variant = variants.find((item) => item.id === id);
      if (!variant) continue;
      const ok = await saveVariant(variant, true);
      if (!ok) failed += 1;
    }
    setSavingAll(false);

    if (failed === 0) message.success(`Đã lưu ${dirtyIds.length} phiên bản`);
    else message.error(`${failed}/${dirtyIds.length} phiên bản chưa lưu được, xem các dòng tô đỏ`);
  };

  /** Bật/tắt và đặt mặc định lưu ngay — không có gì để "soạn dở" ở hai công tắc này */
  const toggleField = async (variant: ProductVariant, patch: VariantPayload) => {
    setSavingIds((current) => [...current, variant.id]);
    try {
      const updated = await updateVariant(variant.id, patch);
      // Đặt mặc định là thao tác độc quyền — dòng khác phải tự bỏ cờ
      const next = variants.map((item) =>
        item.id === updated.id
          ? updated
          : patch.isDefault
            ? { ...item, isDefault: false }
            : item,
      );
      applyVariants(next);
      setDrafts((current) => ({ ...current, [updated.id]: toDraft(updated) }));
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không cập nhật được biến thể");
    } finally {
      setSavingIds((current) => current.filter((id) => id !== variant.id));
    }
  };

  const handleDelete = async (variant: ProductVariant) => {
    try {
      await deleteVariant(variant.id);
      applyVariants(variants.filter((item) => item.id !== variant.id));
      message.success(`Đã xoá ${variant.sku}`);
    } catch (error) {
      // Backend từ chối khi đây là biến thể cuối, hoặc đang là thành phần của
      // một combo — thông báo của backend đã đủ rõ nên hiển thị nguyên văn.
      message.error(error instanceof Error ? error.message : "Không xoá được biến thể");
    }
  };

  const orphanCount = hasOptions
    ? variants.filter((variant) => variant.optionValues.length === 0).length
    : 0;

  return (
    <div className="space-y-4">
      {orphanCount > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`${orphanCount} phiên bản chưa gán cấu hình`}
          description="Phiên bản tạo trước khi khai trục biến thể vẫn bán được nhưng không nằm trong lưới chọn cấu hình ở trang sản phẩm. Nên xoá và tạo lại với đúng tổ hợp option."
        />
      )}

      <section className="bg-card border-line shadow-card space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-fg font-semibold">
              {isBundle ? "Giá combo" : product.hasVariants ? "Phiên bản" : "Giá & tồn kho"}
            </h3>
            <p className="text-muted text-sm">
              {isBundle
                ? "SKU và giá bán của combo. Thành phần khai ở tab bên cạnh."
                : "Mỗi phiên bản là một SKU bán được, có giá và tồn kho riêng."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {dirtyIds.length > 0 && (
              <>
                <Button
                  icon={<RotateCcw size={16} />}
                  disabled={savingAll}
                  onClick={() =>
                    setDrafts(Object.fromEntries(variants.map((item) => [item.id, toDraft(item)])))
                  }
                >
                  Huỷ thay đổi
                </Button>
                <Button type="primary" loading={savingAll} onClick={saveAll}>
                  Lưu {dirtyIds.length} thay đổi
                </Button>
              </>
            )}
            {!isBundle && (
              <PermissionGate permission="product.manage">
                <Button icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
                  Thêm phiên bản
                </Button>
              </PermissionGate>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-295 space-y-2">
            <div className={cn(ROW_GRID, "text-muted text-xs font-medium")}>
              <span />
              <span>Tên phiên bản</span>
              <span>Mã SKU</span>
              <span>Giá bán</span>
              <span>Giá so sánh</span>
              <span>Giá vốn</span>
              <span>Tồn kho</span>
              <span>Ngưỡng</span>
              <span className="text-center">Mặc định</span>
              <span className="text-center">Đang bán</span>
              <span />
            </div>

            {variants.map((variant) => {
              const draft = drafts[variant.id] ?? toDraft(variant);
              const saving = savingIds.includes(variant.id);
              const failed = failedIds.includes(variant.id);
              const rowDirty = isDirty(diffDraft(variant, draft));
              const derivedBundle = variant.bundleInventoryPolicy === "derived_from_components";
              const thumbnail = variant.thumbnail ?? product.thumbnail ?? product.images[0];
              const options = optionLabelOf(variant);

              return (
                <div
                  key={variant.id}
                  className={cn(
                    ROW_GRID,
                    "rounded-md px-1 py-1 transition",
                    rowDirty && "bg-brand/5",
                    failed && "bg-danger/8 ring-danger/40 ring-1",
                  )}
                >
                  <div className="bg-subtle border-line relative h-9 w-9 shrink-0 overflow-hidden rounded border">
                    {thumbnail ? (
                      <Image
                        src={thumbnail}
                        alt={variant.name}
                        fill
                        unoptimized
                        sizes="36px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-muted flex h-full items-center justify-center">
                        <ImageOff size={14} />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <Input
                      value={draft.name}
                      disabled={!canManage || saving}
                      onChange={(event) => patchDraft(variant.id, { name: event.target.value })}
                      aria-label={`Tên phiên bản ${variant.sku}`}
                    />
                    {options && (
                      <div className="text-muted mt-0.5 truncate text-xs">{options}</div>
                    )}
                    {hasOptions && !options && (
                      <Tag color="warning" className="mt-1">
                        Chưa gán cấu hình
                      </Tag>
                    )}
                  </div>

                  <Input
                    value={draft.sku}
                    disabled={!canManage || saving}
                    onChange={(event) => patchDraft(variant.id, { sku: event.target.value })}
                    aria-label={`SKU của ${variant.sku}`}
                  />

                  <InputNumber
                    value={draft.price}
                    disabled={!canManage || saving}
                    min={0}
                    step={1000}
                    className="w-full"
                    onChange={(price) => patchDraft(variant.id, { price: price ?? undefined })}
                    aria-label={`Giá bán của ${variant.sku}`}
                  />

                  <InputNumber
                    value={draft.compareAtPrice}
                    disabled={!canManage || saving}
                    min={0}
                    step={1000}
                    className="w-full"
                    onChange={(value) =>
                      patchDraft(variant.id, { compareAtPrice: value ?? undefined })
                    }
                    aria-label={`Giá so sánh của ${variant.sku}`}
                  />

                  <InputNumber
                    value={draft.costPrice}
                    disabled={!canManage || saving}
                    min={0}
                    step={1000}
                    className="w-full"
                    onChange={(value) => patchDraft(variant.id, { costPrice: value ?? undefined })}
                    aria-label={`Giá vốn của ${variant.sku}`}
                  />

                  {/* Tồn kho chỉ đổi qua modal điều chỉnh, không sửa thẳng */}
                  <div className="flex items-center gap-1">
                    {isService || !variant.trackInventory ? (
                      <Tooltip title="Không quản lý tồn kho">
                        <span className="text-muted text-sm">—</span>
                      </Tooltip>
                    ) : (
                      <>
                        <span
                          className={cn(
                            "text-sm tabular-nums",
                            variant.stock <= 0 && "text-danger font-semibold",
                            isLowStock(variant) && "text-warning font-medium",
                          )}
                        >
                          {formatNumber(variant.stock)}
                        </span>
                        <PermissionGate permission="inventory.manage">
                          <Tooltip
                            title={
                              derivedBundle
                                ? "Tồn kho combo suy ra từ thành phần"
                                : "Điều chỉnh tồn kho"
                            }
                          >
                            <Button
                              type="text"
                              size="small"
                              disabled={derivedBundle}
                              icon={<Warehouse size={14} />}
                              onClick={() => setAdjustingVariant(variant)}
                              aria-label={`Điều chỉnh tồn kho ${variant.sku}`}
                            />
                          </Tooltip>
                        </PermissionGate>
                      </>
                    )}
                  </div>

                  <InputNumber
                    value={draft.lowStockThreshold}
                    disabled={!canManage || saving || isService}
                    min={0}
                    className="w-full"
                    onChange={(value) =>
                      patchDraft(variant.id, { lowStockThreshold: value ?? undefined })
                    }
                    aria-label={`Ngưỡng cảnh báo của ${variant.sku}`}
                  />

                  <div className="flex justify-center">
                    <Radio
                      checked={variant.isDefault}
                      disabled={!canManage || saving || variant.isDefault}
                      onChange={() => toggleField(variant, { isDefault: true })}
                      aria-label={`Đặt ${variant.sku} làm mặc định`}
                    />
                  </div>

                  <div className="flex justify-center">
                    <Switch
                      size="small"
                      checked={variant.isActive}
                      disabled={!canManage || saving}
                      onChange={(isActive) => toggleField(variant, { isActive })}
                      aria-label={`Bật/tắt ${variant.sku}`}
                    />
                  </div>

                  <div className="flex justify-center">
                    {rowDirty ? (
                      <Tooltip title="Lưu dòng này">
                        <Button
                          type="primary"
                          size="small"
                          loading={saving}
                          onClick={() => saveVariant(variant)}
                        >
                          Lưu
                        </Button>
                      </Tooltip>
                    ) : (
                      <Popconfirm
                        title="Xoá phiên bản này?"
                        description="Không xoá được nếu đây là phiên bản cuối cùng hoặc đang là thành phần của combo."
                        okText="Xoá"
                        cancelText="Huỷ"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(variant)}
                      >
                        <Tooltip
                          title={
                            variants.length === 1 ? "Phải giữ ít nhất một phiên bản" : "Xoá"
                          }
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            disabled={!canManage || variants.length === 1}
                            icon={<Trash2 size={16} />}
                            aria-label={`Xoá ${variant.sku}`}
                          />
                        </Tooltip>
                      </Popconfirm>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {variants.length > 1 && (
          <div className="text-muted border-line flex flex-wrap gap-4 border-t pt-3 text-sm">
            <span>
              Khoảng giá{" "}
              <strong className="text-fg">
                {formatCurrency(Math.min(...variants.map((item) => item.price)))} –{" "}
                {formatCurrency(Math.max(...variants.map((item) => item.price)))}
              </strong>
            </span>
            {!isService && (
              <span>
                Tổng tồn{" "}
                <strong className="text-fg">
                  {formatNumber(variants.reduce((sum, item) => sum + item.stock, 0))}
                </strong>
              </span>
            )}
          </div>
        )}
      </section>

      <AdjustStockModal
        variant={adjustingVariant}
        onClose={() => setAdjustingVariant(undefined)}
        onAdjusted={replaceVariant}
      />

      <AddVariantModal
        open={addOpen}
        product={product}
        existingVariants={variants}
        onClose={() => setAddOpen(false)}
        onCreated={(variant) => {
          applyVariants([...variants, variant]);
          setDrafts((current) => ({ ...current, [variant.id]: toDraft(variant) }));
          void onReload();
        }}
      />
    </div>
  );
}

export default VariantsTab;
