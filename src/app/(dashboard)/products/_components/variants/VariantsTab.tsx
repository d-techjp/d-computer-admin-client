"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  App,
  Alert,
  Button,
  Input,
  InputNumber,
  Popconfirm,
  Radio,
  Skeleton,
  Switch,
  Tag,
  Tooltip,
} from "antd";
import { Camera, GripVertical, ImageOff, Plus, RotateCcw, Trash2, Warehouse } from "lucide-react";

import { PermissionGate } from "@/components/auth/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import {
  bulkUpdateVariants,
  deleteVariant,
  type BulkVariantUpdateItem,
  type VariantPayload,
} from "@/lib/api/variants";
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
  isDefault: boolean;
  isActive: boolean;
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
    isDefault: variant.isDefault,
    isActive: variant.isActive,
  };
}

function toDraftMap(variants: ProductVariant[]) {
  return Object.fromEntries(variants.map((item) => [item.id, toDraft(item)]));
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
  if (draft.isActive !== variant.isActive) payload.isActive = draft.isActive;
  // Cờ mặc định chỉ gửi khi dòng này *trở thành* mặc định: backend tự gỡ cờ ở
  // mọi dòng còn lại (`clearDefaultFlag`) khi thấy `isDefault: true`. Gửi kèm
  // `isDefault: false` cho dòng cũ là tự bắn vào chân — request chỉ chứa mỗi
  // dòng đó sẽ để sản phẩm không còn phiên bản mặc định nào.
  if (draft.isDefault && !variant.isDefault) payload.isDefault = true;
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
 * Bảng biến thể — sửa hàng loạt qua `PATCH /products/{id}/variants` (mục 4.2
 * của product-creation-flows-3.md), một request/transaction. Ảnh riêng của
 * biến thể vẫn đi qua `PATCH /variants/{id}` (multipart) — bulk không nhận file.
 *
 * Kéo-thả đổi vị trí, cờ mặc định và công tắc đang bán **không** gọi API ngay —
 * tất cả chỉ là thay đổi cục bộ như mọi ô nhập khác trên bảng, tích luỹ tới khi
 * người dùng bấm "Lưu N thay đổi" mới gộp chung 1 request bulk (xem
 * `reorderVariant`/`setDefault`/`toggleActive`/`dirtyIds`).
 *
 * Tồn kho cố tình **không sửa trực tiếp** ở đây: nó đi qua modal điều chỉnh
 * (`PATCH /variants/{id}/stock`) để có `delta` + lý do vào nhật ký, và vì thao
 * tác đó thuộc quyền `inventory.manage` chứ không phải `product.manage`.
 */
export function VariantsTab({ product, onVariantsChange, onReload }: VariantsTabProps) {
  const { message } = App.useApp();
  const { has } = usePermissions();
  const [variants, setVariants] = useState<ProductVariant[]>(product.variants);
  const [drafts, setDrafts] = useState<Record<string, VariantDraft>>(() =>
    toDraftMap(product.variants),
  );
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [savingAll, setSavingAll] = useState(false);
  const [adjustingVariant, setAdjustingVariant] = useState<ProductVariant>();
  const [imagesVariant, setImagesVariant] = useState<ProductVariant>();
  const [addOpen, setAddOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const canManage = has("product.manage");
  const isService = product.productType === "service";
  const isBundle = product.productType === "bundle";
  const hasOptions = product.options.length > 0;

  // Đồng bộ lại khi tab cha nạp lại sản phẩm (sinh biến thể, đổi option...).
  // Chỉnh state ngay trong lúc render theo guard tham chiếu để tránh effect
  // cascade, đồng thời drafts đã được khởi tạo đầy đủ ngay từ render đầu tiên.
  const [syncedVariants, setSyncedVariants] = useState(product.variants);
  if (syncedVariants !== product.variants) {
    setSyncedVariants(product.variants);
    setVariants(product.variants);
    setDrafts(toDraftMap(product.variants));
    setFailedIds([]);
  }

  const applyVariants = (next: ProductVariant[]) => {
    setVariants(next);
    // `onVariantsChange` khiến tab cha bọc `next` vào một `product` mới rồi
    // trả ngược xuống qua prop — cùng tham chiếu mảng, không phải reload
    // thật. Đánh dấu luôn `syncedVariants` ở đây để nhánh resync phía trên
    // không hiểu nhầm là cha vừa nạp lại sản phẩm rồi xoá mất `drafts` đang
    // sửa dở của các dòng khác (bug: gõ giá xong kéo-thả là mất giá vừa gõ).
    setSyncedVariants(next);
    onVariantsChange(next);
  };

  const replaceVariant = (updated: ProductVariant) => {
    const next = variants.map((item) => (item.id === updated.id ? updated : item));
    applyVariants(next);
    setDrafts((current) => ({ ...current, [updated.id]: toDraft(updated) }));
  };

  /**
   * Đồng bộ `drafts` theo response cho **đúng những dòng vừa gửi**, để không
   * đè mất nội dung đang gõ dở ở các dòng khác chưa lưu.
   */
  const syncDrafts = (updated: ProductVariant[], ids: string[]) => {
    if (ids.length === 0) return;
    const byId = new Map(updated.map((item) => [item.id, item]));
    setDrafts((current) => {
      const next = { ...current };
      for (const id of ids) {
        const item = byId.get(id);
        if (item) next[id] = toDraft(item);
      }
      return next;
    });
  };

  /**
   * Áp kết quả `bulkUpdateVariants` — response là TOÀN BỘ biến thể của sản
   * phẩm (mục 4.2) nên thay thẳng `variants`, không cần merge tay như trước.
   * `drafts` chỉ đồng bộ cho những dòng vừa gửi trong request, để không đè
   * mất nội dung đang gõ dở ở các dòng khác chưa lưu.
   */
  const applyBulkVariants = (updated: ProductVariant[], syncDraftIds: string[] = []) => {
    applyVariants(updated);
    syncDrafts(updated, syncDraftIds);
  };

  const patchDraft = (id: string, patch: Partial<VariantDraft>) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  };

  /**
   * "Dơ" gồm cả field sửa tay (`drafts`) lẫn vị trí đổi do kéo-thả — kéo-thả
   * không gọi API ngay (xem `reorderVariant`), chỉ so `index` hiện tại với
   * `variant.position` đã lưu để biết dòng nào đang có thứ tự chưa lưu.
   */
  const dirtyIds = useMemo(() => {
    const ids: string[] = [];
    variants.forEach((variant, index) => {
      const draft = drafts[variant.id];
      const fieldsDirty = Boolean(draft && isDirty(diffDraft(variant, draft)));
      const positionDirty = variant.position !== index;
      if (fieldsDirty || positionDirty) ids.push(variant.id);
    });
    return ids;
  }, [drafts, variants]);

  /**
   * Lưu một dòng (nút "Lưu" trên hàng); trả về `true` khi thành công. Chỉ
   * gửi field sửa tay — **không** kèm `position`: kéo-thả thường dịch chuyển
   * nhiều dòng cùng lúc, lưu lẻ một dòng sẽ làm lệch vị trí các dòng còn lại,
   * nên đổi vị trí luôn phải đi qua "Lưu N thay đổi" (`saveAll`).
   */
  const saveVariant = async (variant: ProductVariant, silent = false) => {
    const draft = drafts[variant.id];
    if (!draft) return true;

    const payload = diffDraft(variant, draft);
    if (!isDirty(payload)) return true;

    // Chuyển mặc định là thao tác đôi: dòng này nhả cờ, dòng kia nhận. Gửi lẻ
    // vế nhả thì request không có `isDefault: true` nào để backend gỡ cờ cũ —
    // cờ sẽ nằm lại ở phiên bản vừa ngừng bán. Kèm luôn vế nhận vào cùng
    // request để hai vế không bao giờ rời nhau.
    const receiver =
      variant.isDefault && !draft.isDefault
        ? variants.find((item) => !item.isDefault && drafts[item.id]?.isDefault)
        : undefined;

    const items: BulkVariantUpdateItem[] = [{ id: variant.id, ...payload }];
    if (receiver) items.push({ id: receiver.id, isDefault: true });
    const itemIds = items.map((item) => item.id);

    setSavingIds((current) => [...current, ...itemIds]);
    try {
      const updated = await bulkUpdateVariants(product.id, items);
      const byId = new Map(updated.map((item) => [item.id, item]));
      const becameDefault = items.some((item) => item.isDefault === true);
      // Giữ nguyên thứ tự mảng hiện tại (có thể đang có kéo-thả chưa lưu ở
      // dòng khác) — chỉ thay dữ liệu của những dòng vừa gửi. Các dòng còn lại
      // chỉ đồng bộ cờ mặc định mà backend vừa gỡ.
      const next = variants.map((item) => {
        if (itemIds.includes(item.id)) return byId.get(item.id) ?? { ...item, ...payload };
        return becameDefault && item.isDefault ? { ...item, isDefault: false } : item;
      });
      applyVariants(next);
      syncDrafts(updated, itemIds);
      setFailedIds((current) => current.filter((id) => !itemIds.includes(id)));
      if (!silent) message.success(`Đã lưu ${draft.sku}`);
      return true;
    } catch (error) {
      setFailedIds((current) => [...new Set([...current, ...itemIds])]);
      if (!silent) {
        message.error(error instanceof Error ? error.message : "Không lưu được biến thể");
      }
      return false;
    } finally {
      setSavingIds((current) => current.filter((id) => !itemIds.includes(id)));
    }
  };

  /**
   * Lưu mọi thay đổi đang chờ trong **một** request (mục 4.2): field sửa tay
   * lẫn `position` do kéo-thả — kéo-thả tự nó không gọi API, chỉ tích luỹ
   * thành "dơ" tới khi bấm nút này. 1 transaction: thành hoặc bại cả loạt.
   */
  const saveAll = async () => {
    const items: BulkVariantUpdateItem[] = [];
    variants.forEach((variant, index) => {
      const draft = drafts[variant.id];
      const payload: VariantPayload = draft ? diffDraft(variant, draft) : {};
      if (variant.position !== index) payload.position = index;
      if (isDirty(payload)) items.push({ id: variant.id, ...payload });
    });
    if (items.length === 0) return;

    const itemIds = items.map((item) => item.id);
    setSavingAll(true);
    setSavingIds((current) => [...current, ...itemIds]);
    try {
      const updated = await bulkUpdateVariants(product.id, items);
      // Toàn bộ "dơ" (field + vị trí) được gửi trong 1 request nên response
      // giờ chính là trạng thái đã cam kết — thay thẳng cả mảng an toàn.
      applyBulkVariants(updated, itemIds);
      setFailedIds((current) => current.filter((id) => !itemIds.includes(id)));
      message.success(`Đã lưu ${items.length} phiên bản`);
    } catch (error) {
      setFailedIds((current) => [...new Set([...current, ...itemIds])]);
      message.error(error instanceof Error ? error.message : "Không lưu được các thay đổi, thử lại");
    } finally {
      setSavingAll(false);
      setSavingIds((current) => current.filter((id) => !itemIds.includes(id)));
    }
  };

  /**
   * Đặt mặc định — cục bộ, chờ "Lưu". Độc quyền nên gỡ cờ ở mọi dòng khác ngay
   * trong draft, đúng thứ backend sẽ làm khi nhận `isDefault: true`.
   */
  const setDefault = (variant: ProductVariant) => {
    setDrafts((current) =>
      Object.fromEntries(
        Object.entries(current).map(([id, draft]) => [
          id,
          draft.isDefault === (id === variant.id)
            ? draft
            : { ...draft, isDefault: id === variant.id },
        ]),
      ),
    );
  };

  /**
   * Bất biến: cờ mặc định phải nằm ở một phiên bản **đang bán** — mặc định trỏ
   * vào phiên bản đã ngừng bán thì trang sản phẩm không có gì để chọn sẵn.
   *
   * Ngoại lệ duy nhất: không còn phiên bản nào đang bán. Lúc đó cờ ở lại đúng
   * chỗ cũ — "ngừng bán toàn bộ phiên bản" là thao tác hợp lệ, kể cả khi cái
   * bị tắt sau cùng chính là phiên bản mặc định.
   */
  const withDefaultOnSellable = (map: Record<string, VariantDraft>) => {
    const current = variants.find((item) => map[item.id]?.isDefault);
    if (current && map[current.id]?.isActive) return { drafts: map, movedTo: undefined };

    const target = variants.find((item) => map[item.id]?.isActive);
    if (!target || target.id === current?.id) return { drafts: map, movedTo: undefined };

    return {
      drafts: Object.fromEntries(
        Object.entries(map).map(([id, draft]) => [
          id,
          draft.isDefault === (id === target.id) ? draft : { ...draft, isDefault: id === target.id },
        ]),
      ),
      movedTo: target,
    };
  };

  /** Bật/tắt bán — cục bộ, chờ "Lưu"; cờ mặc định tự đi theo bất biến ở trên. */
  const toggleActive = (variant: ProductVariant, isActive: boolean) => {
    const patched = { ...drafts, [variant.id]: { ...drafts[variant.id], isActive } };
    const next = withDefaultOnSellable(patched);

    setDrafts(next.drafts);
    // Báo cho biết cờ mặc định vừa tự nhảy — thay đổi này cũng nằm trong "Lưu
    // N thay đổi" chứ không tự gửi đi đâu cả.
    if (next.movedTo) message.info(`Đã chuyển mặc định sang ${next.drafts[next.movedTo.id].sku}`);
  };

  /**
   * Kéo-thả chỉ đổi thứ tự **cục bộ** — không gọi API. Giống mọi field sửa
   * tay khác trên bảng: tích luỹ thành "dơ" (xem `dirtyIds`) tới khi bấm
   * "Lưu N thay đổi" (`saveAll`) mới thật sự gửi lên backend, gộp chung 1
   * request bulk với mọi thay đổi khác đang có.
   */
  const reorderVariant = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const reordered = [...variants];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    applyVariants(reordered);
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
                  onClick={() => {
                    setDrafts(toDraftMap(variants));
                    // Huỷ luôn kéo-thả chưa lưu — trả mảng về đúng thứ tự đã
                    // cam kết (`position` hiện có, chưa bị đổi vì chưa lưu).
                    applyVariants([...variants].sort((a, b) => a.position - b.position));
                    setFailedIds([]);
                  }}
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
              const positionDirty = variant.position !== index;
              const derivedBundle = variant.bundleInventoryPolicy === "derived_from_components";
              const thumbnail = variant.thumbnail ?? product.thumbnail ?? product.images[0];
              const options = optionLabelOf(variant);
              const canReorder = canManage && variants.length > 1;
              const isDragging = dragIndex === index;
              const isDropTarget =
                dragIndex !== null && dragIndex !== index && dragOverIndex === index;

              return (
                <div
                  key={variant.id}
                  onDragOver={(event) => {
                    if (dragIndex === null) return;
                    event.preventDefault();
                    if (dragOverIndex !== index) setDragOverIndex(index);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragIndex !== null && dragIndex !== index) {
                      reorderVariant(dragIndex, index);
                    }
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={cn(
                    ROW_GRID,
                    "relative rounded-md px-1 py-1 transition",
                    (rowDirty || positionDirty) && "bg-brand/5",
                    failed && "bg-danger/8 ring-danger/40 ring-1",
                    isDropTarget && "ring-brand ring-2 ring-inset",
                  )}
                >
                  {/* Ô đang kéo: phủ skeleton lên trên thay vì làm mờ nội dung —
                      không đổi cây DOM bên dưới để tay cầm không bị unmount
                      giữa chừng (mất tay cầm là mất luôn thao tác kéo dở). */}
                  {isDragging && (
                    <div
                      className="bg-card/85 pointer-events-none absolute inset-0 z-10 flex items-center rounded-md px-2"
                      aria-hidden
                    >
                      <Skeleton
                        active
                        title={false}
                        paragraph={{ rows: 1, width: "100%" }}
                        className="w-full [&_.ant-skeleton-paragraph]:m-0"
                      />
                    </div>
                  )}

                  <span
                    draggable={canReorder}
                    onDragStart={() => setDragIndex(index)}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setDragOverIndex(null);
                    }}
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
                    <Tooltip
                      title={
                        draft.isActive
                          ? undefined
                          : "Phiên bản đang ngừng bán thì không đặt làm mặc định được"
                      }
                    >
                      {/* span để tooltip vẫn hiện khi radio bị disable */}
                      <span className="inline-flex">
                        <Radio
                          checked={draft.isDefault}
                          disabled={!canManage || saving || draft.isDefault || !draft.isActive}
                          onChange={() => setDefault(variant)}
                          aria-label={`Đặt ${variant.sku} làm mặc định`}
                        />
                      </span>
                    </Tooltip>
                  </div>

                  <div className="flex justify-center pt-1">
                    <Switch
                      size="small"
                      checked={draft.isActive}
                      disabled={!canManage || saving}
                      onChange={(isActive) => toggleActive(variant, isActive)}
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
        // có, cùng lý do như saveVariant ở trên.
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
