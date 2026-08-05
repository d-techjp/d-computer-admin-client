"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { App, Alert, Button, InputNumber, Skeleton, Switch, Tooltip } from "antd";
import { GripVertical, ImageOff, Plus, RotateCcw, Trash2 } from "lucide-react";

import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  fetchBundleItems,
  fetchVariantAvailability,
  setBundleItems,
  type BundleItemInput,
} from "@/lib/api/variants";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { defaultVariantOf, type Product } from "@/types/product";
import {
  BUNDLE_INVENTORY_POLICY_HINT,
  BUNDLE_INVENTORY_POLICY_LABEL,
  type VariantAvailability,
} from "@/types/variant";

import { AvailabilityPanel } from "./AvailabilityPanel";
import { VariantPickerModal, type PickedVariant } from "./VariantPickerModal";

/** Dòng thành phần đang soạn — giữ đủ thông tin để render mà không phải fetch lại */
interface ItemDraft {
  componentVariantId: string;
  sku: string;
  variantName: string;
  productName: string;
  thumbnail?: string;
  price: number;
  stock: number;
  trackInventory: boolean;
  quantity: number;
  isOptional: boolean;
}

// Kéo | Ảnh | Tên | Tồn | Số lượng | Quà tặng | Xoá
const ROW_GRID =
  "grid grid-cols-[20px_40px_minmax(200px,1fr)_minmax(90px,0.6fr)_minmax(110px,0.7fr)_minmax(100px,0.6fr)_44px] items-center gap-2";

function sameDrafts(a: ItemDraft[], b: ItemDraft[]) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return (
      item.componentVariantId === other.componentVariantId &&
      item.quantity === other.quantity &&
      item.isOptional === other.isOptional
    );
  });
}

/**
 * Thành phần combo — `GET`/`PUT /variants/{id}/bundle-items`.
 *
 * Ba trong năm ràng buộc của backend được chặn ngay tại UI: combo chứa chính
 * nó và combo lồng combo (picker chỉ hiện hàng hoá thường, loại sẵn biến thể
 * combo), và mỗi thành phần chỉ một dòng (chọn trùng thì tăng `quantity`).
 */
export function BundleTab({ product }: { product: Product }) {
  const { message } = App.useApp();
  const bundleVariant = defaultVariantOf(product);

  const [items, setItems] = useState<ItemDraft[]>([]);
  const [saved, setSaved] = useState<ItemDraft[]>([]);
  // Không có biến thể combo thì chẳng có gì để tải — vào thẳng trạng thái lỗi
  const [loading, setLoading] = useState(!!bundleVariant);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [availability, setAvailability] = useState<VariantAvailability>();
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const isDerived = bundleVariant?.bundleInventoryPolicy === "derived_from_components";

  const loadAvailability = useCallback(
    async (variantId: string) => {
      setLoadingAvailability(true);
      try {
        setAvailability(await fetchVariantAvailability(variantId));
      } catch {
        setAvailability(undefined);
      } finally {
        setLoadingAvailability(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!bundleVariant) return;

    let cancelled = false;
    fetchBundleItems(bundleVariant.id)
      .then((result) => {
        if (cancelled) return;
        const drafts: ItemDraft[] = result.map((item) => ({
          componentVariantId: item.componentVariantId,
          sku: item.componentVariant?.sku ?? "",
          variantName: item.componentVariant?.name ?? "",
          productName: item.componentVariant?.product?.name ?? "",
          thumbnail:
            item.componentVariant?.thumbnail ?? item.componentVariant?.product?.thumbnail,
          price: item.componentVariant?.price ?? 0,
          stock: item.componentVariant?.stock ?? 0,
          trackInventory: item.componentVariant?.trackInventory ?? true,
          quantity: item.quantity,
          isOptional: item.isOptional,
        }));
        setItems(drafts);
        setSaved(drafts);
      })
      .catch((error) => {
        if (!cancelled) {
          message.error(
            error instanceof Error ? error.message : "Không tải được thành phần combo",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    queueMicrotask(() => void loadAvailability(bundleVariant.id));

    return () => {
      cancelled = true;
    };
  }, [bundleVariant, loadAvailability, message]);

  const dirty = useMemo(() => !sameDrafts(items, saved), [items, saved]);

  const excludeVariantIds = useMemo(
    () => [
      // Combo không thể chứa chính nó
      ...product.variants.map((variant) => variant.id),
      ...items.map((item) => item.componentVariantId),
    ],
    [items, product.variants],
  );

  const onPick = ({ variant, productName, thumbnail }: PickedVariant) => {
    setItems((current) => {
      // Một thành phần chỉ được khai một dòng — chọn trùng thì tăng số lượng
      const existing = current.findIndex(
        (item) => item.componentVariantId === variant.id,
      );
      if (existing >= 0) {
        message.info("Thành phần đã có trong combo, đã tăng số lượng thêm 1");
        return current.map((item, index) =>
          index === existing ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [
        ...current,
        {
          componentVariantId: variant.id,
          sku: variant.sku,
          variantName: variant.name,
          productName,
          thumbnail,
          price: variant.price,
          stock: variant.stock,
          trackInventory: variant.trackInventory,
          quantity: 1,
          isOptional: false,
        },
      ];
    });
  };

  const patchItem = (index: number, patch: Partial<ItemDraft>) => {
    setItems((current) =>
      current.map((item, position) => (position === index ? { ...item, ...patch } : item)),
    );
  };

  const onSave = async () => {
    if (!bundleVariant) return;

    const payload: BundleItemInput[] = items.map((item, index) => ({
      componentVariantId: item.componentVariantId,
      quantity: item.quantity,
      position: index,
      isOptional: item.isOptional,
    }));

    setSaving(true);
    try {
      await setBundleItems(bundleVariant.id, payload);
      setSaved(items);
      message.success("Đã lưu thành phần combo");
      await loadAvailability(bundleVariant.id);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không lưu được thành phần combo");
    } finally {
      setSaving(false);
    }
  };

  if (!bundleVariant) {
    return (
      <Alert
        type="error"
        showIcon
        message="Combo chưa có biến thể"
        description="Combo phải có đúng một biến thể mang SKU và giá bán. Kiểm tra lại ở tab Giá & kho."
      />
    );
  }

  if (loading) {
    return (
      <div className="bg-card border-line shadow-card rounded-lg border p-4">
        <Skeleton active paragraph={{ rows: 5 }} />
      </div>
    );
  }

  /** Tổng giá lẻ của các thành phần bắt buộc — so với giá combo để thấy mức giảm */
  const componentsTotal = items
    .filter((item) => !item.isOptional)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
  const customerSaving = componentsTotal - bundleVariant.price;

  return (
    <div className="space-y-4">
      {items.length === 0 && (
        <Alert
          type="warning"
          showIcon
          message="Combo chưa có thành phần"
          description="Combo không có thành phần thì không tính được tồn kho và không bán được. Thêm ít nhất một thành phần."
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="bg-card border-line shadow-card space-y-3 rounded-lg border p-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-fg font-semibold">Thành phần combo</h3>
              <p className="text-muted text-sm">
                {BUNDLE_INVENTORY_POLICY_LABEL[
                  bundleVariant.bundleInventoryPolicy ?? "derived_from_components"
                ]}{" "}
                ·{" "}
                {
                  BUNDLE_INVENTORY_POLICY_HINT[
                    bundleVariant.bundleInventoryPolicy ?? "derived_from_components"
                  ]
                }
              </p>
            </div>

            <div className="flex items-center gap-2">
              {dirty && (
                <Button
                  icon={<RotateCcw size={16} />}
                  disabled={saving}
                  onClick={() => setItems(saved)}
                >
                  Huỷ thay đổi
                </Button>
              )}
              <PermissionGate permission="product.manage">
                <>
                  <Button icon={<Plus size={16} />} onClick={() => setPickerOpen(true)}>
                    Thêm thành phần
                  </Button>
                  <Button type="primary" loading={saving} disabled={!dirty} onClick={onSave}>
                    Lưu thành phần
                  </Button>
                </>
              </PermissionGate>
            </div>
          </div>

          {items.length > 0 && (
            <div className="overflow-x-auto">
              <div className="min-w-180 space-y-2">
                <div className={cn(ROW_GRID, "text-muted text-xs font-medium")}>
                  <span />
                  <span />
                  <span>Thành phần</span>
                  <span className="text-right">Tồn kho</span>
                  <span>Số lượng</span>
                  <span className="text-center">Quà tặng</span>
                  <span />
                </div>

                {items.map((item, index) => (
                  <div
                    key={item.componentVariantId}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (dragIndex === null || dragIndex === index) return;
                      setItems((current) => {
                        const next = [...current];
                        const [moved] = next.splice(dragIndex, 1);
                        next.splice(index, 0, moved);
                        return next;
                      });
                      setDragIndex(null);
                    }}
                    className={cn(ROW_GRID, dragIndex === index && "opacity-40")}
                  >
                    <span
                      draggable
                      onDragStart={() => setDragIndex(index)}
                      onDragEnd={() => setDragIndex(null)}
                      role="button"
                      tabIndex={-1}
                      aria-label={`Kéo để đổi vị trí ${item.sku}`}
                      className="text-muted hover:text-fg flex cursor-grab justify-center active:cursor-grabbing"
                    >
                      <GripVertical size={16} />
                    </span>

                    <div className="bg-subtle border-line relative h-9 w-9 overflow-hidden rounded border">
                      {item.thumbnail ? (
                        <Image
                          src={item.thumbnail}
                          alt={item.sku}
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
                      <div className="truncate text-sm font-medium">
                        {item.productName || item.variantName}
                      </div>
                      <div className="text-muted truncate text-xs">
                        {item.sku}
                        {item.variantName && item.productName ? ` · ${item.variantName}` : ""} ·{" "}
                        {formatCurrency(item.price)}
                      </div>
                    </div>

                    <div className="text-right text-sm">
                      {item.trackInventory ? (
                        <span className={cn(item.stock <= 0 && "text-danger font-semibold")}>
                          {formatNumber(item.stock)}
                        </span>
                      ) : (
                        <Tooltip title="Không quản lý tồn kho">
                          <span className="text-muted">—</span>
                        </Tooltip>
                      )}
                    </div>

                    <InputNumber
                      value={item.quantity}
                      min={1}
                      className="w-full"
                      onChange={(quantity) => patchItem(index, { quantity: quantity ?? 1 })}
                      aria-label={`Số lượng ${item.sku}`}
                    />

                    <div className="flex justify-center">
                      <Tooltip title="Quà tặng kèm không tính vào tồn kho combo">
                        <Switch
                          size="small"
                          checked={item.isOptional}
                          onChange={(isOptional) => patchItem(index, { isOptional })}
                          aria-label={`Đánh dấu ${item.sku} là quà tặng`}
                        />
                      </Tooltip>
                    </div>

                    <div className="flex justify-center">
                      <Tooltip title="Gỡ khỏi combo">
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<Trash2 size={16} />}
                          onClick={() =>
                            setItems((current) => current.filter((_, i) => i !== index))
                          }
                          aria-label={`Gỡ ${item.sku}`}
                        />
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div className="border-line text-muted flex flex-wrap gap-4 border-t pt-3 text-sm">
              <span>
                Giá combo <strong className="text-fg">{formatCurrency(bundleVariant.price)}</strong>
              </span>
              <span>
                Tổng giá lẻ thành phần{" "}
                <strong className="text-fg">{formatCurrency(componentsTotal)}</strong>
              </span>
              {customerSaving > 0 && (
                <span className="text-success">
                  Khách tiết kiệm <strong>{formatCurrency(customerSaving)}</strong>
                </span>
              )}
              {customerSaving < 0 && (
                <span className="text-danger">
                  Giá combo đang cao hơn mua lẻ {formatCurrency(-customerSaving)}
                </span>
              )}
            </div>
          )}

          {dirty && (
            <p className="text-warning text-xs">
              Thay đổi chưa được lưu — số combo bán được bên phải vẫn tính theo danh sách cũ.
            </p>
          )}
        </section>

        {isDerived ? (
          <AvailabilityPanel
            availability={availability}
            loading={loadingAvailability}
            hasItems={items.length > 0}
          />
        ) : (
          // Kit đóng sẵn có kho riêng: bán combo trừ kho combo, không đụng tới
          // thành phần — nên số bán được là tồn kho của chính nó.
          <section className="bg-card border-line shadow-card h-fit space-y-2 rounded-lg border p-4">
            <h3 className="text-fg font-semibold">Khả năng bán</h3>
            <div
              className={cn(
                "text-2xl font-bold",
                bundleVariant.stock > 0 ? "text-fg" : "text-danger",
              )}
            >
              {formatNumber(bundleVariant.stock)}
            </div>
            <p className="text-muted text-sm">
              combo trong kho riêng. Bán combo chỉ trừ kho combo, không trừ kho thành phần —
              điều chỉnh số này ở tab &ldquo;Giá &amp; kho&rdquo;.
            </p>
          </section>
        )}
      </div>

      <VariantPickerModal
        open={pickerOpen}
        excludeVariantIds={excludeVariantIds}
        onClose={() => setPickerOpen(false)}
        onPick={onPick}
      />
    </div>
  );
}

export default BundleTab;
