"use client";

import { useMemo } from "react";
import { Select, Slider, Space } from "antd";

import { formatCompactCurrency } from "@/lib/utils";

import { FormItemLayout } from "./FormItemLayout";

export type PriceRangePreset =
  | "all"
  | "under_5m"
  | "5m_10m"
  | "10m_20m"
  | "20m_30m"
  | "over_30m"
  | "custom";

export interface PriceRangeSearchValue {
  preset: PriceRangePreset;
  min?: number;
  max?: number;
}

/** Mốc trượt tối đa — khớp giá trị "trên X" của preset cao nhất */
const SLIDER_MAX = 50_000_000;
const SLIDER_STEP = 500_000;

const PRESET_BOUNDS: Record<
  Exclude<PriceRangePreset, "all" | "custom">,
  [number, number | undefined]
> = {
  under_5m: [0, 5_000_000],
  "5m_10m": [5_000_000, 10_000_000],
  "10m_20m": [10_000_000, 20_000_000],
  "20m_30m": [20_000_000, 30_000_000],
  over_30m: [30_000_000, undefined],
};

const PRESET_OPTIONS: { label: string; value: PriceRangePreset }[] = [
  { label: "Tất cả mức giá", value: "all" },
  { label: "Dưới 5 triệu", value: "under_5m" },
  { label: "5 - 10 triệu", value: "5m_10m" },
  { label: "10 - 20 triệu", value: "10m_20m" },
  { label: "20 - 30 triệu", value: "20m_30m" },
  { label: "Trên 30 triệu", value: "over_30m" },
  { label: "Tuỳ chỉnh", value: "custom" },
];

/** Quy đổi preset sang khoảng giá cụ thể (JPY) */
export function resolvePricePreset(preset: PriceRangePreset): PriceRangeSearchValue {
  if (preset === "all" || preset === "custom") return { preset };
  const [min, max] = PRESET_BOUNDS[preset];
  return { preset, min, max };
}

export const DEFAULT_PRICE_RANGE: PriceRangeSearchValue = resolvePricePreset("all");

interface PriceRangePresetFilterProps {
  label?: string;
  value: PriceRangeSearchValue;
  onChange: (value: PriceRangeSearchValue) => void;
  className?: string;
}

/**
 * Cùng ý tưởng với `DatePickerPresetRange`: một Select các khoảng giá thường
 * dùng, chọn "Tuỳ chỉnh" thì hiện thêm thanh trượt kéo 2 đầu để chọn khoảng
 * giá tự do. Thay cho 2 ô InputNumber "giá từ/đến" trước đây — vốn không gợi ý
 * được mốc giá nào hợp lý và dễ gõ sai khoảng.
 */
export function PriceRangePresetFilter({
  label = "Khoảng giá (JPY)",
  value,
  onChange,
  className,
}: PriceRangePresetFilterProps) {
  const sliderValue = useMemo<[number, number]>(
    () => [value.min ?? 0, value.max ?? SLIDER_MAX],
    [value.min, value.max],
  );

  const isOverMax = sliderValue[1] >= SLIDER_MAX;

  return (
    <FormItemLayout label={label} className={className}>
      <Space direction="vertical" size={8} className="w-full">
        <Select
          value={value.preset}
          options={PRESET_OPTIONS}
          onChange={(preset) => onChange(resolvePricePreset(preset))}
          className="w-full"
        />

        {value.preset === "custom" && (
          <div className="px-1 pt-1">
            <Slider
              range
              min={0}
              max={SLIDER_MAX}
              step={SLIDER_STEP}
              value={sliderValue}
              tooltip={{ formatter: (item) => formatCompactCurrency(item ?? 0) }}
              onChange={(next) => {
                const [min, max] = next as [number, number];
                onChange({
                  preset: "custom",
                  min,
                  max: max >= SLIDER_MAX ? undefined : max,
                });
              }}
            />
            <div className="text-muted mt-1 flex justify-between text-xs">
              <span>{formatCompactCurrency(sliderValue[0])}</span>
              <span>
                {isOverMax
                  ? `Trên ${formatCompactCurrency(SLIDER_MAX)}`
                  : formatCompactCurrency(sliderValue[1])}
              </span>
            </div>
          </div>
        )}
      </Space>
    </FormItemLayout>
  );
}

export default PriceRangePresetFilter;
