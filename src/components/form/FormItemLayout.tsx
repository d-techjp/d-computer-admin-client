"use client";

import { cn } from "@/lib/utils";

export interface FormItemLayoutProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  /** Ghi chú nhỏ dưới field */
  helpText?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Khung chung cho mọi field: label + dấu * bắt buộc + thông báo lỗi.
 * Tương ứng component FormLayout của bản gốc, nhưng chỉ giữ kiểu label-on-top
 * (bố cục label-trái để cho layout grid của SearchFilterBar lo).
 */
export function FormItemLayout({
  label,
  htmlFor,
  required,
  error,
  helpText,
  className,
  children,
}: FormItemLayoutProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-fg text-sm font-semibold leading-5"
        >
          {label}
          {required && <span className="text-danger ms-1">*</span>}
        </label>
      )}

      {children}

      {error ? (
        <span className="text-danger text-xs leading-4">{error}</span>
      ) : helpText ? (
        <span className="text-muted text-xs leading-4">{helpText}</span>
      ) : null}
    </div>
  );
}

export default FormItemLayout;
