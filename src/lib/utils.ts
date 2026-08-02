import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/*
 * Cửa hàng bán tại thị trường Nhật nên mọi giá trị tiền tệ đều là JPY.
 * Yên không có phần thập phân và dùng dấu phẩy ngăn cách hàng nghìn.
 */
const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("ja-JP");

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

/** Ký hiệu yên toàn giác, khớp với kết quả Intl trả về cho locale ja-JP */
const YEN = "￥";

/**
 * Rút gọn số tiền lớn cho KPI card theo đơn vị đếm của Nhật:
 * 万 = 10.000, 億 = 100.000.000.
 * Giữ một chữ số thập phân ở khoảng dưới 100万 để không nuốt mất sai khác lớn
 * (12.500 phải ra 1,3万 chứ không phải 1万).
 */
export function formatCompactCurrency(value: number) {
  if (value >= 100_000_000) return `${YEN}${(value / 100_000_000).toFixed(2)}億`;
  if (value >= 1_000_000)
    return `${YEN}${numberFormatter.format(Math.round(value / 10_000))}万`;
  if (value >= 10_000) return `${YEN}${(value / 10_000).toFixed(1)}万`;
  return currencyFormatter.format(value);
}

/**
 * formatter/parser cho antd InputNumber — hiện dấu phẩy ngăn cách hàng nghìn
 * ngay khi người dùng gõ giá, và bóc dấu phẩy ra khi đọc lại giá trị.
 */
export const currencyInputFormatter = (value?: string | number) =>
  value === undefined || value === "" ? "" : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export const currencyInputParser = (displayValue?: string) =>
  Number((displayValue ?? "").replace(/[^\d]/g, ""));

const PASSWORD_CHARS = {
  lower: "abcdefghijkmnpqrstuvwxyz",
  upper: "ABCDEFGHJKMNPQRSTUVWXYZ",
  digit: "23456789",
  symbol: "!@#$%*?",
};

/**
 * Sinh mật khẩu ngẫu nhiên đủ mạnh cho form tạo tài khoản quản trị viên:
 * đảm bảo có đủ 4 nhóm ký tự, bỏ các ký tự dễ nhầm (0/O, 1/l/I).
 */
export function generatePassword(length = 12): string {
  const groups = Object.values(PASSWORD_CHARS);
  const all = groups.join("");

  const pick = (pool: string) => pool[Math.floor(Math.random() * pool.length)];

  const required = groups.map(pick);
  const rest = Array.from({ length: length - required.length }, () =>
    pick(all),
  );

  // Trộn ngẫu nhiên để 4 ký tự bắt buộc không luôn nằm ở đầu chuỗi
  const chars = [...required, ...rest];
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value)
  );
}

/**
 * Deep merge dùng cho việc gộp DEFAULT_OPTIONS của chart với override từ caller
 * (thay cho pattern `onEditOption(_cloneDeep(DEFAULT_OPTIONS))` của bản gốc).
 */
export function deepMerge<T extends object>(
  base: T,
  ...overrides: (object | undefined)[]
): T {
  return overrides.reduce<T>((acc, override) => {
    if (!override) return acc;
    const result: PlainObject = { ...(acc as PlainObject) };

    for (const [key, value] of Object.entries(override)) {
      const current = result[key];
      result[key] =
        isPlainObject(current) && isPlainObject(value)
          ? deepMerge(current, value)
          : value;
    }

    return result as T;
  }, base);
}
