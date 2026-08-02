"use client";

import { Input } from "antd";
import type { FieldValues } from "react-hook-form";
import { useController } from "react-hook-form";

import { FormItemLayout } from "../FormItemLayout";
import type { BaseFieldProps } from "./types";

interface TextAreaFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}

export function TextAreaField<T extends FieldValues>({
  name,
  control,
  rules,
  label,
  required,
  helpText,
  disabled,
  className,
  placeholder,
  rows = 4,
  maxLength,
}: TextAreaFieldProps<T>) {
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
      <Input.TextArea
        {...field}
        id={name}
        ref={ref}
        status={fieldState.error ? "error" : undefined}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        showCount={!!maxLength}
      />
    </FormItemLayout>
  );
}

export default TextAreaField;
