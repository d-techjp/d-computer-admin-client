"use client";

import { Switch } from "antd";
import type { FieldValues } from "react-hook-form";
import { useController } from "react-hook-form";

import { FormItemLayout } from "../FormItemLayout";
import type { BaseFieldProps } from "./types";

interface SwitchFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  checkedLabel?: string;
  uncheckedLabel?: string;
}

export function SwitchField<T extends FieldValues>({
  name,
  control,
  rules,
  label,
  helpText,
  disabled,
  className,
  checkedLabel = "Bật",
  uncheckedLabel = "Tắt",
}: SwitchFieldProps<T>) {
  const {
    field: { value, onChange, ref },
    fieldState,
  } = useController({ name, control, rules });

  return (
    <FormItemLayout
      label={label}
      error={fieldState.error?.message}
      helpText={helpText}
      className={className}
    >
      <div>
        <Switch
          ref={ref}
          checked={!!value}
          onChange={onChange}
          disabled={disabled}
          checkedChildren={checkedLabel}
          unCheckedChildren={uncheckedLabel}
        />
      </div>
    </FormItemLayout>
  );
}

export default SwitchField;
