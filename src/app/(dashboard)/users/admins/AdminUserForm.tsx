"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Tooltip } from "antd";
import { Dices } from "lucide-react";
import { useForm } from "react-hook-form";

import { PageHeader } from "@/components/common/PageHeader";
import {
  SelectField,
  SwitchField,
  TextField,
} from "@/components/form/fields";
import routes from "@/config/routes";
import { fakeMutate } from "@/lib/fakeFetch";
import { generatePassword } from "@/lib/utils";
import { adminRoleOptions } from "@/mock/admin-users";
import type { AdminUser } from "@/types/admin-user";

interface AdminUserFormValues {
  name: string;
  email: string;
  roleId?: string;
  active: boolean;
  password: string;
  confirmPassword: string;
}

function toFormValues(user?: AdminUser): AdminUserFormValues {
  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    roleId: user?.roleId,
    active: user ? user.status === "active" : true,
    password: "",
    confirmPassword: "",
  };
}

interface AdminUserFormProps {
  user?: AdminUser;
}

/**
 * Form dùng chung cho tạo mới và chỉnh sửa quản trị viên. Mật khẩu chỉ áp
 * dụng khi tạo mới — trang chi tiết/sửa chỉ còn thông tin cơ bản và nhóm
 * quyền, đúng yêu cầu "trang quản trị viên chỉ hiển thị danh sách, role của
 * họ, và trang detail edit".
 */
export function AdminUserForm({ user }: AdminUserFormProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!user;

  const { control, handleSubmit, reset, setValue } =
    useForm<AdminUserFormValues>({
      defaultValues: toFormValues(user),
    });

  const fillRandomPassword = () => {
    const generated = generatePassword();
    setValue("password", generated, { shouldValidate: true });
    setValue("confirmPassword", generated, { shouldValidate: true });
    message.info("Đã tạo mật khẩu ngẫu nhiên, hãy sao chép trước khi lưu");
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    await fakeMutate(values);
    setSubmitting(false);
    message.success(
      isEdit ? "Đã cập nhật quản trị viên" : "Đã tạo quản trị viên mới",
    );
    router.push(routes.users.admins.index);
  });

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        title={isEdit ? "Chỉnh sửa quản trị viên" : "Thêm quản trị viên"}
        description={
          isEdit
            ? `Cập nhật thông tin cho ${user.name}`
            : "Tạo tài khoản đăng nhập mới cho quản trị viên"
        }
        breadcrumb={[
          { label: "Quản trị viên", href: routes.users.admins.index },
          { label: isEdit ? "Chỉnh sửa" : "Thêm mới" },
        ]}
        extra={
          <>
            <Button
              onClick={() => reset(toFormValues(user))}
              disabled={submitting}
            >
              Khôi phục
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {isEdit ? "Lưu thay đổi" : "Tạo tài khoản"}
            </Button>
          </>
        }
      />

      <div className="mx-auto max-w-2xl space-y-4">
        <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
          <h3 className="text-fg font-semibold">Thông tin tài khoản</h3>

          <TextField
            name="name"
            control={control}
            label="Họ và tên"
            required
            placeholder="VD: Trần Hữu Phước"
            rules={{ required: "Vui lòng nhập họ tên" }}
          />
          <TextField
            name="email"
            control={control}
            label="Email đăng nhập"
            required
            disabled={isEdit}
            placeholder="VD: staff01@d-computer.vn"
            helpText={isEdit ? "Không thể đổi email sau khi tạo tài khoản" : undefined}
            rules={{
              required: "Vui lòng nhập email",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Email không hợp lệ",
              },
            }}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              name="roleId"
              control={control}
              label="Nhóm quyền"
              required
              options={adminRoleOptions}
              rules={{ required: "Vui lòng chọn nhóm quyền" }}
            />
            <SwitchField
              name="active"
              control={control}
              label="Trạng thái"
              checkedLabel="Đang hoạt động"
              uncheckedLabel="Tạm khoá"
            />
          </div>
        </section>

        {!isEdit && (
          <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-fg font-semibold">Mật khẩu đăng nhập</h3>
              <Tooltip title="Tạo mật khẩu ngẫu nhiên">
                <Button
                  size="small"
                  icon={<Dices size={14} />}
                  onClick={fillRandomPassword}
                >
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
              placeholder="Tối thiểu 8 ký tự"
              rules={{
                required: "Vui lòng nhập mật khẩu",
                minLength: { value: 8, message: "Mật khẩu cần tối thiểu 8 ký tự" },
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
