"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button } from "antd";
import { MonitorCog } from "lucide-react";
import { useForm } from "react-hook-form";

import { SwitchField, TextField } from "@/components/form/fields";
import routes from "@/config/routes";
import { fakeMutate } from "@/lib/fakeFetch";

interface LoginFormValues {
  email: string;
  password: string;
  remember: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<LoginFormValues>({
    defaultValues: { email: "", password: "", remember: true },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    await fakeMutate(values);
    setSubmitting(false);
    message.success("Đăng nhập thành công");
    router.push(routes.dashboard);
  });

  return (
    <div className="bg-page flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="bg-card border-line shadow-card w-full max-w-sm space-y-4 rounded-lg border p-6"
      >
        <div className="text-brand mb-2 flex items-center justify-center gap-2">
          <MonitorCog size={28} />
          <span className="text-xl font-bold">D-Computer</span>
        </div>
        <p className="text-muted text-center text-sm">
          Đăng nhập vào trang quản trị
        </p>

        <TextField
          name="email"
          control={control}
          label="Email"
          required
          placeholder="admin@d-computer.vn"
          rules={{ required: "Vui lòng nhập email" }}
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
        />

        <Button
          type="primary"
          htmlType="submit"
          block
          loading={submitting}
          className="mt-2"
        >
          Đăng nhập
        </Button>
      </form>
    </div>
  );
}
