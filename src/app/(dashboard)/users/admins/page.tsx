"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { App, Avatar, Button, Input, Popconfirm, Select, Space, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { AdminStatusTag } from "@/components/common/StatusTag";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import routes from "@/config/routes";
import { fetchRoleOptions, roleOptionsToSelectOptions } from "@/lib/api/roles";
import { deleteUser, listAdminUsers } from "@/lib/api/users";
import {
  ADMIN_USER_STATUS_LABEL,
  type AdminUser,
  type AdminUserStatus,
} from "@/types/admin-user";
import { DEFAULT_PAGE_SIZE, type SelectOption } from "@/types/common";

interface AdminUserFilters {
  keyword: string;
  roleCode?: string;
  status?: AdminUserStatus;
}

const STATUS_OPTIONS = Object.entries(ADMIN_USER_STATUS_LABEL).map(([value, label]) => ({
  label,
  value,
}));

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AdminUsersPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AdminUserFilters>({ keyword: "" });
  const [appliedFilters, setAppliedFilters] = useState<AdminUserFilters>({ keyword: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [roleOptions, setRoleOptions] = useState<SelectOption[]>([]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listAdminUsers({
        page,
        limit: pageSize,
        search: appliedFilters.keyword,
        roleCode: appliedFilters.roleCode,
        status: appliedFilters.status,
        sortBy: "createdAt",
        sortOrder: "DESC",
      });
      setRows(response.data);
      setTotal(response.total);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tải được danh sách quản trị viên");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, message, page, pageSize]);

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
    queueMicrotask(() => void loadRows());
  }, [loadRows]);

  const patchFilters = (patch: Partial<AdminUserFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  };

  const search = () => {
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const reset = () => {
    const next = { keyword: "" };
    setPage(1);
    setFilters(next);
    setAppliedFilters(next);
  };

  const handleDelete = async (record: AdminUser) => {
    try {
      await deleteUser(record.id);
      message.success(`Đã xoá tài khoản ${record.name}`);
      await loadRows();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không xoá được quản trị viên");
    }
  };

  const columns = useMemo<ColumnsType<AdminUser>>(
    () => [
      {
        title: "Quản trị viên",
        dataIndex: "name",
        fixed: "left",
        width: 260,
        render: (name: string, record) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar size={32} src={record.avatarUrl} className="shrink-0 text-xs font-semibold">
              {initialsOf(name || record.username)}
            </Avatar>
            <div className="min-w-0">
              <Link href={routes.users.admins.detail(record.id)} className="line-clamp-1 font-semibold">
                {name || record.username}
              </Link>
              <div className="text-muted truncate text-xs">{record.email ?? record.username}</div>
            </div>
          </div>
        ),
      },
      { title: "Nhóm quyền", dataIndex: "roleName", width: 200 },
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
        render: (value?: string) => (value ? dayjs(value).format("HH:mm DD/MM/YYYY") : "—"),
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
              onConfirm={() => handleDelete(record)}
            >
              <Tooltip title="Xoá">
                <Button type="text" size="small" danger icon={<Trash2 size={16} />} />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
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
            options={roleOptions}
            value={filters.roleCode}
            onChange={(roleCode) => patchFilters({ roleCode })}
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
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          },
        }}
      />
    </>
  );
}
