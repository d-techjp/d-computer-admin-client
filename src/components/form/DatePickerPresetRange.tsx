"use client";

import { useMemo } from "react";
import { DatePicker, Select, Space } from "antd";
import dayjs, { type Dayjs } from "dayjs";

import { FormItemLayout } from "./FormItemLayout";

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export interface DateRangeSearchValue {
  preset: DateRangePreset;
  from?: string;
  to?: string;
}

const PRESET_OPTIONS: { label: string; value: DateRangePreset }[] = [
  { label: "Hôm nay", value: "today" },
  { label: "Hôm qua", value: "yesterday" },
  { label: "7 ngày qua", value: "last7" },
  { label: "30 ngày qua", value: "last30" },
  { label: "Tháng này", value: "thisMonth" },
  { label: "Tháng trước", value: "lastMonth" },
  { label: "Tuỳ chọn", value: "custom" },
];

/** Quy đổi preset sang khoảng ngày cụ thể (ISO date, bao gồm cả 2 đầu) */
export function resolvePreset(preset: DateRangePreset): DateRangeSearchValue {
  const today = dayjs().startOf("day");
  const iso = (d: Dayjs) => d.format("YYYY-MM-DD");

  switch (preset) {
    case "today":
      return { preset, from: iso(today), to: iso(today) };
    case "yesterday": {
      const y = today.subtract(1, "day");
      return { preset, from: iso(y), to: iso(y) };
    }
    case "last7":
      return { preset, from: iso(today.subtract(6, "day")), to: iso(today) };
    case "last30":
      return { preset, from: iso(today.subtract(29, "day")), to: iso(today) };
    case "thisMonth":
      return {
        preset,
        from: iso(today.startOf("month")),
        to: iso(today.endOf("month")),
      };
    case "lastMonth": {
      const prev = today.subtract(1, "month");
      return {
        preset,
        from: iso(prev.startOf("month")),
        to: iso(prev.endOf("month")),
      };
    }
    default:
      return { preset: "custom" };
  }
}

export const DEFAULT_DATE_RANGE: DateRangeSearchValue = resolvePreset("last30");

interface DatePickerPresetRangeProps {
  label?: string;
  value: DateRangeSearchValue;
  onChange: (value: DateRangeSearchValue) => void;
  className?: string;
}

/**
 * Tái hiện widget DatePickerSearch của bản gốc: một Select các mốc thời gian
 * tương đối, khi chọn "Tuỳ chọn" thì hiện thêm RangePicker. Giá trị phát ra
 * là một object gộp `{ preset, from, to }`.
 */
export function DatePickerPresetRange({
  label = "Khoảng thời gian",
  value,
  onChange,
  className,
}: DatePickerPresetRangeProps) {
  const rangeValue = useMemo<[Dayjs, Dayjs] | undefined>(() => {
    if (!value.from || !value.to) return undefined;
    return [dayjs(value.from), dayjs(value.to)];
  }, [value.from, value.to]);

  return (
    <FormItemLayout label={label} className={className}>
      <Space.Compact className="w-full">
        <Select
          value={value.preset}
          options={PRESET_OPTIONS}
          onChange={(preset) => onChange(resolvePreset(preset))}
          className={value.preset === "custom" ? "w-[45%]" : "w-full"}
        />
        {value.preset === "custom" && (
          <DatePicker.RangePicker
            value={rangeValue}
            format="DD/MM/YYYY"
            allowClear={false}
            className="w-[55%]"
            onChange={(dates) =>
              onChange({
                preset: "custom",
                from: dates?.[0]?.format("YYYY-MM-DD"),
                to: dates?.[1]?.format("YYYY-MM-DD"),
              })
            }
          />
        )}
      </Space.Compact>
    </FormItemLayout>
  );
}

export default DatePickerPresetRange;
