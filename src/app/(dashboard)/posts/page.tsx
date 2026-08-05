"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { App, Button, Input, Popconfirm, Select, Space, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Pencil, Plus, Send, Trash2, Undo2 } from "lucide-react";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { PostStatusTag } from "@/components/common/StatusTag";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import routes from "@/config/routes";
import { deletePost, listPosts, publishPost, unpublishPost } from "@/lib/api/articles";
import { categoryOptionsFrom, listCategories } from "@/lib/api/products";
import { formatNumber } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, type SelectOption } from "@/types/common";
import { POST_STATUS_LABEL, type Post, type PostStatus } from "@/types/post";

interface PostFilters {
  keyword: string;
  categoryId?: string;
  status?: PostStatus;
  tag?: string;
}

const STATUS_OPTIONS = Object.entries(POST_STATUS_LABEL).map(
  ([value, label]) => ({ label, value }),
);

export default function PostsPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PostFilters>({ keyword: "" });
  const [appliedFilters, setAppliedFilters] = useState<PostFilters>({ keyword: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listPosts({
        page,
        limit: pageSize,
        search: appliedFilters.keyword,
        categoryId: appliedFilters.categoryId,
        status: appliedFilters.status,
        tag: appliedFilters.tag,
        sortBy: "createdAt",
        sortOrder: "DESC",
      });
      setRows(response.data);
      setTotal(response.total);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tải được danh sách bài viết");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, message, page, pageSize]);

  useEffect(() => {
    queueMicrotask(() => void loadRows());
  }, [loadRows]);

  useEffect(() => {
    listCategories({ page: 1, limit: 100, sortBy: "name", sortOrder: "ASC", isActive: true })
      .then((response) => setCategoryOptions(categoryOptionsFrom(response.data)))
      .catch(() => setCategoryOptions([]));
  }, []);

  const patchFilters = (patch: Partial<PostFilters>) => {
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

  const handleDelete = async (record: Post) => {
    try {
      await deletePost(record.id);
      message.success("Đã xoá bài viết");
      await loadRows();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không xoá được bài viết");
    }
  };

  const handleToggleStatus = async (record: Post) => {
    setTogglingId(record.id);
    try {
      if (record.status === "published") {
        await unpublishPost(record.id);
        message.success("Đã gỡ xuất bản");
      } else {
        await publishPost(record.id);
        message.success("Đã xuất bản bài viết");
      }
      await loadRows();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không đổi được trạng thái");
    } finally {
      setTogglingId(null);
    }
  };

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
      {
        title: "Chuyên mục",
        dataIndex: "category",
        width: 160,
        render: (value: string) => value || <span className="text-muted">—</span>,
      },
      {
        title: "Tác giả",
        dataIndex: "author",
        width: 180,
        render: (value: string) => value || <span className="text-muted">—</span>,
      },
      {
        title: "Lượt xem",
        dataIndex: "viewCount",
        width: 110,
        align: "right",
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
        width: 140,
        align: "center",
        fixed: "right",
        render: (_, record) => (
          <Space size="small">
            <Tooltip title={record.status === "published" ? "Gỡ xuất bản" : "Xuất bản"}>
              <Button
                type="text"
                size="small"
                loading={togglingId === record.id}
                icon={
                  record.status === "published" ? (
                    <Undo2 size={16} />
                  ) : (
                    <Send size={16} />
                  )
                }
                onClick={() => handleToggleStatus(record)}
              />
            </Tooltip>
            <Tooltip title="Sửa">
              <Link href={routes.posts.detail(record.id)}>
                <Button type="text" size="small" icon={<Pencil size={16} />} />
              </Link>
            </Tooltip>
            <Popconfirm
              title="Xoá bài viết này?"
              description="Thao tác không thể hoàn tác."
              okText="Xoá"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record)}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [togglingId],
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
        <FormItemLayout label="Tiêu đề / thẻ">
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
            showSearch
            optionFilterProp="label"
            placeholder="Tất cả chuyên mục"
            options={categoryOptions}
            value={filters.categoryId}
            onChange={(categoryId) => patchFilters({ categoryId })}
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

        <FormItemLayout label="Thẻ (tag)">
          <Input
            allowClear
            placeholder="VD: laptop"
            value={filters.tag}
            onChange={(event) => patchFilters({ tag: event.target.value })}
          />
        </FormItemLayout>
      </SearchFilterBar>

      <DataTable<Post>
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
