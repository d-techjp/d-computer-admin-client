"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import * as authApi from "@/lib/api/auth";
import { setApiAccessToken, setApiUnauthorizedHandler } from "@/lib/api/client";
import type {
  AppPermission,
  AuthResponse,
  AuthRole,
  AuthUser,
  PermissionsResponse,
} from "@/types/auth";

export const AUTH_STORAGE_KEY = "d-computer-auth";
const REMEMBER_FLAG_KEY = "d-computer-auth-remember";

/**
 * Storage của session: "ghi nhớ đăng nhập" thì dùng localStorage (sống qua
 * lần mở trình duyệt sau), ngược lại dùng sessionStorage. Khi đọc thì ưu tiên
 * localStorage vì `setRememberSession` đã dọn bản ở storage không dùng.
 */
function isRemembered() {
  try {
    return window.localStorage.getItem(REMEMBER_FLAG_KEY) !== "0";
  } catch {
    return true;
  }
}

/** Gọi trước khi ghi session (ngay trước `signIn`) để chọn nơi lưu token */
export function setRememberSession(remember: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REMEMBER_FLAG_KEY, remember ? "1" : "0");
    const unused = remember ? window.sessionStorage : window.localStorage;
    unused.removeItem(AUTH_STORAGE_KEY);
  } catch {
    /* storage bị chặn — bỏ qua, state vẫn chạy trong bộ nhớ */
  }
}

const authStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(name) ?? window.sessionStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") return;
    try {
      (isRemembered() ? window.localStorage : window.sessionStorage).setItem(name, value);
    } catch {
      /* bỏ qua */
    }
  },
  removeItem: (name) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(name);
      window.sessionStorage.removeItem(name);
    } catch {
      /* bỏ qua */
    }
  },
};

interface AuthState {
  accessToken: string | null;
  tokenType: string;
  /** Mốc hết hạn (epoch ms) suy ra từ `expiresIn` lúc đăng nhập */
  expiresAt: number | null;
  user: AuthUser | null;
  role: AuthRole | null;
  permissions: AppPermission[];

  /** Lưu kết quả `POST /auth/login` */
  signIn: (response: AuthResponse) => void;
  /** Lưu kết quả `GET /auth/permissions` */
  setPermissions: (response: PermissionsResponse) => void;
  /** Gọi lại API permissions để đồng bộ khi role bị đổi ở backend */
  refreshPermissions: () => Promise<PermissionsResponse | null>;
  /** Xoá session phía client (không gọi API) */
  clearSession: () => void;
  /** Gọi `POST /auth/logout` rồi xoá session — lỗi mạng vẫn xoá */
  signOut: () => Promise<void>;

  isAuthenticated: () => boolean;
  has: (permission: AppPermission) => boolean;
  hasAny: (permissions: AppPermission[]) => boolean;
  hasAll: (permissions: AppPermission[]) => boolean;
}

const EMPTY_SESSION = {
  accessToken: null,
  tokenType: "Bearer",
  expiresAt: null,
  user: null,
  role: null,
  permissions: [] as AppPermission[],
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...EMPTY_SESSION,

      signIn: (response) =>
        set({
          accessToken: response.accessToken,
          tokenType: response.tokenType || "Bearer",
          expiresAt: response.expiresIn ? Date.now() + response.expiresIn * 1000 : null,
          user: response.user,
          role: response.user.role,
          permissions: [],
        }),

      setPermissions: (response) =>
        set({ role: response.role, permissions: response.permissions ?? [] }),

      refreshPermissions: async () => {
        if (!get().accessToken) return null;
        try {
          const response = await authApi.fetchPermissions();
          get().setPermissions(response);
          return response;
        } catch {
          // 401 đã được client xử lý (xoá session); lỗi khác thì giữ permission cũ
          return null;
        }
      },

      clearSession: () => set({ ...EMPTY_SESSION }),

      signOut: async () => {
        if (get().accessToken) {
          try {
            await authApi.logout();
          } catch {
            /* token có thể đã hết hạn — vẫn xoá phía client */
          }
        }
        set({ ...EMPTY_SESSION });
      },

      isAuthenticated: () => {
        const { accessToken, expiresAt } = get();
        if (!accessToken) return false;
        return expiresAt === null || expiresAt > Date.now();
      },

      has: (permission) => get().permissions.includes(permission),
      hasAny: (permissions) =>
        permissions.length === 0 ||
        permissions.some((permission) => get().permissions.includes(permission)),
      hasAll: (permissions) =>
        permissions.every((permission) => get().permissions.includes(permission)),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => authStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        tokenType: state.tokenType,
        expiresAt: state.expiresAt,
        user: state.user,
        role: state.role,
        permissions: state.permissions,
      }),
    },
  ),
);

/* ---------- Đồng bộ token sang lớp fetch ---------- */

function syncToken(state: AuthState) {
  setApiAccessToken(state.isAuthenticated() ? state.accessToken : null, state.tokenType);
}

syncToken(useAuthStore.getState());
useAuthStore.subscribe(syncToken);
useAuthStore.persist.onFinishHydration((state) => {
  // Token đã hết hạn từ phiên trước thì dọn luôn cho khỏi hiển thị nửa vời
  if (state.accessToken && !state.isAuthenticated()) state.clearSession();
  syncToken(useAuthStore.getState());
});

/** 401 từ bất kỳ API nào ⇒ xoá session, AuthGuard sẽ tự đẩy về /login */
setApiUnauthorizedHandler(() => {
  if (useAuthStore.getState().accessToken) useAuthStore.getState().clearSession();
});

/**
 * `true` khi persist đã đọc xong storage. Phải chờ cờ này trước khi quyết định
 * "chưa đăng nhập", nếu không lần render đầu sẽ đẩy sai người dùng về /login.
 */
export function useAuthHydrated() {
  return useSyncExternalStore(
    (onStoreChange) => useAuthStore.persist.onFinishHydration(onStoreChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false,
  );
}
