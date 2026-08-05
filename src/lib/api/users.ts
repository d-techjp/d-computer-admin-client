import type { SelectOption } from "@/types/common";
import type { Customer, CustomerStatus } from "@/types/customer";
import type { AdminUser, AdminUserStatus } from "@/types/admin-user";

import { apiFetch } from "./client";
import {
  compactPayload,
  parseListResponse,
  toListQuery,
  type ApiListParams,
  type ApiListResult,
} from "./pagination";

export type UserStatus = AdminUserStatus;

export interface UserRecord {
  id: string;
  username: string;
  email?: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  roleCode: string;
  roleName: string;
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string;
}

export interface ListUsersParams extends ApiListParams {
  roleCode?: string;
  status?: UserStatus;
}

export interface CreateUserPayload {
  username: string;
  email?: string;
  password: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  roleCode?: string;
  status?: UserStatus;
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  status?: UserStatus;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readRole(record: Record<string, unknown>) {
  const role = asRecord(record.role);
  return {
    code: asString(record.roleCode ?? record.role_code ?? role.code ?? record.role, "customer"),
    name: asString(record.roleName ?? record.role_name ?? role.name ?? role.code, "Khách hàng"),
  };
}

export function toUserRecord(value: unknown): UserRecord {
  const record = asRecord(value);
  const role = readRole(record);
  const fullName = asString(record.fullName ?? record.full_name ?? record.name);

  return {
    id: asString(record.id),
    username: asString(record.username),
    email: asString(record.email) || undefined,
    fullName,
    phone: asString(record.phone) || undefined,
    avatarUrl: asString(record.avatarUrl ?? record.avatar_url) || undefined,
    roleCode: role.code,
    roleName: role.name,
    status: asString(record.status, "active") as UserStatus,
    createdAt: asString(record.createdAt ?? record.created_at, new Date(0).toISOString()),
    lastLoginAt: asString(record.lastLoginAt ?? record.last_login_at) || undefined,
  };
}

export function toAdminUser(user: UserRecord): AdminUser {
  return {
    id: user.id,
    username: user.username,
    name: user.fullName || user.username,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    roleCode: user.roleCode,
    roleName: user.roleName,
    status: user.status,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export function toCustomer(user: UserRecord): Customer {
  return {
    id: user.id,
    username: user.username,
    name: user.fullName || user.username,
    email: user.email,
    phone: user.phone,
    tier: "normal",
    totalOrders: 0,
    totalSpent: 0,
    status: user.status as CustomerStatus,
    createdAt: user.createdAt,
  };
}

export function listUsers(params: ListUsersParams) {
  return apiFetch<unknown>("/users", {
    query: {
      ...toListQuery(params),
      roleCode: params.roleCode,
      status: params.status,
    },
  }).then((payload) =>
    parseListResponse(payload, toUserRecord, {
      page: params.page,
      pageSize: params.limit,
    }),
  );
}

export function listAdminUsers(params: Omit<ListUsersParams, "roleCode"> & { roleCode?: string }) {
  return listUsers({ ...params, roleCode: params.roleCode ?? "staff|admin" }).then(
    (result): ApiListResult<AdminUser> => ({
      ...result,
      data: result.data.map(toAdminUser),
    }),
  );
}

export function listCustomers(params: Omit<ListUsersParams, "roleCode">) {
  return listUsers({ ...params, roleCode: "customer" }).then(
    (result): ApiListResult<Customer> => ({
      ...result,
      data: result.data.map(toCustomer),
    }),
  );
}

export function fetchUser(id: string) {
  return apiFetch<unknown>(`/users/${id}`).then(toUserRecord);
}

export function createUser(payload: CreateUserPayload) {
  return apiFetch<unknown>("/users", {
    method: "POST",
    body: compactPayload(payload),
  }).then(toUserRecord);
}

export function updateUser(id: string, payload: UpdateUserPayload) {
  return apiFetch<unknown>(`/users/${id}`, {
    method: "PATCH",
    body: compactPayload(payload),
  }).then(toUserRecord);
}

export function deleteUser(id: string) {
  return apiFetch<void>(`/users/${id}`, { method: "DELETE" });
}

export function assignUserRole(id: string, roleCode: string) {
  return apiFetch<unknown>(`/users/${id}/role`, {
    method: "PUT",
    body: { roleCode },
  }).then(toUserRecord);
}

export function toUserRoleOptions(users: UserRecord[]): SelectOption[] {
  const roles = new Map<string, string>();
  users.forEach((user) => roles.set(user.roleCode, user.roleName));
  return Array.from(roles.entries()).map(([value, label]) => ({ value, label }));
}
