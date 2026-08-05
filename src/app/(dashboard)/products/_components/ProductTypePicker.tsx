"use client";

import { Boxes, Package, Wrench, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { PRODUCT_TYPE_HINT, PRODUCT_TYPE_LABEL, type ProductType } from "@/types/product";

const TYPE_ICON: Record<ProductType, LucideIcon> = {
  standard: Package,
  bundle: Boxes,
  service: Wrench,
};

const TYPE_ORDER: ProductType[] = ["standard", "bundle", "service"];

/**
 * Bước đầu tiên của luồng tạo sản phẩm.
 *
 * `productType` quyết định toàn bộ form phía sau (có kho hay không, khai biến
 * thể hay khai thành phần combo) và **backend không cho đổi sau khi tạo** —
 * `UpdateProductDto` không có trường này. Vì vậy nó được tách hẳn thành một
 * bước chọn có chủ đích thay vì một dropdown lẫn giữa các field khác.
 */
export function ProductTypePicker({
  value,
  onChange,
  disabled,
}: {
  value?: ProductType;
  onChange: (type: ProductType) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {TYPE_ORDER.map((type) => {
        const Icon = TYPE_ICON[type];
        const selected = value === type;

        return (
          <button
            key={type}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(type)}
            className={cn(
              "bg-card shadow-card flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition",
              "hover:border-brand disabled:cursor-not-allowed disabled:opacity-60",
              selected ? "border-brand ring-brand/30 ring-2" : "border-line",
            )}
          >
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-md",
                selected ? "bg-brand/10 text-brand" : "bg-subtle text-muted",
              )}
            >
              <Icon size={20} />
            </span>
            <span className="text-fg font-semibold">{PRODUCT_TYPE_LABEL[type]}</span>
            <span className="text-muted text-sm">{PRODUCT_TYPE_HINT[type]}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ProductTypePicker;
