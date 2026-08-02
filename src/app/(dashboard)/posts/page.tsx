"use client";

import { useMemo } from "react";
import Link from "next/link";
import { App, Button, Input, Popconfirm, Select, Space, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { PostStatusTag } from "@/components/common/StatusTag";
import {
  DatePickerPresetRange,
  resolvePreset,
  type DateRangeSearchValue,
} from "@/components/form/DatePickerPresetRange";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import routes from "@/config/routes";
import { useListQuery } from "@/hooks/useListQuery";
import { matchDateRange, matchEquals, matchText } from "@/lib/fakeFetch";
import { formatNumber } from "@/lib/utils";
import { posts } from "@/mock/posts";
import {
  POST_CATEGORIES,
  POST_STATUS_LABEL,
  type Post,
  type PostStatus,
} from "@/types/post";

interface PostFilters {
  keyword: string;
  category?: string;
  status?: PostStatus;
  createdRange: DateRangeSearchValue;
}

const STATUS_OPTIONS = Object.entries(POST_STATUS_LABEL).map(
  ([value, label]) => ({ label, value }),
);

const CATEGORY_OPTIONS = POST_CATEGORIES.map((name) => ({
  label: name,
  value: name,
}));

export default function PostsPage() {
  const { message } = App.useApp();

  const { rows, loading, filters, patchFilters, search, reset, pagination } =
    useListQuery<Post, PostFilters>({
      source: posts,
      initialFilters: { keyword: "", createdRange: resolvePreset("custom") },
      buildFilters: (f) => [
        matchText(f.keyword, (item) => [item.title, item.slug, item.author]),
        matchEquals(f.category, (item) => item.category),
        matchEquals(f.status, (item) => item.status),
        matchDateRange(
          f.createdRange.from,
          f.createdRange.to,
          (item) => item.createdAt,
        ),
      ],
    });

  const columns = useMemo<ColumnsType<Post>>(
    () => [
      {
        title: "Tiêu đề",
        dataIndex: "title",
        fixed: "left",
        width: 340,
        render: (title: string, record) => (
          <div className="min-w-0">
            <Link
              href={routes.posts.detail(record.id)}
              className="line-clamp-1 font-semibold"
            >
              {title}
            </Link>
            <div className="text-muted truncate text-xs">/{record.slug}</div>
          </div>
        ),
      },
      { title: "Chuyên mục", dataIndex: "category", width: 160 },
      { title: "Tác giả", dataIndex: "author", width: 180 },
      {
        title: "Lượt xem",
        dataIndex: "viewCount",
        width: 110,
        align: "right",
        sorter: (a, b) => a.viewCount - b.viewCount,
        render: (value: number) => formatNumber(value),
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        width: 120,
        align: "center",
        render: (status: PostStatus) => <PostStatusTag status={status} />,
      },
      {
        title: "Ngày đăng",
        dataIndex: "publishedAt",
        width: 130,
        sorter: (a, b) =>
          (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""),
        render: (value?: string) =>
          value ? (
            dayjs(value).format("DD/MM/YYYY")
          ) : (
            <span className="text-muted">Chưa đăng</span>
          ),
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
              <Link href={routes.posts.detail(record.id)}>
                <Button type="text" size="small" icon={<Pencil size={16} />} />
              </Link>
            </Tooltip>
            <Popconfirm
              title="Xoá bài viết này?"
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
              onConfirm={() => message.success("Đã xoá bài viết")}
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
        title="Bài viết"
        description="Quản lý nội dung tin tức, đánh giá và hướng dẫn của cửa hàng"
        extra={
          <Link href={routes.posts.new}>
            <Button type="primary" icon={<Plus size={16} />}>
              Viết bài mới
            </Button>
          </Link>
        }
      />

      <SearchFilterBar onSearch={search} onReset={reset} loading={loading}>
        <FormItemLayout label="Tiêu đề / tác giả">
          <Input
            allowClear
            placeholder="Nhập từ khoá tìm kiếm"
            value={filters.keyword}
            onChange={(event) => patchFilters({ keyword: event.target.value })}
          />
        </FormItemLayout>

        <FormItemLayout label="Chuyên mục">
          <Select
            allowClear
            placeholder="Tất cả chuyên mục"
            options={CATEGORY_OPTIONS}
            value={filters.category}
            onChange={(category) => patchFilters({ category })}
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

        <DatePickerPresetRange
          label="Ngày tạo"
          value={filters.createdRange}
          onChange={(createdRange) => patchFilters({ createdRange })}
        />
      </SearchFilterBar>

      <DataTable<Post>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={pagination}
      />
    </>
  );
}
