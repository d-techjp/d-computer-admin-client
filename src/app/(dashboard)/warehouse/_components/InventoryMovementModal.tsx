"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { App, Input, InputNumber, Modal, Select } from "antd";

import { FormItemLayout } from "@/components/form/FormItemLayout";
import {
  createInventoryExport,
  createInventoryImport,
  listInventoryStock,
} from "@/lib/api/inventory";
import { cn, formatNumber } from "@/lib/utils";
import {
  INVENTORY_EXPORT_REASONS,
  INVENTORY_IMPORT_REASONS,
  INVENTORY_REASON_LABEL,
  type InventoryReasonCode,
  type InventoryStockItem,
  type InventoryTransactionType,
} from "@/types/inventory";

/** Bấm nhanh thay vì gõ tay — phần lớn thao tác kho là số tròn nhỏ */
const QUICK_QUANTITIES = [1, 5, 10, 50];

const SEARCH_DEBOUNCE_MS = 300;

interface InventoryMovementModalProps {
  type: InventoryTransactionType;
  open: boolean;
  /** Biến thể chọn sẵn khi mở từ một dòng tồn kho */
  item?: InventoryStockItem;
  onClose: () => void;
  /** Đã ghi sổ xong — trang cha tải lại danh sách */
  onDone: () => void;
}

/**
 * Nhập/xuất kho thủ công (`POST /inventory/transactions/{import,export}`).
 *
 * Chỉ dùng cho thao tác kho thật sự: nhập lô mới, khách trả hàng, hàng lỗi,
 * kiểm kê... Bán hàng **không** đi qua đây — đơn hàng tự trừ kho và tự ghi sổ
 * với `referenceType = order`, nên danh sách lý do ở đây cố tình không có
 * `order_sale` / `order_cancelled`.
 *
 * Ô chọn biến thể tra cứu bằng chính `GET /inventory/stock`: đó là endpoint duy
 * nhất tìm được biến thể trên toàn shop theo tên/SKU, và tiện thể trả luôn tồn
 * hiện tại để hiện "tồn sau thao tác" ngay trong form.
 */
export function InventoryMovementModal({
  type,
  open,
  item,
  onClose,
  onDone,
}: InventoryMovementModalProps) {
  const { message } = App.useApp();
  const [options, setOptions] = useState<InventoryStockItem[]>([]);
  const [selected, setSelected] = useState<InventoryStockItem>();
  const [quantity, setQuantity] = useState<number | null>(null);
  const [reasonCode, setReasonCode] = useState<InventoryReasonCode>();
  const [note, setNote] = useState("");
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isImport = type === "in";
  const reasons = isImport ? INVENTORY_IMPORT_REASONS : INVENTORY_EXPORT_REASONS;

  const loadOptions = useCallback(
    async (search?: string) => {
      setSearching(true);
      try {
        const response = await listInventoryStock({ page: 1, limit: 20, search });
        setOptions(response.data);
      } catch {
        // Không tra được danh sách thì vẫn cho gõ tìm lại, không chặn cả modal
        setOptions([]);
      } finally {
        setSearching(false);
      }
    },
    [],
  );

  // Mỗi lần mở: làm sạch form và nạp sẵn danh sách để dropdown không rỗng.
  useEffect(() => {
    if (!open) return;

    queueMicrotask(() => {
      setSelected(item);
      setOptions(item ? [item] : []);
      setQuantity(null);
      setReasonCode(undefined);
      setNote("");
      void loadOptions(item?.sku);
    });
  }, [item, loadOptions, open]);

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  const onSearch = (value: string) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void loadOptions(value || undefined), SEARCH_DEBOUNCE_MS);
  };

  /*
   * Biến thể mở sẵn từ dòng tồn kho phải luôn nằm trong danh sách, kể cả khi
   * lượt tìm kiếm sau đó không trả về nó — nếu không, antd mất nhãn và ô chọn
   * hiển thị trơ id.
   */
  const optionItems =
    selected && !options.some((option) => option.variantId === selected.variantId)
      ? [selected, ...options]
      : options;

  const nextStock = (selected?.stock ?? 0) + (isImport ? 1 : -1) * (quantity ?? 0);
  /** Xuất quá tồn thì backend từ chối — chặn ngay ở UI thay vì để rơi ra lỗi 400 */
  const exceedsStock = !isImport && !!selected?.trackInventory && nextStock < 0;
  const invalid = !selected || !quantity || quantity < 1 || !reasonCode || exceedsStock;

  const onSubmit = async () => {
    if (!selected || !quantity || !reasonCode) return;

    setSubmitting(true);
    try {
      const payload = {
        variantId: selected.variantId,
        quantity,
        reasonCode,
        note: note.trim() || undefined,
      };

      if (isImport) {
        await createInventoryImport(payload);
      } else {
        await createInventoryExport(payload);
      }

      message.success(
        `Đã ${isImport ? "nhập" : "xuất"} ${formatNumber(quantity)} cho ${selected.sku}`,
      );
      onDone();
      onClose();
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : `Không ghi được phiếu ${isImport ? "nhập" : "xuất"} kho`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isImport ? "Nhập kho" : "Xuất kho"}
      open={open}
      onCancel={onClose}
      onOk={onSubmit}
      okText={isImport ? "Nhập kho" : "Xuất kho"}
      cancelText="Huỷ"
      confirmLoading={submitting}
      okButtonProps={{ disabled: invalid, danger: !isImport }}
      destroyOnHidden
    >
      <div className="space-y-4 pt-2">
        <FormItemLayout
          label="Biến thể"
          required
          helpText="Tìm theo tên sản phẩm, tên biến thể hoặc SKU."
        >
          <Select
            showSearch
            autoFocus
            value={selected?.variantId}
            placeholder="Nhập từ khoá để tìm..."
            // Danh sách đã lọc sẵn ở server, lọc thêm ở client sẽ giấu mất kết quả
            filterOption={false}
            loading={searching}
            onSearch={onSearch}
            onChange={(variantId: string) =>
              setSelected(optionItems.find((option) => option.variantId === variantId))
            }
            notFoundContent={searching ? "Đang tìm..." : "Không tìm thấy biến thể"}
            options={optionItems.map((option) => ({
              value: option.variantId,
              label: `${option.productName} — ${option.variantName || option.sku}`,
            }))}
            optionRender={(option) => {
              const row = optionItems.find((entry) => entry.variantId === option.value);
              return (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate">{row?.productName}</div>
                    <div className="text-muted text-xs">
                      {row?.sku}
                      {row?.variantName ? ` · ${row.variantName}` : ""}
                    </div>
                  </div>
                  <span className="text-muted shrink-0 text-xs">
                    Tồn {formatNumber(row?.stock ?? 0)}
                  </span>
                </div>
              );
            }}
            className="w-full"
          />
        </FormItemLayout>

        <FormItemLayout label="Số lượng" required>
          <InputNumber
            value={quantity}
            onChange={setQuantity}
            min={1}
            placeholder="VD: 10"
            className="w-full"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_QUANTITIES.map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => setQuantity((current) => (current ?? 0) + quick)}
                className="border-line text-muted hover:border-brand hover:text-brand rounded border px-2 py-0.5 text-xs transition-colors"
              >
                +{quick}
              </button>
            ))}
          </div>
        </FormItemLayout>

        <FormItemLayout label="Lý do" required>
          <Select
            value={reasonCode}
            onChange={setReasonCode}
            placeholder="Chọn lý do"
            options={reasons.map((code) => ({
              value: code,
              label: INVENTORY_REASON_LABEL[code],
            }))}
            className="w-full"
          />
        </FormItemLayout>

        <FormItemLayout label="Ghi chú" helpText="Ghi vào sổ kho, giúp đối chiếu về sau.">
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              isImport ? "VD: Nhập hàng lô tháng 8" : "VD: Hàng lỗi màn hình, loại khỏi kho"
            }
            maxLength={255}
          />
        </FormItemLayout>

        {selected && (
          <div className="border-line flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span className="text-muted">Tồn hiện tại {formatNumber(selected.stock)}</span>
            <span
              className={cn(
                "font-semibold",
                exceedsStock && "text-danger",
                !exceedsStock && !!quantity && (isImport ? "text-success" : "text-brand"),
              )}
            >
              → {formatNumber(nextStock)}
            </span>
          </div>
        )}

        {exceedsStock && (
          <p className="text-danger text-sm">
            Không xuất quá tồn hiện tại — biến thể này đang quản kho nên tồn sau thao tác
            không được nhỏ hơn 0.
          </p>
        )}
      </div>
    </Modal>
  );
}

export default InventoryMovementModal;
