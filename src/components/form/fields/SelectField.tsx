"use client";

import { Select } from "antd";
import type { FieldValues } from "react-hook-form";
import { useController } from "react-hook-form";

import type { SelectOption } from "@/types/common";

import { FormItemLayout } from "../FormItemLayout";
import type { BaseFieldProps } from "./types";

interface SelectFieldProps<T extends FieldValues> extends BaseFieldProps<T> {
  options: SelectOption[];
  placeholder?: string;
  /** Bật chế độ chọn nhiều — thay cho component MultiSelect riêng của bản gốc */
  multiple?: boolean;
  allowClear?: boolean;
  showSearch?: boolean;
}

export function SelectField<T extends FieldValues>({
  name,
  control,
  rules,
  label,
  required,
  helpText,
  disabled,
  className,
  options,
  placeholder = "Chọn...",
  multiple,
  allowClear = true,
  showSearch = true,
}: SelectFieldProps<T>) {
  const {
    field: { ref, ...field },
    fieldState,
  } = useController({ name, control, rules });
  const value =
    field.value === "" || field.value === null || field.value === undefined
      ? multiple
        ? []
        : undefined
      : field.value;

  return (
    <FormItemLayout
      label={label}
      htmlFor={name}
      required={required}
      error={fieldState.error?.message}
      helpText={helpText}
      className={className}
    >
      <Select
        {...field}
        id={name}
        ref={ref}
        value={value}
        onChange={(nextValue) => {
          field.onChange(nextValue === undefined || nextValue === null ? "" : nextValue);
        }}
        mode={multiple ? "multiple" : undefined}
        status={fieldState.error ? "error" : undefined}
        disabled={disabled}
        placeholder={placeholder}
        options={options}
        allowClear={allowClear}
        showSearch={showSearch}
        maxTagCount="responsive"
        optionFilterProp="label"
        className="w-full"
      />
    </FormItemLayout>
  );
}

export default SelectField;
