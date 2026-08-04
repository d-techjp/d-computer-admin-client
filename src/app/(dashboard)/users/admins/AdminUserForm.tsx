"use client";

import { useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { App, Button, Tooltip } from "antd";
import { Dices } from "lucide-react";
import { useForm } from "react-hook-form";

import { PageHeader } from "@/components/common/PageHeader";
import { SelectField, SwitchField, TextField } from "@/components/form/fields";
import routes from "@/config/routes";
import { fetchRoleOptions, roleOptionsToSelectOptions } from "@/lib/api/roles";
import { assignUserRole, createUser, fetchUser, toAdminUser, updateUser } from "@/lib/api/users";
import { generatePassword } from "@/lib/utils";
import type { AdminUser } from "@/types/admin-user";
import type { SelectOption } from "@/types/common";

interface AdminUserFormValues {
  username: string;
  name: string;
  email?: string;
  phone?: string;
  roleCode?: string;
  active: boolean;
  password: string;
  confirmPassword: string;
}

function toFormValues(user?: AdminUser): AdminUserFormValues {
  return {
    username: user?.username ?? "",
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    roleCode: user?.roleCode,
    active: user ? user.status === "active" : true,
    password: "",
    confirmPassword: "",
  };
}

interface AdminUserFormProps {
  userId?: string;
}

export function AdminUserForm({ userId }: AdminUserFormProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const [user, setUser] = useState<AdminUser | undefined>();
  const [loading, setLoading] = useState(!!userId);
  const [notFoundState, setNotFoundState] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [roleOptions, setRoleOptions] = useState<SelectOption[]>([]);

  const isEdit = !!userId;

  const { control, handleSubmit, reset, setValue } = useForm<AdminUserFormValues>({
    defaultValues: toFormValues(user),
  });

  useEffect(() => {
    fetchRoleOptions()
      .then((options) =>
        setRoleOptions(
          roleOptionsToSelectOptions(options.filter((role) => role.code !== "customer")),
        ),
      )
      .catch(() => setRoleOptions([]));
  }, []);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    fetchUser(userId)
      .then((record) => {
        if (cancelled) return;
        const nextUser = toAdminUser(record);
        setUser(nextUser);
        reset(toFormValues(nextUser));
      })
      .catch((error) => {
        if (cancelled) return;
        if (error && typeof error === "object" && "status" in error && error.status === 404) {
          setNotFoundState(true);
          return;
        }
        message.error(error instanceof Error ? error.message : "Không tải được quản trị viên");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [message, reset, userId]);

  if (notFoundState) notFound();

  const fillRandomPassword = () => {
    const generated = generatePassword();
    setValue("password", generated, { shouldValidate: true });
    setValue("confirmPassword", generated, { shouldValidate: true });
    message.info("Đã tạo mật khẩu ngẫu nhiên, hãy sao chép trước khi lưu");
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const status = values.active ? "active" : "inactive";

      if (isEdit && userId) {
        await updateUser(userId, {
          username: values.username,
          email: values.email,
          fullName: values.name,
          phone: values.phone,
          status,
        });
        if (values.roleCode && values.roleCode !== user?.roleCode) {
          await assignUserRole(userId, values.roleCode);
        }
        message.success("Đã cập nhật quản trị viên");
      } else {
        await createUser({
          username: values.username,
          email: values.email,
          password: values.password,
          fullName: values.name,
          phone: values.phone,
          roleCode: values.roleCode,
          status,
        });
        message.success("Đã tạo quản trị viên mới");
      }

      router.push(routes.users.admins.index);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không lưu được quản trị viên");
    } finally {
      setSubmitting(false);
    }
  });

  const restore = () => reset(toFormValues(user));

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        title={isEdit ? "Chỉnh sửa quản trị viên" : "Thêm quản trị viên"}
        description={
          isEdit
            ? user
              ? `Cập nhật thông tin cho ${user.name}`
              : "Đang tải thông tin quản trị viên"
            : "Tạo tài khoản đăng nhập mới cho quản trị viên"
        }
        breadcrumb={[
          { label: "Quản trị viên", href: routes.users.admins.index },
          { label: isEdit ? "Chỉnh sửa" : "Thêm mới" },
        ]}
        extra={
          <>
            <Button onClick={restore} disabled={submitting || loading}>
              Khôi phục
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={loading}>
              {isEdit ? "Lưu thay đổi" : "Tạo tài khoản"}
            </Button>
          </>
        }
      />

      <div className="mx-auto max-w-2xl space-y-4">
        <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
          <h3 className="text-fg font-semibold">Thông tin tài khoản</h3>

          <TextField
            name="username"
            control={control}
            label="Username"
            required
            disabled={loading}
            placeholder="VD: staff01"
            rules={{ required: "Vui lòng nhập username" }}
          />
          <TextField
            name="name"
            control={control}
            label="Họ và tên"
            required
            disabled={loading}
            placeholder="VD: Trần Hữu Phước"
            rules={{ required: "Vui lòng nhập họ tên" }}
          />
          <TextField
            name="email"
            control={control}
            label="Email"
            disabled={loading}
            placeholder="VD: staff01@d-computer.vn"
            rules={{
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Email không hợp lệ",
              },
            }}
          />
          <TextField
            name="phone"
            control={control}
            label="Số điện thoại"
            disabled={loading}
            placeholder="VD: 0901234567"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              name="roleCode"
              control={control}
              label="Nhóm quyền"
              required
              disabled={loading}
              options={roleOptions}
              rules={{ required: "Vui lòng chọn nhóm quyền" }}
            />
            <SwitchField
              name="active"
              control={control}
              label="Trạng thái"
              checkedLabel="Đang hoạt động"
              uncheckedLabel="Ngừng hoạt động"
              disabled={loading}
            />
          </div>
        </section>

        {!isEdit && (
          <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-fg font-semibold">Mật khẩu đăng nhập</h3>
              <Tooltip title="Tạo mật khẩu ngẫu nhiên">
                <Button size="small" icon={<Dices size={14} />} onClick={fillRandomPassword}>
                  Tạo tự động
                </Button>
              </Tooltip>
            </div>

            <TextField
              name="password"
              control={control}
              label="Mật khẩu"
              type="password"
              required
              placeholder="Tối thiểu 6 ký tự"
              rules={{
                required: "Vui lòng nhập mật khẩu",
                minLength: { value: 6, message: "Mật khẩu cần tối thiểu 6 ký tự" },
              }}
            />
            <TextField
              name="confirmPassword"
              control={control}
              label="Xác nhận mật khẩu"
              type="password"
              required
              placeholder="Nhập lại mật khẩu ở trên"
              rules={{
                required: "Vui lòng xác nhận mật khẩu",
                validate: (value, formValues) =>
                  value === formValues.password || "Mật khẩu xác nhận không khớp",
              }}
            />
          </section>
        )}
      </div>
    </form>
  );
}

export default AdminUserForm;
