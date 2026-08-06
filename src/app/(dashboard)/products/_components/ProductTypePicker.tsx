"use client";

import { useState } from "react";
import { Button } from "antd";
import { ArrowRight, Boxes, Check, Package, Wrench, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { PRODUCT_TYPE_LABEL, type ProductType } from "@/types/product";

interface TypeInfo {
  icon: LucideIcon;
  /** Màu badge icon — dùng token semantic sẵn có để không lệch theme sáng/tối */
  accent: "brand" | "info" | "success";
  description: string;
  traits: string[];
  example: string;
}

const TYPE_INFO: Record<ProductType, TypeInfo> = {
  standard: {
    icon: Package,
    accent: "brand",
    description: "Hàng hoá thường, bán qua một hoặc nhiều phiên bản.",
    traits: [
      "Có SKU, giá bán, tồn kho riêng",
      "Khai được nhiều phiên bản cấu hình (RAM, màu...)",
      "Quản kho theo từng phiên bản",
    ],
    example: "Laptop, bàn phím, chuột, ổ cứng",
  },
  bundle: {
    icon: Boxes,
    accent: "info",
    description: "Combo/kit ghép từ các phiên bản hàng hoá có sẵn.",
    traits: [
      "Ghép từ phiên bản của sản phẩm khác",
      "Tồn kho suy ra từ thành phần (tuỳ chọn)",
      "Không ghép được combo lồng combo",
    ],
    example: "Combo Laptop + Balo, Combo bàn phím + chuột",
  },
  service: {
    icon: Wrench,
    accent: "success",
    description: "Dịch vụ đi kèm, không quản lý tồn kho.",
    traits: [
      "Không có ô nhập kho",
      "Luôn bán được, không bao giờ báo hết hàng",
      "Chỉ cần khai SKU và giá",
    ],
    example: "Cài Windows, vệ sinh máy, bảo hành mở rộng",
  },
};

const ACCENT_CLASSES: Record<TypeInfo["accent"], string> = {
  brand: "bg-brand/10 text-brand",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
};

const TYPE_ORDER: ProductType[] = ["standard", "bundle", "service"];

/**
 * Bước đầu tiên của luồng tạo sản phẩm.
 *
 * `productType` quyết định toàn bộ form phía sau (có kho hay không, khai biến
 * thể hay khai thành phần combo) và **backend không cho đổi sau khi tạo** —
 * `UpdateProductDto` không có trường này. Vì hậu quả chọn nhầm khá nặng (phải
 * tạo lại sản phẩm mới), bấm vào thẻ chỉ để *chọn* — phải bấm "Tiếp tục" mới
 * thực sự sang form, tránh việc bấm nhầm và bị đẩy đi ngay.
 */
export function ProductTypePicker({
  onChange,
  disabled,
}: {
  onChange: (type: ProductType) => void;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<ProductType>();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TYPE_ORDER.map((type) => {
          const info = TYPE_INFO[type];
          const Icon = info.icon;
          const isSelected = selected === type;

          return (
            <button
              key={type}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              onClick={() => setSelected(type)}
              className={cn(
                "bg-card group flex flex-col gap-3 rounded-xl border p-5 text-left transition",
                "hover:border-brand hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60",
                isSelected ? "border-brand ring-brand/20 ring-4" : "border-line",
              )}
            >
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-lg",
                    ACCENT_CLASSES[info.accent],
                  )}
                >
                  <Icon size={22} />
                </span>
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border transition",
                    isSelected
                      ? "bg-brand border-brand text-white"
                      : "border-line text-transparent",
                  )}
                >
                  <Check size={14} />
                </span>
              </div>

              <div>
                <h3 className="text-fg font-semibold">{PRODUCT_TYPE_LABEL[type]}</h3>
                <p className="text-muted mt-1 text-sm">{info.description}</p>
              </div>

              <ul className="space-y-1.5 text-sm">
                {info.traits.map((trait) => (
                  <li key={trait} className="text-muted flex items-start gap-2">
                    <span className="bg-line mt-1.5 h-1 w-1 shrink-0 rounded-full" />
                    {trait}
                  </li>
                ))}
              </ul>

              <p className="border-line text-muted mt-auto border-t pt-3 text-xs">
                VD: {info.example}
              </p>
            </button>
          );
        })}
      </div>

      <div className="bg-card border-line flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
        <p className="text-muted text-sm">
          Loại sản phẩm <strong className="text-fg">không đổi được sau khi tạo</strong> — chọn
          nhầm phải tạo lại sản phẩm mới.
        </p>
        <Button
          type="primary"
          disabled={!selected || disabled}
          icon={<ArrowRight size={16} />}
          iconPosition="end"
          onClick={() => selected && onChange(selected)}
        >
          Tiếp tục
        </Button>
      </div>
    </div>
  );
}

export default ProductTypePicker;
