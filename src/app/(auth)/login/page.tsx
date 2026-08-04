"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { App, Button, Spin } from "antd";
import { MonitorCog } from "lucide-react";
import { useForm } from "react-hook-form";

import { SwitchField, TextField } from "@/components/form/fields";
import { firstAccessiblePath } from "@/config/menuConfig";
import { canAccessPath } from "@/config/permissions";
import routes from "@/config/routes";
import * as authApi from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import {
  setRememberSession,
  useAuthHydrated,
  useAuthStore,
} from "@/store/useAuthStore";
import { canAccessAdminPortal, type AppPermission } from "@/types/auth";

interface LoginFormValues {
  /** Contract `LoginDto` dùng username, không phải email */
  username: string;
  password: string;
  remember: boolean;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);

  const hydrated = useAuthHydrated();
  const authenticated = useAuthStore((state) => state.isAuthenticated());

  const { control, handleSubmit } = useForm<LoginFormValues>({
    defaultValues: { username: "", password: "", remember: true },
  });

  /** Trang người dùng muốn vào trước khi bị đẩy ra login (chỉ nhận path nội bộ) */
  const nextParam = searchParams.get("next");
  const requestedPath =
    nextParam?.startsWith("/") && !nextParam.startsWith("//") ? nextParam : undefined;

  function resolveLandingPath(granted: AppPermission[]) {
    if (requestedPath && canAccessPath(requestedPath, granted)) return requestedPath;
    return firstAccessiblePath(granted) ?? routes.dashboard;
  }

  // Đã có session hợp lệ thì không cần đứng lại ở trang login
  useEffect(() => {
    if (!hydrated || !authenticated) return;
    router.replace(resolveLandingPath(useAuthStore.getState().permissions));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, authenticated]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    const store = useAuthStore.getState();

    try {
      // Chọn nơi lưu session trước khi ghi token
      setRememberSession(values.remember);

      const auth = await authApi.login({
        username: values.username.trim(),
        password: values.password,
      });

      if (!canAccessAdminPortal(auth.user.role)) {
        store.clearSession();
        message.error("Tài khoản này không có quyền truy cập trang quản trị.");
        return;
      }

      // Lưu token trước để lời gọi permissions kế tiếp có Authorization header
      store.signIn(auth);

      const permissionsResponse = await authApi.fetchPermissions();
      store.setPermissions(permissionsResponse);

      if (permissionsResponse.permissions.length === 0) {
        store.clearSession();
        message.error("Tài khoản chưa được cấp quyền nào trong trang quản trị.");
        return;
      }

      message.success(`Xin chào ${auth.user.fullName || auth.user.username}`);
      router.replace(resolveLandingPath(permissionsResponse.permissions));
    } catch (error) {
      store.clearSession();
      const fallback = "Đăng nhập thất bại. Vui lòng thử lại.";
      if (error instanceof ApiError) {
        // Backend đã trả message tiếng Việt rõ ràng cho từng trường hợp
        message.error(
          error.message ||
            (error.status === 401 ? "Tên đăng nhập hoặc mật khẩu không đúng." : fallback),
        );
      } else {
        message.error(error instanceof Error ? error.message : fallback);
      }
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="bg-card border-line shadow-card w-full max-w-sm space-y-4 rounded-lg border p-6"
    >
      <div className="text-brand mb-2 flex items-center justify-center gap-2">
        <MonitorCog size={28} />
        <span className="text-xl font-bold">D-Tech</span>
      </div>
      <p className="text-muted text-center text-sm">Đăng nhập vào trang quản trị</p>

      <TextField
        name="username"
        control={control}
        label="Tên đăng nhập"
        required
        placeholder="admin"
        rules={{ required: "Vui lòng nhập tên đăng nhập" }}
      />
      <TextField
        name="password"
        control={control}
        label="Mật khẩu"
        type="password"
        required
        placeholder="••••••••"
        rules={{ required: "Vui lòng nhập mật khẩu" }}
      />
      <SwitchField
        name="remember"
        control={control}
        label="Ghi nhớ đăng nhập"
        checkedLabel="Có"
        uncheckedLabel="Không"
        helpText="Tắt thì phiên chỉ tồn tại đến khi đóng trình duyệt"
      />

      <Button type="primary" htmlType="submit" block loading={submitting} className="mt-2">
        Đăng nhập
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="bg-page flex min-h-screen items-center justify-center p-4">
      {/* useSearchParams cần Suspense boundary khi prerender */}
      <Suspense fallback={<Spin size="large" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
