"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Avatar, Button, Descriptions, Drawer, Input, Select, Spin, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Eye } from "lucide-react";

import {
  ActivityActionTag,
  ActivityResourceTag,
  ActivityStatusTag,
} from "@/components/common/ActivityTag";
import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import {
  DatePickerPresetRange,
  DEFAULT_DATE_RANGE,
  type DateRangeSearchValue,
} from "@/components/form/DatePickerPresetRange";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import { fetchActivityLog, listActivityLogs } from "@/lib/api/activityLogs";
import { listAdminUsers } from "@/lib/api/users";
import {
  ACTIVITY_ACTION_LABEL,
  ACTIVITY_RESOURCE_LABEL,
  ACTIVITY_STATUS_LABEL,
  type ActivityChange,
  type ActivityLog,
  type ActivityStatus,
} from "@/types/activity-log";
import { DEFAULT_PAGE_SIZE, type SelectOption } from "@/types/common";

interface LogFilters {
  keyword: string;
  userId?: string;
  action?: string;
  resource?: string;
  status?: ActivityStatus;
  dateRange: DateRangeSearchValue;
}

const DEFAULT_FILTERS: LogFilters = { keyword: "", dateRange: DEFAULT_DATE_RANGE };

const ACTION_OPTIONS: SelectOption[] = Object.entries(ACTIVITY_ACTION_LABEL).map(
  ([value, label]) => ({ label, value }),
);
const RESOURCE_OPTIONS: SelectOption[] = Object.entries(ACTIVITY_RESOURCE_LABEL).map(
  ([value, label]) => ({ label, value }),
);
const STATUS_OPTIONS: SelectOption[] = Object.entries(ACTIVITY_STATUS_LABEL).map(
  ([value, label]) => ({ label, value }),
);

const changeColumns: ColumnsType<ActivityChange> = [
  { title: "Trường", dataIndex: "field", width: 140 },
  {
    title: "Giá trị cũ",
    dataIndex: "before",
    render: (value: string) => <span className="text-muted line-through">{value}</span>,
  },
  {
    title: "Giá trị mới",
    dataIndex: "after",
    render: (value: string) => <span className="font-medium">{value}</span>,
  },
];

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Tra cứu nhật ký hoạt động (`GET /activity-logs`).
 *
 * Log chỉ đọc và tăng rất nhanh nên mọi bộ lọc đều chạy ở server, mặc định
 * giới hạn 30 ngày gần nhất. Drawer chi tiết gọi thêm `GET /activity-logs/{id}`
 * vì bản ghi đầy đủ (metadata, user-agent, các trường đã đổi) có thể không nằm
 * hết trong response danh sách — dòng đang chọn được dùng làm nội dung tạm để
 * drawer không trống trong lúc chờ.
 */
export default function ActivityLogsPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LogFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<LogFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = useState<ActivityLog>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [actorOptions, setActorOptions] = useState<SelectOption[]>([]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listActivityLogs({
        page,
        limit: pageSize,
        search: appliedFilters.keyword,
        userId: appliedFilters.userId,
        action: appliedFilters.action,
        resource: appliedFilters.resource,
        status: appliedFilters.status,
        from: appliedFilters.dateRange.from,
        to: appliedFilters.dateRange.to,
        sortBy: "createdAt",
        sortOrder: "DESC",
      });
      setRows(response.data);
      setTotal(response.total);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tải được nhật ký");
    } finally {
      setLoading(false);
    }
  }, [
    appliedFilters.action,
    appliedFilters.dateRange.from,
    appliedFilters.dateRange.to,
    appliedFilters.keyword,
    appliedFilters.resource,
    appliedFilters.status,
    appliedFilters.userId,
    message,
    page,
    pageSize,
  ]);

  useEffect(() => {
    queueMicrotask(() => void loadRows());
  }, [loadRows]);

  // Dropdown người thực hiện: chỉ tài khoản quản trị mới sinh log ở đây
  useEffect(() => {
    queueMicrotask(() =>
      void listAdminUsers({ page: 1, limit: 100, sortBy: "fullName", sortOrder: "ASC" })
        .then((response) =>
          setActorOptions(
            response.data.map((user) => ({ label: user.name || user.username, value: user.id })),
          ),
        )
        .catch(() => {
          // Mất dropdown không chặn được việc tra cứu log bằng từ khoá
        }),
    );
  }, []);

  /** Mở drawer: hiện ngay dòng đang chọn rồi thay bằng bản ghi đầy đủ */
  const openDetail = async (log: ActivityLog) => {
    setSelected(log);
    setDetailLoading(true);
    try {
      setSelected(await fetchActivityLog(log.id));
    } catch {
      // Không lấy được bản đầy đủ thì vẫn xem được phần đã có ở danh sách
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = useMemo<ColumnsType<ActivityLog>>(
    () => [
      {
        title: "Thời gian",
        dataIndex: "createdAt",
        fixed: "left",
        width: 160,
        render: (value: string) => dayjs(value).format("HH:mm:ss DD/MM/YYYY"),
      },
      {
        title: "Người thực hiện",
        dataIndex: "userName",
        width: 220,
        render: (name: string, record) => (
          <div className="flex min-w-0 items-center gap-2">
            <Avatar size={28} className="shrink-0 text-xs font-semibold">
              {initialsOf(name)}
            </Avatar>
            <div className="min-w-0">
              <div className="truncate font-medium">{name}</div>
              <div className="text-muted truncate text-xs">
                {record.userRole || record.userEmail || "—"}
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Thao tác",
        dataIndex: "action",
        width: 150,
        align: "center",
        render: (action: string) => <ActivityActionTag action={action} />,
      },
      {
        title: "Đối tượng",
        dataIndex: "resource",
        width: 130,
        align: "center",
        render: (resource: string) => <ActivityResourceTag resource={resource} />,
      },
      {
        title: "Nội dung",
        dataIndex: "description",
        width: 340,
        ellipsis: true,
        render: (value: string | undefined, record) => value || record.resourceId || "—",
      },
      {
        title: "Kết quả",
        dataIndex: "status",
        width: 120,
        align: "center",
        render: (status: ActivityStatus) => <ActivityStatusTag status={status} />,
      },
      {
        title: "",
        key: "actions",
        width: 60,
        align: "center",
        fixed: "right",
        render: (_, record) => (
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              size="small"
              icon={<Eye size={16} />}
              onClick={() => void openDetail(record)}
            />
          </Tooltip>
        ),
      },
    ],
    [],
  );

  const search = () => {
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const reset = () => {
    setPage(1);
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  };

  const patchFilters = (patch: Partial<LogFilters>) =>
    setFilters((current) => ({ ...current, ...patch }));

  return (
    <>
      <PageHeader
        title="Nhật ký hoạt động"
        description="Ghi nhận mọi thao tác của quản trị viên trên hệ thống"
      />

      <SearchFilterBar onSearch={search} onReset={reset} loading={loading}>
        <FormItemLayout label="Nội dung / IP / đối tượng">
          <Input
            allowClear
            placeholder="Nhập từ khoá tìm kiếm"
            value={filters.keyword}
            onChange={(event) => patchFilters({ keyword: event.target.value })}
          />
        </FormItemLayout>

        <FormItemLayout label="Người thực hiện">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Tất cả quản trị viên"
            options={actorOptions}
            value={filters.userId}
            onChange={(userId?: string) => patchFilters({ userId })}
            className="w-full"
          />
        </FormItemLayout>

        <FormItemLayout label="Thao tác">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Tất cả thao tác"
            options={ACTION_OPTIONS}
            value={filters.action}
            onChange={(action?: string) => patchFilters({ action })}
            className="w-full"
          />
        </FormItemLayout>

        <FormItemLayout label="Đối tượng">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Tất cả đối tượng"
            options={RESOURCE_OPTIONS}
            value={filters.resource}
            onChange={(resource?: string) => patchFilters({ resource })}
            className="w-full"
          />
        </FormItemLayout>

        <FormItemLayout label="Kết quả">
          <Select
            allowClear
            placeholder="Tất cả kết quả"
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(status?: ActivityStatus) => patchFilters({ status })}
            className="w-full"
          />
        </FormItemLayout>

        <DatePickerPresetRange
          label="Thời gian"
          value={filters.dateRange}
          onChange={(dateRange) => patchFilters({ dateRange })}
        />
      </SearchFilterBar>

      <DataTable<ActivityLog>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        emptyText="Không có bản ghi nào khớp bộ lọc"
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

      <Drawer
        title="Chi tiết nhật ký"
        open={!!selected}
        onClose={() => setSelected(undefined)}
        width={560}
      >
        {selected && (
          <Spin spinning={detailLoading}>
            <div className="space-y-4">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Thời gian">
                  {dayjs(selected.createdAt).format("HH:mm:ss DD/MM/YYYY")}
                </Descriptions.Item>
                <Descriptions.Item label="Người thực hiện">
                  {selected.userName}
                </Descriptions.Item>
                {selected.userEmail && (
                  <Descriptions.Item label="Email">{selected.userEmail}</Descriptions.Item>
                )}
                {selected.userRole && (
                  <Descriptions.Item label="Vai trò">{selected.userRole}</Descriptions.Item>
                )}
                <Descriptions.Item label="Thao tác">
                  <ActivityActionTag action={selected.action} />
                </Descriptions.Item>
                <Descriptions.Item label="Đối tượng">
                  <ActivityResourceTag resource={selected.resource} />
                </Descriptions.Item>
                {selected.resourceId && (
                  <Descriptions.Item label="Id đối tượng">
                    <code className="text-xs">{selected.resourceId}</code>
                  </Descriptions.Item>
                )}
                {selected.description && (
                  <Descriptions.Item label="Nội dung">{selected.description}</Descriptions.Item>
                )}
                <Descriptions.Item label="Kết quả">
                  <ActivityStatusTag status={selected.status} />
                </Descriptions.Item>
                {selected.errorMessage && (
                  <Descriptions.Item label="Lỗi">
                    <span className="text-danger">{selected.errorMessage}</span>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Địa chỉ IP">
                  {selected.ipAddress || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Thiết bị">
                  {selected.userAgent || "—"}
                </Descriptions.Item>
              </Descriptions>

              {selected.changes.length > 0 && (
                <div>
                  <h4 className="text-fg mb-2 font-semibold">Các trường đã thay đổi</h4>
                  <Table<ActivityChange>
                    rowKey="field"
                    size="small"
                    columns={changeColumns}
                    dataSource={selected.changes}
                    pagination={false}
                  />
                </div>
              )}

              {selected.metadata && (
                <div>
                  <h4 className="text-fg mb-2 font-semibold">Dữ liệu kèm theo</h4>
                  <pre className="bg-subtle border-line max-h-64 overflow-auto rounded-lg border p-3 text-xs">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </Spin>
        )}
      </Drawer>
    </>
  );
}
