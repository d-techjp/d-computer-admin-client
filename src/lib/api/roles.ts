import type { AdminRole, Permission } from "@/types/admin-user";
import type { SelectOption } from "@/types/common";

import { apiFetch } from "./client";
import {
  compactPayload,
  parseListResponse,
  toListQuery,
  type ApiListParams,
  type ApiListResult,
} from "./pagination";

export interface RoleOption {
  id: string;
  code: string;
  name: string;
  isSystem?: boolean;
}

export interface RolePayload {
  code?: string;
  name?: string;
  description?: string;
  permissionCodes?: Permission[];
}

export interface PermissionOption {
  id: string;
  code: string;
  name: string;
}

export interface PermissionGroupOption {
  module: string;
  permissions: PermissionOption[];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function toPermissionCode(value: unknown): string {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  return asString(record.code);
}

export function toRole(value: unknown): AdminRole {
  const record = asRecord(value);
  const permissionsValue = record.permissions ?? record.permissionCodes ?? [];
  const permissions = Array.isArray(permissionsValue)
    ? permissionsValue.map(toPermissionCode).filter(Boolean)
    : [];

  return {
    id: asString(record.id),
    code: asString(record.code),
    name: asString(record.name),
    description: asString(record.description),
    permissions,
    memberCount:
      typeof record.memberCount === "number"
        ? record.memberCount
        : typeof record.usersCount === "number"
          ? record.usersCount
          : typeof record.userCount === "number"
            ? record.userCount
            : 0,
    isSystem: asBoolean(record.isSystem),
    createdAt: asString(record.createdAt ?? record.created_at, new Date(0).toISOString()),
  };
}

export function toRoleOption(value: unknown): RoleOption {
  const record = asRecord(value);
  return {
    id: asString(record.id),
    code: asString(record.code),
    name: asString(record.name),
    isSystem: asBoolean(record.isSystem),
  };
}

export function listRoles(params: ApiListParams & { isSystem?: boolean }) {
  return apiFetch<unknown>("/roles", {
    query: { ...toListQuery(params), isSystem: params.isSystem },
  }).then((payload) =>
    parseListResponse(payload, toRole, {
      page: params.page,
      pageSize: params.limit,
    }),
  );
}

export function fetchRole(id: string) {
  return apiFetch<unknown>(`/roles/${id}`).then(toRole);
}

export function createRole(payload: Required<Pick<RolePayload, "code" | "name">> & RolePayload) {
  return apiFetch<unknown>("/roles", {
    method: "POST",
    body: compactPayload(payload),
  }).then(toRole);
}

export function updateRole(id: string, payload: RolePayload) {
  return apiFetch<unknown>(`/roles/${id}`, {
    method: "PATCH",
    body: compactPayload(payload),
  }).then(toRole);
}

export function deleteRole(id: string) {
  return apiFetch<void>(`/roles/${id}`, { method: "DELETE" });
}

export function setRolePermissions(id: string, permissionCodes: Permission[]) {
  return apiFetch<unknown>(`/roles/${id}/permissions`, {
    method: "PUT",
    body: { permissionCodes },
  }).then(toRole);
}

export function fetchRoleOptions() {
  return apiFetch<unknown[]>("/roles/options").then((payload) =>
    (Array.isArray(payload) ? payload : []).map(toRoleOption),
  );
}

export function fetchPermissionGroups() {
  return apiFetch<unknown[]>("/permissions/options").then((payload) =>
    (Array.isArray(payload) ? payload : []).map((item) => {
      const record = asRecord(item);
      const permissions = Array.isArray(record.permissions)
        ? record.permissions.map((permission) => {
            const permissionRecord = asRecord(permission);
            return {
              id: asString(permissionRecord.id),
              code: asString(permissionRecord.code),
              name: asString(permissionRecord.name),
            };
          })
        : [];

      return {
        module: asString(record.module),
        permissions,
      } satisfies PermissionGroupOption;
    }),
  );
}

export function roleOptionsToSelectOptions(options: RoleOption[]): SelectOption[] {
  return options.map((role) => ({ label: role.name, value: role.code }));
}

export function flattenPermissionGroups(groups: PermissionGroupOption[]) {
  return groups.flatMap((group) => group.permissions.map((permission) => permission.code));
}

export function toRoleListResult(payload: unknown, fallback: { page: number; pageSize: number }) {
  return parseListResponse(payload, toRole, fallback) satisfies ApiListResult<AdminRole>;
}
