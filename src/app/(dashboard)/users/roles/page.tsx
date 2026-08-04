"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Checkbox,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { AdminStatusTag } from "@/components/common/StatusTag";
import { TextAreaField, TextField } from "@/components/form/fields";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import {
  createRole,
  deleteRole,
  fetchPermissionGroups,
  listRoles,
  updateRole,
  type PermissionGroupOption,
} from "@/lib/api/roles";
import { listAdminUsers } from "@/lib/api/users";
import { formatNumber } from "@/lib/utils";
import {
  PERMISSION_LABEL,
  type AdminRole,
  type AdminUser,
  type Permission,
} from "@/types/admin-user";
import { DEFAULT_PAGE_SIZE } from "@/types/common";

interface RoleFilters {
  keyword: string;
}

interface RoleFormValues {
  code: string;
  name: string;
  description: string;
  permissions: Permission[];
}

const memberColumns: ColumnsType<AdminUser> = [
  { title: "Họ tên", dataIndex: "name" },
  {
    title: "Email",
    dataIndex: "email",
    render: (value: string | undefined, record) => value ?? record.username,
  },
  {
    title: "Trạng thái",
    dataIndex: "status",
    width: 140,
    align: "center",
    render: (status: AdminUser["status"]) => <AdminStatusTag status={status} />,
  },
  {
    title: "Đăng nhập gần nhất",
    dataIndex: "lastLoginAt",
    width: 170,
    render: (value?: string) => (value ? dayjs(value).format("HH:mm DD/MM/YYYY") : "—"),
  },
];

function permissionLabel(code: string, groups: PermissionGroupOption[]) {
  const permission = groups
    .flatMap((group) => group.permissions)
    .find((item) => item.code === code);
  return permission?.name ?? PERMISSION_LABEL[code] ?? code;
}

function moduleTitle(module: string) {
  return module || "Khác";
}

export default function RolesPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<AdminRole[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<RoleFilters>({ keyword: "" });
  const [appliedFilters, setAppliedFilters] = useState<RoleFilters>({ keyword: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [editing, setEditing] = useState<AdminRole | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewingMembers, setViewingMembers] = useState<AdminRole | null>(null);
  const [members, setMembers] = useState<AdminUser[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroupOption[]>([]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listRoles({
        page,
        limit: pageSize,
        search: appliedFilters.keyword,
        sortBy: "createdAt",
        sortOrder: "DESC",
      });
      setRows(response.data);
      setTotal(response.total);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tải được danh sách nhóm quyền");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters.keyword, message, page, pageSize]);

  useEffect(() => {
    queueMicrotask(() => void loadRows());
  }, [loadRows]);

  useEffect(() => {
    fetchPermissionGroups()
      .then(setPermissionGroups)
      .catch(() => setPermissionGroups([]));
  }, []);

  const { control, handleSubmit, reset: resetForm } = useForm<RoleFormValues>({
    defaultValues: { code: "", name: "", description: "", permissions: [] },
  });

  const openModal = (role?: AdminRole) => {
    setEditing(role ?? null);
    resetForm({
      code: role?.code ?? "",
      name: role?.name ?? "",
      description: role?.description ?? "",
      permissions: role?.permissions ?? [],
    });
    setModalOpen(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      if (editing) {
        await updateRole(editing.id, {
          name: values.name,
          description: values.description,
          permissionCodes: values.permissions,
        });
        message.success(`Đã cập nhật quyền ${values.name}`);
      } else {
        await createRole({
          code: values.code,
          name: values.name,
          description: values.description,
          permissionCodes: values.permissions,
        });
        message.success("Đã tạo nhóm quyền mới");
      }
      setModalOpen(false);
      await loadRows();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không lưu được nhóm quyền");
    } finally {
      setSubmitting(false);
    }
  });

  const handleDelete = async (record: AdminRole) => {
    try {
      await deleteRole(record.id);
      message.success(`Đã xoá nhóm quyền ${record.name}`);
      await loadRows();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không xoá được nhóm quyền");
    }
  };

  const openMembers = async (role: AdminRole) => {
    setViewingMembers(role);
    setMembers([]);
    setMembersLoading(true);
    try {
      const response = await listAdminUsers({
        page: 1,
        limit: 100,
        roleCode: role.code,
        sortBy: "createdAt",
        sortOrder: "DESC",
      });
      setMembers(response.data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tải được quản trị viên thuộc nhóm");
    } finally {
      setMembersLoading(false);
    }
  };

  const columns = useMemo<ColumnsType<AdminRole>>(
    () => [
      {
        title: "Tên nhóm quyền",
        dataIndex: "name",
        width: 220,
        render: (name: string, record) => (
          <div className="min-w-0">
            <div className="font-semibold">{name}</div>
            <div className="text-muted truncate text-xs">{record.description}</div>
            <div className="text-muted truncate text-xs">{record.code}</div>
          </div>
        ),
      },
      {
        title: "Quyền",
        dataIndex: "permissions",
        width: 360,
        render: (permissions: Permission[]) => (
          <Space size={[4, 4]} wrap>
            {permissions.slice(0, 4).map((permission) => (
              <Tag key={permission}>{permissionLabel(permission, permissionGroups)}</Tag>
            ))}
            {permissions.length > 4 && <Tag color="blue">+{permissions.length - 4}</Tag>}
          </Space>
        ),
      },
      {
        title: "Số quản trị viên",
        dataIndex: "memberCount",
        width: 140,
        align: "right",
        render: (value: number) => formatNumber(value),
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
        width: 130,
        align: "center",
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="Xem quản trị viên thuộc nhóm">
              <Button type="text" size="small" icon={<Users size={16} />} onClick={() => openMembers(record)} />
            </Tooltip>
            <Tooltip title="Sửa quyền">
              <Button type="text" size="small" icon={<Pencil size={16} />} onClick={() => openModal(record)} />
            </Tooltip>
            <Popconfirm
              title="Xoá nhóm quyền này?"
              description={
                record.memberCount > 0
                  ? `Đang có ${record.memberCount} quản trị viên thuộc nhóm này.`
                  : record.isSystem
                    ? "Role hệ thống không thể xoá."
                    : "Thao tác không thể hoàn tác."
              }
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true, disabled: record.memberCount > 0 || record.isSystem }}
              onConfirm={() => handleDelete(record)}
            >
              <Tooltip
                title={
                  record.isSystem
                    ? "Không thể xoá role hệ thống"
                    : record.memberCount > 0
                      ? "Không thể xoá khi còn quản trị viên thuộc nhóm"
                      : "Xoá"
                }
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  disabled={record.memberCount > 0 || record.isSystem}
                  icon={<Trash2 size={16} />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissionGroups],
  );

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

  return (
    <>
      <PageHeader
        title="Quản lý quyền"
        description="Tạo và phân quyền cho từng nhóm quản trị viên"
        extra={
          <Button type="primary" icon={<Plus size={16} />} onClick={() => openModal()}>
            Thêm nhóm quyền
          </Button>
        }
      />

      <SearchFilterBar onSearch={search} onReset={reset} loading={loading}>
        <FormItemLayout label="Tên nhóm quyền">
          <Input
            allowClear
            placeholder="Nhập tên hoặc mô tả nhóm quyền"
            value={filters.keyword}
            onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
          />
        </FormItemLayout>
      </SearchFilterBar>

      <DataTable<AdminRole>
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

      <Modal
        title={editing ? `Sửa quyền: ${editing.name}` : "Thêm nhóm quyền"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onSubmit}
        okText={editing ? "Lưu" : "Tạo nhóm quyền"}
        cancelText="Huỷ"
        confirmLoading={submitting}
        width={640}
        destroyOnHidden
      >
        <div className="space-y-4 pt-2">
          <TextField
            name="code"
            control={control}
            label="Mã nhóm quyền"
            required
            disabled={!!editing}
            placeholder="VD: content-editor"
            helpText={editing ? "Contract không cho đổi code sau khi tạo" : undefined}
            rules={{ required: "Vui lòng nhập mã nhóm quyền" }}
          />
          <TextField
            name="name"
            control={control}
            label="Tên nhóm quyền"
            required
            rules={{ required: "Vui lòng nhập tên nhóm quyền" }}
          />
          <TextAreaField name="description" control={control} label="Mô tả" rows={2} />

          <Controller
            name="permissions"
            control={control}
            render={({ field }) => {
              const permissionCount = permissionGroups.reduce(
                (sum, group) => sum + group.permissions.length,
                0,
              );

              return (
                <FormItemLayout
                  label="Quyền truy cập"
                  helpText={`Đã chọn ${field.value.length}/${permissionCount} quyền`}
                >
                  <Checkbox.Group value={field.value} onChange={field.onChange} className="w-full">
                    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                      {permissionGroups.map((group) => (
                        <div key={group.module} className="border-line rounded-md border p-3">
                          <div className="text-muted mb-2 text-xs font-semibold uppercase">
                            {moduleTitle(group.module)}
                          </div>
                          <div className="flex flex-col gap-1">
                            {group.permissions.map((permission) => (
                              <Checkbox key={permission.code} value={permission.code}>
                                {permission.name}
                              </Checkbox>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Checkbox.Group>
                </FormItemLayout>
              );
            }}
          />
        </div>
      </Modal>

      <Modal
        title={`Quản trị viên thuộc nhóm ${viewingMembers?.name ?? ""}`}
        open={!!viewingMembers}
        onCancel={() => setViewingMembers(null)}
        footer={null}
        width={720}
      >
        <Table<AdminUser>
          rowKey="id"
          size="small"
          columns={memberColumns}
          dataSource={members}
          loading={membersLoading}
          pagination={false}
          scroll={{ y: 320 }}
        />
      </Modal>
    </>
  );
}
