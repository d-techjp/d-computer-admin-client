"use client";

import { useMemo, useState } from "react";
import { Avatar, Button, Descriptions, Drawer, Input, Select, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Eye } from "lucide-react";

import {
  ActivityActionTag,
  ActivityModuleTag,
  ActivityResultTag,
} from "@/components/common/ActivityTag";
import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import {
  DatePickerPresetRange,
  resolvePreset,
  type DateRangeSearchValue,
} from "@/components/form/DatePickerPresetRange";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import { useListQuery } from "@/hooks/useListQuery";
import { matchDateRange, matchEquals, matchIncludes, matchText } from "@/lib/fakeFetch";
import { activityActorOptions, activityLogs } from "@/mock/activity-logs";
import {
  ACTIVITY_ACTION_LABEL,
  ACTIVITY_MODULE_LABEL,
  ACTIVITY_RESULT_LABEL,
  type ActivityAction,
  type ActivityChange,
  type ActivityLog,
  type ActivityModule,
  type ActivityResult,
} from "@/types/activity-log";

interface LogFilters {
  keyword: string;
  actorId?: string;
  actions: ActivityAction[];
  module?: ActivityModule;
  result?: ActivityResult;
  dateRange: DateRangeSearchValue;
}

const ACTION_OPTIONS = Object.entries(ACTIVITY_ACTION_LABEL).map(
  ([value, label]) => ({ label, value }),
);
const MODULE_OPTIONS = Object.entries(ACTIVITY_MODULE_LABEL).map(
  ([value, label]) => ({ label, value }),
);
const RESULT_OPTIONS = Object.entries(ACTIVITY_RESULT_LABEL).map(
  ([value, label]) => ({ label, value }),
);

const changeColumns: ColumnsType<ActivityChange> = [
  { title: "Trường", dataIndex: "field", width: 140 },
  {
    title: "Giá trị cũ",
    dataIndex: "before",
    render: (value: string) => (
      <span className="text-muted line-through">{value}</span>
    ),
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

export default function ActivityLogsPage() {
  const [selected, setSelected] = useState<ActivityLog | null>(null);

  const { rows, loading, filters, patchFilters, search, reset, pagination } =
    useListQuery<ActivityLog, LogFilters>({
      source: activityLogs,
      initialFilters: {
        keyword: "",
        actions: [],
        dateRange: resolvePreset("custom"),
      },
      buildFilters: (f) => [
        matchText(f.keyword, (item) => [
          item.description,
          item.actorName,
          item.actorEmail,
          item.targetLabel ?? "",
          item.ipAddress,
        ]),
        matchEquals(f.actorId, (item) => item.actorId),
        matchIncludes(f.actions, (item) => item.action),
        matchEquals(f.module, (item) => item.module),
        matchEquals(f.result, (item) => item.result),
        matchDateRange(
          f.dateRange.from,
          f.dateRange.to,
          (item) => item.createdAt,
        ),
      ],
    });

  const columns = useMemo<ColumnsType<ActivityLog>>(
    () => [
      {
        title: "Thời gian",
        dataIndex: "createdAt",
        fixed: "left",
        width: 160,
        sorter: (a, b) => a.createdAt.localeCompare(b.createdAt),
        render: (value: string) => dayjs(value).format("HH:mm:ss DD/MM/YYYY"),
      },
      {
        title: "Người thực hiện",
        dataIndex: "actorName",
        width: 220,
        render: (name: string, record) => (
          <div className="flex min-w-0 items-center gap-2">
            <Avatar size={28} className="shrink-0 text-xs font-semibold">
              {initialsOf(name)}
            </Avatar>
            <div className="min-w-0">
              <div className="truncate font-medium">{name}</div>
              <div className="text-muted truncate text-xs">
                {record.actorRole}
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Thao tác",
        dataIndex: "action",
        width: 140,
        align: "center",
        render: (action: ActivityAction) => (
          <ActivityActionTag action={action} />
        ),
      },
      {
        title: "Phân hệ",
        dataIndex: "module",
        width: 120,
        align: "center",
        render: (module: ActivityModule) => (
          <ActivityModuleTag module={module} />
        ),
      },
      {
        title: "Nội dung",
        dataIndex: "description",
        width: 340,
        ellipsis: true,
      },
      {
        title: "Địa chỉ IP",
        dataIndex: "ipAddress",
        width: 140,
      },
      {
        title: "Kết quả",
        dataIndex: "result",
        width: 120,
        align: "center",
        render: (result: ActivityResult) => (
          <ActivityResultTag result={result} />
        ),
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
              onClick={() => setSelected(record)}
            />
          </Tooltip>
        ),
      },
    ],
    [],
  );

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
            options={activityActorOptions}
            value={filters.actorId}
            onChange={(actorId) => patchFilters({ actorId })}
            className="w-full"
          />
        </FormItemLayout>

        <FormItemLayout label="Thao tác">
          <Select
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            placeholder="Tất cả thao tác"
            options={ACTION_OPTIONS}
            value={filters.actions}
            onChange={(actions) => patchFilters({ actions })}
            className="w-full"
          />
        </FormItemLayout>

        <FormItemLayout label="Phân hệ">
          <Select
            allowClear
            placeholder="Tất cả phân hệ"
            options={MODULE_OPTIONS}
            value={filters.module}
            onChange={(module) => patchFilters({ module })}
            className="w-full"
          />
        </FormItemLayout>

        <FormItemLayout label="Kết quả">
          <Select
            allowClear
            placeholder="Tất cả kết quả"
            options={RESULT_OPTIONS}
            value={filters.result}
            onChange={(result) => patchFilters({ result })}
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
        pagination={pagination}
      />

      <Drawer
        title="Chi tiết nhật ký"
        open={!!selected}
        onClose={() => setSelected(null)}
        width={560}
      >
        {selected && (
          <div className="space-y-4">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Thời gian">
                {dayjs(selected.createdAt).format("HH:mm:ss DD/MM/YYYY")}
              </Descriptions.Item>
              <Descriptions.Item label="Người thực hiện">
                {selected.actorName}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {selected.actorEmail}
              </Descriptions.Item>
              <Descriptions.Item label="Nhóm quyền">
                {selected.actorRole}
              </Descriptions.Item>
              <Descriptions.Item label="Thao tác">
                <ActivityActionTag action={selected.action} />
              </Descriptions.Item>
              <Descriptions.Item label="Phân hệ">
                <ActivityModuleTag module={selected.module} />
              </Descriptions.Item>
              <Descriptions.Item label="Nội dung">
                {selected.description}
              </Descriptions.Item>
              {selected.targetLabel && (
                <Descriptions.Item label="Đối tượng">
                  {selected.targetLabel}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Kết quả">
                <ActivityResultTag result={selected.result} />
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ IP">
                {selected.ipAddress}
              </Descriptions.Item>
              <Descriptions.Item label="Thiết bị">
                {selected.userAgent}
              </Descriptions.Item>
            </Descriptions>

            {selected.changes.length > 0 && (
              <div>
                <h4 className="text-fg mb-2 font-semibold">
                  Các trường đã thay đổi
                </h4>
                <Table<ActivityChange>
                  rowKey="field"
                  size="small"
                  columns={changeColumns}
                  dataSource={selected.changes}
                  pagination={false}
                />
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
}
