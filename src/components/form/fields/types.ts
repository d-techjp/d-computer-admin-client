import type { Control, FieldValues, Path, RegisterOptions } from "react-hook-form";

/**
 * Hợp đồng chung cho mọi field — bản gốc truyền `{ id, control, errors, validation }`,
 * ở đây gom lại theo API chuẩn của react-hook-form v7 (`name` + `control` + `rules`),
 * lỗi lấy trực tiếp từ `useController` nên không cần truyền `errors` thủ công.
 */
export interface BaseFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  required?: boolean;
  helpText?: string;
  disabled?: boolean;
  className?: string;
  rules?: Omit<
    RegisterOptions<T, Path<T>>,
    "valueAsNumber" | "valueAsDate" | "setValueAs" | "disabled"
  >;
}
