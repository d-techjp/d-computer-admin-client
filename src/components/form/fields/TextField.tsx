"use client";

import { Input, InputNumber } from "antd";
import type { FieldValues } from "react-hook-form";
import { useController } from "react-hook-form";

import { FormItemLayout } from "../FormItemLayout";
import type { BaseFieldProps } from "./types";

interface TextFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  placeholder?: string;
  prefix?: React.ReactNode;
  type?: "text" | "password" | "number";
  /** Chỉ dùng cho type="number" */
  min?: number;
  max?: number;
}

export function TextField<T extends FieldValues>({
  name,
  control,
  rules,
  label,
  required,
  helpText,
  disabled,
  className,
  placeholder,
  prefix,
  type = "text",
  min,
  max,
}: TextFieldProps<T>) {
  const {
    field: { ref, ...field },
    fieldState,
  } = useController({ name, control, rules });

  const status = fieldState.error ? ("error" as const) : undefined;

  return (
    <FormItemLayout
      label={label}
      htmlFor={name}
      required={required}
      error={fieldState.error?.message}
      helpText={helpText}
      className={className}
    >
      {type === "number" ? (
        <InputNumber
          {...field}
          id={name}
          ref={ref}
          status={status}
          disabled={disabled}
          placeholder={placeholder}
          min={min}
          max={max}
          className="w-full"
        />
      ) : type === "password" ? (
        <Input.Password
          {...field}
          id={name}
          ref={ref}
          status={status}
          disabled={disabled}
          placeholder={placeholder}
          prefix={prefix}
        />
      ) : (
        <Input
          {...field}
          id={name}
          ref={ref}
          status={status}
          disabled={disabled}
          placeholder={placeholder}
          prefix={prefix}
          allowClear
        />
      )}
    </FormItemLayout>
  );
}

export default TextField;
