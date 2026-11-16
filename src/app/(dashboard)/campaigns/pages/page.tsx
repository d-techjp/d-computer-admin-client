"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { App, Button, Input, Popconfirm, Select, Space, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { ExternalLink, Pencil, Plus, Send, Trash2, Undo2 } from "lucide-react";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { SearchFilterBar } from "@/components/form/SearchFilterBar";
import routes from "@/config/routes";
import {
  deleteStaticPage,
  listStaticPages,
  publishStaticPage,
  unpublishStaticPage,
} from "@/lib/api/pages";
import { DEFAULT_PAGE_SIZE } from "@/types/common";
import {
  STATIC_PAGE_STATUS_LABEL,
  staticPageUrl,
  type StaticPage,
  type StaticPageStatus,
} from "@/types/page";

interface Filters {
  keyword: string;
  status?: StaticPageStatus;
}

const STATUS_OPTIONS = Object.entries(STATIC_PAGE_STATUS_LABEL).map(([value, label]) => ({
  label,
  value,
}));

export default function StaticPagesPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<StaticPage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ keyword: "" });
  const [appliedFilters, setAppliedFilters] = useState<Filters>({ keyword: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listStaticPages({
        page,
        limit: pageSize,
        search: appliedFilters.keyword,
        status: appliedFilters.status,
        sortBy: "updatedAt",
        sortOrder: "DESC",
      });
      setRows(response.data);
      setTotal(response.total);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tải được danh sách trang");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, message, page, pageSize]);

  useEffect(() => {
    queueMicrotask(() => void loadRows());
  }, [loadRows]);

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

  const handleDelete = async (record: StaticPage) => {
    try {
      await deleteStaticPage(record.id);
      message.success("Đã xoá trang");
      await loadRows();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không xoá được trang");
    }
  };

  const handleToggleStatus = async (record: StaticPage) => {
    setTogglingId(record.id);
    try {
      if (record.status === "published") {
        await unpublishStaticPage(record.id);
        message.success("Đã gỡ xuất bản");
      } else {
        await publishStaticPage(record.id);
        message.success("Đã xuất bản trang");
      }
      await loadRows();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không đổi được trạng thái");
    } finally {
      setTogglingId(null);
    }
  };

  const columns = useMemo<ColumnsType<StaticPage>>(
    () => [
      {
        title: "Tiêu đề",
        dataIndex: "title",
        width: 360,
        render: (title: string, record) => (
          <div className="min-w-0">
            <Link
              href={routes.campaigns.pages.detail(record.id)}
              className="line-clamp-1 font-semibold"
            >
              {title}
            </Link>
            <div className="text-muted truncate text-xs">/{record.slug}</div>
          </div>
        ),
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        width: 130,
        align: "center",
        render: (status: StaticPageStatus) => (
          <Tag color={status === "published" ? "green" : "default"}>
            {STATIC_PAGE_STATUS_LABEL[status]}
          </Tag>
        ),
      },
      {
        title: "Cập nhật",
        dataIndex: "updatedAt",
        width: 150,
        render: (value: string) => dayjs(value).format("DD/MM/YYYY HH:mm"),
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 170,
        align: "center",
        fixed: "right",
        render: (_, record) => (
          <Space size="small">
            {record.status === "published" ? (
              <Tooltip title="Xem trên web">
                <a href={staticPageUrl(record.slug)} target="_blank" rel="noopener noreferrer">
                  <Button type="text" size="small" icon={<ExternalLink size={16} />} />
                </a>
              </Tooltip>
            ) : null}
            <Tooltip title={record.status === "published" ? "Gỡ xuất bản" : "Xuất bản"}>
              <Button
                type="text"
                size="small"
                loading={togglingId === record.id}
                icon={record.status === "published" ? <Undo2 size={16} /> : <Send size={16} />}
                onClick={() => handleToggleStatus(record)}
              />
            </Tooltip>
            <Tooltip title="Sửa">
              <Link href={routes.campaigns.pages.detail(record.id)}>
                <Button type="text" size="small" icon={<Pencil size={16} />} />
              </Link>
            </Tooltip>
            <Popconfirm
              title="Xoá trang này?"
              description="Link tới trang (kể cả trong footer) sẽ thành 404."
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
    [togglingId],
  );

  return (
    <>
      <PageHeader
        title="Trang tĩnh"
        description="Trang chính sách, giới thiệu, hướng dẫn… hiện tại d-techjp.com/{đường dẫn}"
        extra={
          <Link href={routes.campaigns.pages.new}>
            <Button type="primary" icon={<Plus size={16} />}>
              Tạo trang
            </Button>
          </Link>
        }
      />

      <SearchFilterBar onSearch={search} onReset={reset} loading={loading}>
        <FormItemLayout label="Tiêu đề / đường dẫn">
          <Input
            allowClear
            placeholder="Nhập từ khoá tìm kiếm"
            value={filters.keyword}
            onChange={(event) => setFilters((f) => ({ ...f, keyword: event.target.value }))}
          />
        </FormItemLayout>
        <FormItemLayout label="Trạng thái">
          <Select
            allowClear
            placeholder="Tất cả trạng thái"
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(status) => setFilters((f) => ({ ...f, status }))}
            className="w-full"
          />
        </FormItemLayout>
      </SearchFilterBar>

      <DataTable<StaticPage>
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
