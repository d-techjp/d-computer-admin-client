/**
 * Lớp fetch dùng chung cho mọi lời gọi API thật (contract: `openapi.yaml`).
 *
 * Token được giữ ở biến module thay vì đọc storage mỗi request: store auth
 * (`useAuthStore`) đẩy token vào đây mỗi khi state đổi hoặc rehydrate xong,
 * nhờ vậy file này không phụ thuộc ngược vào store — tránh import vòng.
 */

const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3030/api/v1";

/** Base URL đã bao gồm API prefix, ví dụ `http://localhost:3030/api/v1`. */
export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, "");

/** Lỗi HTTP đã được bóc message từ body theo định dạng lỗi của NestJS */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly body?: unknown;

  constructor(
    message: string,
    options: { status: number; code?: string; body?: unknown },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.body = options.body;
  }
}

/** Lỗi mạng / không gọi được tới server */
export class NetworkError extends Error {
  constructor(message = "Không kết nối được tới server. Vui lòng thử lại.") {
    super(message);
    this.name = "NetworkError";
  }
}

/* ---------- Token & xử lý 401 tập trung ---------- */

let accessToken: string | null = null;
let tokenType = "Bearer";
let onUnauthorized: (() => void) | null = null;

export function setApiAccessToken(token: string | null, type = "Bearer") {
  accessToken = token;
  tokenType = type || "Bearer";
}

export function getApiAccessToken() {
  return accessToken;
}

/**
 * Đăng ký hành vi khi API trả 401 (token hết hạn hoặc bị thu hồi do
 * token version tăng). Store auth dùng chỗ này để xoá session.
 */
export function setApiUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

/* ---------- Request ---------- */

export type QueryValue = string | number | boolean | undefined | null;

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  /** Object sẽ được JSON.stringify; truyền FormData để upload file */
  body?: unknown;
  query?: Record<string, QueryValue | QueryValue[]>;
  /** Gắn header Authorization nếu đang có token (mặc định: có) */
  auth?: boolean;
  /** Bỏ qua handler 401 — dùng cho chính lời gọi logout */
  skipUnauthorizedHandler?: boolean;
}

function buildUrl(path: string, query?: ApiRequestOptions["query"]) {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item === undefined || item === null || item === "") continue;
      search.append(key, String(item));
    }
  }

  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

/**
 * Backend bọc mọi response trong envelope (contract chỉ mô tả phần bên trong):
 * - OK:  `{ success: true, statusCode, data, timestamp }`
 * - Lỗi: `{ success: false, statusCode, message, errors?, path, method, timestamp }`
 */
interface ApiEnvelope {
  success?: boolean;
  statusCode?: number;
  data?: unknown;
  message?: unknown;
  errors?: unknown;
  error?: unknown;
}

function asEnvelope(body: unknown): ApiEnvelope | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  return "success" in body ? (body as ApiEnvelope) : undefined;
}

/** Lấy phần payload thật; body không theo envelope thì trả nguyên trạng */
function unwrapEnvelope(body: unknown) {
  const envelope = asEnvelope(body);
  if (!envelope) return body;
  return "data" in envelope ? envelope.data : undefined;
}

/** Bóc message dễ đọc từ body lỗi (kèm danh sách lỗi validate nếu có) */
function extractErrorMessage(body: unknown, status: number) {
  if (typeof body === "string" && body.trim()) return body;

  if (body && typeof body === "object") {
    const payload = body as ApiEnvelope;

    // `errors` là danh sách lỗi validate của class-validator
    if (Array.isArray(payload.errors) && payload.errors.length) {
      return payload.errors.map(String).join("\n");
    }
    if (Array.isArray(payload.message) && payload.message.length) {
      return payload.message.map(String).join("\n");
    }
    if (typeof payload.message === "string" && payload.message) {
      return payload.message;
    }
    if (typeof payload.error === "string" && payload.error) {
      return payload.error;
    }
  }

  if (status === 401) return "Phiên đăng nhập đã hết hạn.";
  if (status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (status === 404) return "Không tìm thấy dữ liệu.";
  return `Yêu cầu thất bại (HTTP ${status}).`;
}

async function parseBody(response: Response) {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text) return undefined;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
  return text;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    body,
    query,
    auth = true,
    skipUnauthorizedHandler = false,
    headers,
    ...init
  } = options;

  const requestHeaders = new Headers(headers);
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  if (body !== undefined && !isFormData) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }
  if (auth && accessToken) {
    requestHeaders.set("Authorization", `${tokenType} ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...init,
      headers: requestHeaders,
      body: isFormData ? (body as FormData) : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }

  const payload = await parseBody(response);

  if (!response.ok) {
    if (response.status === 401 && auth && !skipUnauthorizedHandler) {
      onUnauthorized?.();
    }
    const code =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error ?? "")
        : undefined;
    throw new ApiError(extractErrorMessage(payload, response.status), {
      status: response.status,
      code: code || undefined,
      body: payload,
    });
  }

  return unwrapEnvelope(payload) as T;
}
