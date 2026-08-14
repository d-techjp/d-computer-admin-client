/**
 * Nhật ký hoạt động — `GET /activity-logs` và `GET /activity-logs/{id}`.
 *
 * Log là dữ liệu chỉ đọc: không có endpoint tạo/sửa/xoá, backend tự ghi khi
 * thao tác admin chạy qua interceptor. Contract không khai response schema nên
 * mapper đọc phòng thủ như các resource khác.
 */
import type { ActivityChange, ActivityLog, ActivityStatus } from "@/types/activity-log";

import { apiFetch, type QueryValue } from "./client";
import {
  parseListResponse,
  toIsoEnd,
  toIsoStart,
  toListQuery,
  type ApiListParams,
} from "./pagination";
import { asEnum, asIsoDate, asOptionalString, asRecord, asString } from "./parse";

const ACTIVITY_STATUSES = ["success", "failed"] as const;

/** Khoá trong metadata không phải "dữ liệu kèm theo" mà đã có cột riêng ở UI */
const RESERVED_METADATA_KEYS = ["changes", "before", "after", "old", "new"];

function asDisplayValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Danh sách trường đã đổi. Backend có thể ghi theo vài dạng khác nhau nên chấp
 * nhận cả ba dạng thường gặp, thay vì chỉ đọc đúng một dạng rồi bỏ trống khi
 * gặp dạng còn lại:
 * - mảng `[{ field, before, after }]`
 * - object `{ price: { before, after } }`
 * - cặp `before`/`after` là hai object phẳng (so từng khoá của `after`)
 */
function toChanges(metadata: Record<string, unknown>): ActivityChange[] {
  const raw = metadata.changes;

  if (Array.isArray(raw)) {
    return raw.map((item) => {
      const record = asRecord(item);
      return {
        field: asString(record.field ?? record.name ?? record.key),
        before: asDisplayValue(record.before ?? record.old ?? record.from),
        after: asDisplayValue(record.after ?? record.new ?? record.to),
      };
    });
  }

  if (raw && typeof raw === "object") {
    return Object.entries(asRecord(raw)).map(([field, value]) => {
      const record = asRecord(value);
      return {
        field,
        before: asDisplayValue(record.before ?? record.old),
        after: asDisplayValue(record.after ?? record.new),
      };
    });
  }

  const before = asRecord(metadata.before ?? metadata.old);
  const after = asRecord(metadata.after ?? metadata.new);
  if (!Object.keys(after).length) return [];

  return Object.keys(after).map((field) => ({
    field,
    before: asDisplayValue(before[field]),
    after: asDisplayValue(after[field]),
  }));
}

/** Phần metadata còn lại sau khi đã bóc `changes` ra cột riêng */
function toExtraMetadata(metadata: Record<string, unknown>) {
  const rest = Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !RESERVED_METADATA_KEYS.includes(key)),
  );
  return Object.keys(rest).length ? rest : undefined;
}

export function toActivityLog(value: unknown): ActivityLog {
  const record = asRecord(value);
  const user = asRecord(record.user ?? record.actor);
  const metadata = asRecord(record.metadata ?? record.details ?? record.payload);

  return {
    id: asString(record.id),
    userId: asOptionalString(record.userId ?? user.id),
    // Log của thao tác hệ thống không gắn user — để trống thì cột trơ ra, nên
    // đặt sẵn nhãn thay vì xử lý ở từng chỗ hiển thị.
    userName: asString(
      record.userName ?? user.fullName ?? user.username ?? record.username,
      "Hệ thống",
    ),
    userEmail: asOptionalString(record.userEmail ?? user.email),
    userRole: asOptionalString(record.userRole ?? user.roleName ?? user.role),
    action: asString(record.action),
    resource: asString(record.resource ?? record.module),
    resourceId: asOptionalString(record.resourceId),
    status: asEnum<ActivityStatus>(record.status, ACTIVITY_STATUSES, "success"),
    description: asOptionalString(record.description ?? record.message),
    errorMessage: asOptionalString(record.errorMessage ?? record.error),
    ipAddress: asOptionalString(record.ipAddress ?? record.ip),
    userAgent: asOptionalString(record.userAgent),
    changes: toChanges(metadata),
    metadata: toExtraMetadata(metadata),
    createdAt: asIsoDate(record.createdAt ?? record.created_at),
  };
}

export interface ListActivityLogsParams extends ApiListParams {
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  status?: ActivityStatus;
  /** Ngày trần `YYYY-MM-DD`; hàm này tự nới ra đầu/cuối ngày trước khi gửi */
  from?: string;
  to?: string;
}

export function listActivityLogs(params: ListActivityLogsParams) {
  const query: Record<string, QueryValue> = {
    ...toListQuery(params),
    userId: params.userId,
    action: params.action,
    resource: params.resource,
    resourceId: params.resourceId,
    status: params.status,
    from: toIsoStart(params.from),
    to: toIsoEnd(params.to),
  };

  return apiFetch<unknown>("/activity-logs", { query }).then((payload) =>
    parseListResponse(payload, toActivityLog, {
      page: params.page,
      pageSize: params.limit,
    }),
  );
}

export function fetchActivityLog(id: string) {
  return apiFetch<unknown>(`/activity-logs/${id}`).then(toActivityLog);
}
