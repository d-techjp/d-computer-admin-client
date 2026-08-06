"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { App, Alert, Button, Input, InputNumber, Popconfirm, Radio, Switch, Tag, Tooltip } from "antd";
import { Camera, GripVertical, ImageOff, Plus, RotateCcw, Trash2, Warehouse } from "lucide-react";

import { PermissionGate } from "@/components/auth/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import { deleteVariant, updateVariant, type VariantPayload } from "@/lib/api/variants";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import type { Product } from "@/types/product";
import { isLowStock, optionLabelOf, type ProductVariant } from "@/types/variant";

import { AddVariantModal } from "./AddVariantModal";
import { AdjustStockModal } from "./AdjustStockModal";
import { VariantImagesModal } from "./VariantImagesModal";

/** Các trường sửa được ngay trên bảng */
interface VariantDraft {
  name: string;
  sku: string;
  price?: number;
  compareAtPrice?: number;
  costPrice?: number;
  lowStockThreshold?: number;
}

// Kéo | Ảnh | Tên | SKU | Giá | So sánh | Vốn | Tồn | Ngưỡng | Mặc định | Bật | Xoá
//
// `items-start` (không phải center): cột "Tên phiên bản" cao hơn các cột khác
// vì có thêm dòng ghi chú cấu hình bên dưới ô nhập — nếu căn giữa theo chiều
// dọc, input của các cột còn lại bị đẩy xuống thấp hơn input tên, nhìn lệch
// hàng. Căn theo đỉnh thì mọi ô nhập luôn ngang hàng nhau.
const ROW_GRID =
  "grid grid-cols-[20px_44px_minmax(160px,1.4fr)_minmax(140px,1.2fr)_repeat(3,minmax(110px,1fr))_minmax(120px,1fr)_minmax(90px,0.7fr)_72px_64px_44px] items-start gap-2";

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
  const [imagesVariant, setImagesVariant] = useState<ProductVariant>();
  const [addOpen, setAddOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

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
      await updateVariant(variant.id, payload);
      // Không dùng response PATCH để ghi đè cả dòng: OpenAPI không khai
      // response schema cho endpoint này, và trên thực tế `costPrice` không
      // bao giờ xuất hiện trong bất kỳ response nào của backend (đã kiểm tra
      // trực tiếp) — tin response có thể vô tình xoá trắng những trường không
      // liên quan tới lần lưu này. `payload` là đúng những gì vừa gửi và đã
      // được backend chấp nhận (không lỗi), nên merge thẳng lên variant hiện
      // có là đủ và an toàn hơn nhiều.
      replaceVariant({ ...variant, ...payload });
      setFailedIds((current) => current.filter((id) => id !== variant.id));
      if (!silent) message.success(`Đã lưu ${draft.sku}`);
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
      await updateVariant(variant.id, patch);
      // Merge trực tiếp thay vì tin response PATCH — cùng lý do như saveVariant.
      const merged = { ...variant, ...patch };
      // Đặt mặc định là thao tác độc quyền — dòng khác phải tự bỏ cờ
      const next = variants.map((item) =>
        item.id === merged.id
          ? merged
          : patch.isDefault
            ? { ...item, isDefault: false }
            : item,
      );
      applyVariants(next);
      setDrafts((current) => ({ ...current, [merged.id]: toDraft(merged) }));
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không cập nhật được biến thể");
    } finally {
      setSavingIds((current) => current.filter((id) => id !== variant.id));
    }
  };

  /**
   * Kéo-thả đổi thứ tự hiển thị — lưu ngay qua `position` của
   * `PATCH /variants/{id}`, không có gì để "soạn dở" giống hai công tắc
   * isDefault/isActive ở trên.
   *
   * Chỉ những dòng thật sự đổi vị trí (so với `position` đang lưu) mới bị gọi
   * API — kéo một dòng chỉ 1 bậc thường chỉ động tới 2 dòng, không phải toàn
   * bộ danh sách.
   */
  const reorderVariant = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const reordered = [...variants];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    // Đổi thứ tự hiển thị ngay, không đợi lưu xong mới thấy — lưu chạy nền phía sau
    applyVariants(reordered);

    const changes = reordered
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => item.position !== index);
    if (changes.length === 0) return;

    setSavingIds((current) => [...current, ...changes.map(({ item }) => item.id)]);
    const results = await Promise.allSettled(
      changes.map(({ item, index }) => updateVariant(item.id, { position: index })),
    );
    const failed = changes
      .filter((_, index) => results[index].status === "rejected")
      .map(({ item }) => item.id);

    // Cập nhật lại `position` cục bộ cho dòng lưu thành công để lần kéo sau
    // tính đúng baseline; dòng lỗi giữ nguyên position cũ, cần kéo lại.
    applyVariants(
      reordered.map((item, index) => {
        const changed = changes.some((change) => change.item.id === item.id);
        return changed && !failed.includes(item.id) ? { ...item, position: index } : item;
      }),
    );
    setSavingIds((current) =>
      current.filter((id) => !changes.some((change) => change.item.id === id)),
    );

    if (failed.length > 0) {
      setFailedIds((current) => [...new Set([...current, ...failed])]);
      message.error(`${failed.length} phiên bản chưa lưu được vị trí mới, thử kéo lại`);
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
          description="Phiên bản tạo trước khi khai biến thể vẫn bán được nhưng không nằm trong lưới chọn cấu hình ở trang sản phẩm. Nên xoá và tạo lại với đúng tổ hợp option."
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

            {variants.map((variant, index) => {
              const draft = drafts[variant.id] ?? toDraft(variant);
              const saving = savingIds.includes(variant.id);
              const failed = failedIds.includes(variant.id);
              const rowDirty = isDirty(diffDraft(variant, draft));
              const derivedBundle = variant.bundleInventoryPolicy === "derived_from_components";
              const thumbnail = variant.thumbnail ?? product.thumbnail ?? product.images[0];
              const options = optionLabelOf(variant);
              const canReorder = canManage && variants.length > 1;

              return (
                <div
                  key={variant.id}
                  onDragOver={(event) => {
                    if (dragIndex === null) return;
                    event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragIndex !== null && dragIndex !== index) {
                      void reorderVariant(dragIndex, index);
                    }
                    setDragIndex(null);
                  }}
                  className={cn(
                    ROW_GRID,
                    "rounded-md px-1 py-1 transition",
                    rowDirty && "bg-brand/5",
                    failed && "bg-danger/8 ring-danger/40 ring-1",
                    dragIndex === index && "opacity-40",
                  )}
                >
                  <span
                    draggable={canReorder}
                    onDragStart={() => setDragIndex(index)}
                    onDragEnd={() => setDragIndex(null)}
                    role="button"
                    tabIndex={-1}
                    aria-label={`Kéo để đổi vị trí ${variant.sku}`}
                    className={cn(
                      "flex items-center justify-center pt-1.5",
                      canReorder
                        ? "text-muted hover:text-fg cursor-grab active:cursor-grabbing"
                        : "text-line cursor-not-allowed",
                    )}
                  >
                    <GripVertical size={16} />
                  </span>

                  <Tooltip title={canManage ? "Ảnh riêng cho phiên bản này" : undefined}>
                    <button
                      type="button"
                      disabled={!canManage}
                      onClick={() => setImagesVariant(variant)}
                      aria-label={`Ảnh riêng của ${variant.sku}`}
                      className={cn(
                        "group bg-subtle border-line relative h-9 w-9 shrink-0 overflow-hidden rounded border",
                        canManage && "cursor-pointer",
                      )}
                    >
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

                      {canManage && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-transparent transition group-hover:bg-black/40 group-hover:text-white">
                          <Camera size={13} />
                        </span>
                      )}
                    </button>
                  </Tooltip>

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

                  {/* pt-1: Radio/Switch/nút thấp hơn ô input (32px) — nhích xuống
                      một chút cho gần tâm input thay vì dính sát mép trên */}
                  <div className="flex justify-center pt-1">
                    <Radio
                      checked={variant.isDefault}
                      disabled={!canManage || saving || variant.isDefault}
                      onChange={() => toggleField(variant, { isDefault: true })}
                      aria-label={`Đặt ${variant.sku} làm mặc định`}
                    />
                  </div>

                  <div className="flex justify-center pt-1">
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
        // Chỉ tin `stock` từ response của endpoint này (giá trị server tính,
        // FE không biết trước) — các trường khác giữ nguyên từ variant hiện
        // có, cùng lý do như saveVariant/toggleField ở trên.
        onAdjusted={(updated) => {
          const current = variants.find((item) => item.id === updated.id);
          replaceVariant(current ? { ...current, stock: updated.stock } : updated);
        }}
      />

      <VariantImagesModal
        variant={imagesVariant}
        fallbackThumbnail={product.thumbnail ?? product.images[0]}
        onClose={() => setImagesVariant(undefined)}
        // Chỉ tin thumbnail/images từ response — đây là URL R2 do server sinh
        // ra, FE không biết trước.
        onSaved={(updated) => {
          const current = variants.find((item) => item.id === updated.id);
          replaceVariant(
            current
              ? { ...current, thumbnail: updated.thumbnail, images: updated.images }
              : updated,
          );
        }}
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
