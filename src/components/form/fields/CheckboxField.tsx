"use client";

import { Checkbox } from "antd";
import type { FieldValues } from "react-hook-form";
import { useController } from "react-hook-form";

import { FormItemLayout } from "../FormItemLayout";
import type { BaseFieldProps } from "./types";

interface CheckboxFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  /** Nhãn nằm ngay cạnh ô tick, khác với `label` (nhãn phía trên field) */
  text?: React.ReactNode;
}

export function CheckboxField<T extends FieldValues>({
  name,
  control,
  rules,
  label,
  helpText,
  disabled,
  className,
  text,
}: CheckboxFieldProps<T>) {
  const {
    field: { value, onChange, onBlur, ref },
    fieldState,
  } = useController({ name, control, rules });

  return (
    <FormItemLayout
      label={label}
      error={fieldState.error?.message}
      helpText={helpText}
      className={className}
    >
      <Checkbox
        ref={ref}
        checked={!!value}
        onChange={(event) => onChange(event.target.checked)}
        onBlur={onBlur}
        disabled={disabled}
      >
        {text}
      </Checkbox>
    </FormItemLayout>
  );
}

export default CheckboxField;
