"use client";

import { useMemo, useState } from "react";
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
import { useListQuery } from "@/hooks/useListQuery";
import { fakeMutate, matchText } from "@/lib/fakeFetch";
import { formatNumber } from "@/lib/utils";
import { adminRoles, adminUsers, ALL_PERMISSIONS } from "@/mock/admin-users";
import {
  PERMISSION_LABEL,
  type AdminRole,
  type AdminUser,
  type Permission,
} from "@/types/admin-user";

interface RoleFilters {
  keyword: string;
}

interface RoleFormValues {
  name: string;
  description: string;
  permissions: Permission[];
}

/** Gom quyền theo phân hệ để checkbox group đọc dễ hơn danh sách phẳng */
const PERMISSION_GROUPS: { title: string; items: Permission[] }[] = [
  { title: "Tổng quan", items: ["dashboard:view"] },
  { title: "Sản phẩm", items: ["product:view", "product:edit"] },
  { title: "Đơn hàng", items: ["order:view", "order:edit"] },
  { title: "Khách hàng", items: ["customer:view", "customer:edit"] },
  { title: "Kho", items: ["warehouse:view", "warehouse:edit"] },
  { title: "Bài viết", items: ["post:view", "post:edit"] },
  { title: "Hệ thống", items: ["admin:manage"] },
];

const memberColumns: ColumnsType<AdminUser> = [
  { title: "Họ tên", dataIndex: "name" },
  { title: "Email", dataIndex: "email" },
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
    render: (value: string) => dayjs(value).format("HH:mm DD/MM/YYYY"),
  },
];

/**
 * Trang quản lý quyền — nơi duy nhất tạo/sửa/xoá nhóm quyền (role). Trang
 * "Quản trị viên" chỉ còn hiển thị danh sách tài khoản và role của họ, không
 * còn CRUD role ở đó nữa.
 */
export default function RolesPage() {
  const { message } = App.useApp();
  const [editing, setEditing] = useState<AdminRole | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewingMembers, setViewingMembers] = useState<AdminRole | null>(null);

  const { rows, loading, filters, patchFilters, search, reset, pagination } =
    useListQuery<AdminRole, RoleFilters>({
      source: adminRoles,
      initialFilters: { keyword: "" },
      buildFilters: (f) => [
        matchText(f.keyword, (item) => [item.name, item.description]),
      ],
      sorter: (a, b) => b.permissions.length - a.permissions.length,
    });

  const {
    control,
    handleSubmit,
    reset: resetForm,
  } = useForm<RoleFormValues>({
    defaultValues: { name: "", description: "", permissions: [] },
  });

  const openModal = (role?: AdminRole) => {
    setEditing(role ?? null);
    resetForm({
      name: role?.name ?? "",
      description: role?.description ?? "",
      permissions: role?.permissions ?? [],
    });
    setModalOpen(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    await fakeMutate(values);
    setSubmitting(false);
    setModalOpen(false);
    message.success(
      editing ? `Đã cập nhật quyền ${values.name}` : "Đã tạo nhóm quyền mới",
    );
  });

  const columns = useMemo<ColumnsType<AdminRole>>(
    () => [
      {
        title: "Tên nhóm quyền",
        dataIndex: "name",
        width: 200,
        render: (name: string, record) => (
          <div className="min-w-0">
            <div className="font-semibold">{name}</div>
            <div className="text-muted truncate text-xs">
              {record.description}
            </div>
          </div>
        ),
      },
      {
        title: "Quyền",
        dataIndex: "permissions",
        width: 320,
        render: (permissions: Permission[]) => (
          <Space size={[4, 4]} wrap>
            {permissions.slice(0, 4).map((permission) => (
              <Tag key={permission}>{PERMISSION_LABEL[permission]}</Tag>
            ))}
            {permissions.length > 4 && (
              <Tag color="blue">+{permissions.length - 4}</Tag>
            )}
          </Space>
        ),
      },
      {
        title: "Số quản trị viên",
        dataIndex: "memberCount",
        width: 140,
        align: "right",
        sorter: (a, b) => a.memberCount - b.memberCount,
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
              <Button
                type="text"
                size="small"
                icon={<Users size={16} />}
                onClick={() => setViewingMembers(record)}
              />
            </Tooltip>
            <Tooltip title="Sửa quyền">
              <Button
                type="text"
                size="small"
                icon={<Pencil size={16} />}
                onClick={() => openModal(record)}
              />
            </Tooltip>
            <Popconfirm
              title="Xoá nhóm quyền này?"
              description={
                record.memberCount > 0
                  ? `Đang có ${record.memberCount} quản trị viên thuộc nhóm này.`
                  : "Thao tác không thể hoàn tác."
              }
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true, disabled: record.memberCount > 0 }}
              onConfirm={() => message.success(`Đã xoá nhóm quyền ${record.name}`)}
            >
              <Tooltip
                title={
                  record.memberCount > 0
                    ? "Không thể xoá khi còn quản trị viên thuộc nhóm"
                    : "Xoá"
                }
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  disabled={record.memberCount > 0}
                  icon={<Trash2 size={16} />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [message],
  );

  const members = viewingMembers
    ? adminUsers.filter((user) => user.roleId === viewingMembers.id)
    : [];

  return (
    <>
      <PageHeader
        title="Quản lý quyền"
        description="Tạo và phân quyền cho từng nhóm quản trị viên"
        extra={
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => openModal()}
          >
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
            onChange={(event) => patchFilters({ keyword: event.target.value })}
          />
        </FormItemLayout>
      </SearchFilterBar>

      <DataTable<AdminRole>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={pagination}
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
            name="name"
            control={control}
            label="Tên nhóm quyền"
            required
            rules={{ required: "Vui lòng nhập tên nhóm quyền" }}
          />
          <TextAreaField
            name="description"
            control={control}
            label="Mô tả"
            rows={2}
          />

          <Controller
            name="permissions"
            control={control}
            render={({ field }) => (
              <FormItemLayout
                label="Quyền truy cập"
                helpText={`Đã chọn ${field.value.length}/${ALL_PERMISSIONS.length} quyền`}
              >
                <Checkbox.Group
                  value={field.value}
                  onChange={field.onChange}
                  className="w-full"
                >
                  <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                    {PERMISSION_GROUPS.map((group) => (
                      <div
                        key={group.title}
                        className="border-line rounded-md border p-3"
                      >
                        <div className="text-muted mb-2 text-xs font-semibold uppercase">
                          {group.title}
                        </div>
                        <div className="flex flex-col gap-1">
                          {group.items.map((permission) => (
                            <Checkbox key={permission} value={permission}>
                              {PERMISSION_LABEL[permission]}
                            </Checkbox>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Checkbox.Group>
              </FormItemLayout>
            )}
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
          pagination={false}
          scroll={{ y: 320 }}
        />
      </Modal>
    </>
  );
}
