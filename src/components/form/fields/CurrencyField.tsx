"use client";

import { InputNumber } from "antd";
import type { FieldValues } from "react-hook-form";
import { useController } from "react-hook-form";

import { currencyInputFormatter, currencyInputParser } from "@/lib/utils";

import { FormItemLayout } from "../FormItemLayout";
import type { BaseFieldProps } from "./types";

interface CurrencyFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Ô nhập số tiền theo yên Nhật: hiện dấu phẩy ngăn cách hàng nghìn ngay khi gõ
 * và có tiền tố ¥, nhưng giá trị lưu vào form vẫn là số nguyên thuần.
 */
export function CurrencyField<T extends FieldValues>({
  name,
  control,
  rules,
  label,
  required,
  helpText,
  disabled,
  className,
  placeholder = "0",
  min = 0,
  max,
  step = 1000,
}: CurrencyFieldProps<T>) {
  const {
    field: { ref, ...field },
    fieldState,
  } = useController({ name, control, rules });

  return (
    <FormItemLayout
      label={label}
      htmlFor={name}
      required={required}
      error={fieldState.error?.message}
      helpText={helpText}
      className={className}
    >
      <InputNumber
        {...field}
        id={name}
        ref={ref}
        status={fieldState.error ? "error" : undefined}
        disabled={disabled}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        prefix="¥"
        formatter={currencyInputFormatter}
        parser={currencyInputParser}
        className="w-full"
      />
    </FormItemLayout>
  );
}

export default CurrencyField;
