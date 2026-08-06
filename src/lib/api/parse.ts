/**
 * Primitive để đọc response một cách phòng thủ.
 *
 * Contract OpenAPI của nhóm Products/Variants khai `responses: { 200: {} }` —
 * **không có response schema nào**, nên FE không generate được kiểu và cũng
 * không có gì đảm bảo hình dạng dữ liệu. Mọi mapper vì vậy đọc qua các hàm
 * dưới đây thay vì ép kiểu thẳng, để một field thiếu chỉ làm mất giá trị đó
 * chứ không làm vỡ cả trang.
 */

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

/**
 * Cột `numeric` của Postgres về tới client dưới dạng chuỗi ("15990000.00"),
 * nên mọi giá tiền đều phải đi qua đây thay vì đọc thẳng.
 */
export function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return fallback;
}

export function asOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

export function asBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  // Response đi qua multipart/query có thể trả chuỗi "true"/"false"
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asStringArray(value: unknown): string[] {
  return asArray(value).filter((item): item is string => typeof item === "string");
}

/** Ngày tạo — thiếu thì trả epoch để cột sắp xếp không bị `undefined` */
export function asIsoDate(value: unknown) {
  return asString(value, new Date(0).toISOString());
}

/** Giá trị nằm trong tập cho phép, ngược lại trả về mặc định */
export function asEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function asOptionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}
