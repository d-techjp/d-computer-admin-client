/**
 * Các endpoint nhóm `Auth` trong contract OpenAPI.
 * Giữ đúng method/path/DTO của `openapi.yaml` — không thêm bớt field.
 */
import type {
  AuthResponse,
  ChangePasswordPayload,
  LoginPayload,
  PermissionsResponse,
  UserProfile,
} from "@/types/auth";

import { apiFetch } from "./client";

export const AUTH_ENDPOINTS = {
  login: "/auth/login",
  logout: "/auth/logout",
  logoutAll: "/auth/logout-all",
  profile: "/auth/profile",
  permissions: "/auth/permissions",
  changePassword: "/auth/change-password",
} as const;

/** POST /api/v1/auth/login — mỗi lần login token cũ mất hiệu lực */
export function login(payload: LoginPayload) {
  return apiFetch<AuthResponse>(AUTH_ENDPOINTS.login, {
    method: "POST",
    body: payload,
    auth: false,
  });
}

/**
 * POST /api/v1/auth/logout — tăng token version phía server.
 * Bỏ qua handler 401 vì token có thể đã hết hạn, lúc đó client vẫn tự dọn session.
 */
export function logout() {
  return apiFetch<{ tokenVersion?: number }>(AUTH_ENDPOINTS.logout, {
    method: "POST",
    skipUnauthorizedHandler: true,
  });
}

/** POST /api/v1/auth/logout-all — thu hồi toàn bộ token của tài khoản */
export function logoutAll() {
  return apiFetch<void>(AUTH_ENDPOINTS.logoutAll, {
    method: "POST",
    skipUnauthorizedHandler: true,
  });
}

/** GET /api/v1/auth/profile */
export function fetchProfile() {
  return apiFetch<UserProfile>(AUTH_ENDPOINTS.profile);
}

/** GET /api/v1/auth/permissions — client lưu lại để quyết định hiển thị UI */
export function fetchPermissions() {
  return apiFetch<PermissionsResponse>(AUTH_ENDPOINTS.permissions);
}

/** POST /api/v1/auth/change-password — trả về token mới */
export function changePassword(payload: ChangePasswordPayload) {
  return apiFetch<AuthResponse>(AUTH_ENDPOINTS.changePassword, {
    method: "POST",
    body: payload,
  });
}
