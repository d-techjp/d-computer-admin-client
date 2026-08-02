"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  App,
  Avatar,
  Button,
  Input,
  Popconfirm,
  Select,
  Space,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { AdminStatusTag } from "@/components/common/StatusTag";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import routes from "@/config/routes";
import { useListQuery } from "@/hooks/useListQuery";
import { matchEquals, matchText } from "@/lib/fakeFetch";
import { adminRoleOptions, adminUsers } from "@/mock/admin-users";
import {
  ADMIN_USER_STATUS_LABEL,
  type AdminUser,
  type AdminUserStatus,
} from "@/types/admin-user";

interface AdminUserFilters {
  keyword: string;
  roleId?: string;
  status?: AdminUserStatus;
}

const STATUS_OPTIONS = Object.entries(ADMIN_USER_STATUS_LABEL).map(
  ([value, label]) => ({ label, value }),
);

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Trang "Quản trị viên" giờ chỉ còn danh sách tài khoản + role của họ (chỉ
 * đọc, chọn role có sẵn từ trang Quản lý quyền). Tạo mới và chỉnh sửa nằm ở
 * các trang riêng (`AdminUserForm`), không còn dùng Modal như trước.
 */
export default function AdminUsersPage() {
  const { message } = App.useApp();

  const { rows, loading, filters, patchFilters, search, reset, pagination } =
    useListQuery<AdminUser, AdminUserFilters>({
      source: adminUsers,
      initialFilters: { keyword: "" },
      buildFilters: (f) => [
        matchText(f.keyword, (item) => [item.name, item.email]),
        matchEquals(f.roleId, (item) => item.roleId),
        matchEquals(f.status, (item) => item.status),
      ],
      sorter: (a, b) => b.createdAt.localeCompare(a.createdAt),
    });

  const columns = useMemo<ColumnsType<AdminUser>>(
    () => [
      {
        title: "Quản trị viên",
        dataIndex: "name",
        fixed: "left",
        width: 260,
        render: (name: string, record) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar size={32} className="shrink-0 text-xs font-semibold">
              {initialsOf(name)}
            </Avatar>
            <div className="min-w-0">
              <Link
                href={routes.users.admins.detail(record.id)}
                className="line-clamp-1 font-semibold"
              >
                {name}
              </Link>
              <div className="text-muted truncate text-xs">{record.email}</div>
            </div>
          </div>
        ),
      },
      {
        title: "Nhóm quyền",
        dataIndex: "roleName",
        width: 200,
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        width: 140,
        align: "center",
        render: (status: AdminUserStatus) => <AdminStatusTag status={status} />,
      },
      {
        title: "Đăng nhập gần nhất",
        dataIndex: "lastLoginAt",
        width: 170,
        sorter: (a, b) => a.lastLoginAt.localeCompare(b.lastLoginAt),
        render: (value: string) => dayjs(value).format("HH:mm DD/MM/YYYY"),
      },
      {
        title: "Ngày tạo",
        dataIndex: "createdAt",
        width: 130,
        render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 100,
        align: "center",
        fixed: "right",
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="Sửa">
              <Link href={routes.users.admins.detail(record.id)}>
                <Button type="text" size="small" icon={<Pencil size={16} />} />
              </Link>
            </Tooltip>
            <Popconfirm
              title="Xoá quản trị viên này?"
              description="Thao tác không thể hoàn tác."
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
              onConfirm={() => message.success(`Đã xoá tài khoản ${record.name}`)}
            >
              <Tooltip title="Xoá">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<Trash2 size={16} />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [message],
  );

  return (
    <>
      <PageHeader
        title="Quản trị viên"
        description="Danh sách tài khoản quản trị hệ thống và nhóm quyền của từng người"
        extra={
          <Link href={routes.users.admins.new}>
            <Button type="primary" icon={<Plus size={16} />}>
              Thêm quản trị viên
            </Button>
          </Link>
        }
      />

      <SearchFilterBar onSearch={search} onReset={reset} loading={loading}>
        <FormItemLayout label="Tên hoặc email">
          <Input
            allowClear
            placeholder="Nhập tên hoặc email"
            value={filters.keyword}
            onChange={(event) => patchFilters({ keyword: event.target.value })}
          />
        </FormItemLayout>

        <FormItemLayout label="Nhóm quyền">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Tất cả nhóm quyền"
            options={adminRoleOptions}
            value={filters.roleId}
            onChange={(roleId) => patchFilters({ roleId })}
            className="w-full"
          />
        </FormItemLayout>

        <FormItemLayout label="Trạng thái">
          <Select
            allowClear
            placeholder="Tất cả trạng thái"
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(status) => patchFilters({ status })}
            className="w-full"
          />
        </FormItemLayout>
      </SearchFilterBar>

      <DataTable<AdminUser>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={pagination}
      />
    </>
  );
}
