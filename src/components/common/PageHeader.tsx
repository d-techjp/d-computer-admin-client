"use client";

import Link from "next/link";
import { Breadcrumb, Divider, Typography } from "antd";

export interface PageHeaderBreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: PageHeaderBreadcrumbItem[];
  /** Slot phải cho nút hành động — giữ đúng API `extra` của bản gốc */
  extra?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  extra,
}: PageHeaderProps) {
  return (
    <div className="mb-4">
      {breadcrumb?.length ? (
        <Breadcrumb
          className="mb-2"
          items={breadcrumb.map((item) => ({
            title: item.href ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              item.label
            ),
          }))}
        />
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Typography.Title level={4} className="mb-0!">
            {title}
          </Typography.Title>
          {description && (
            <p className="text-muted mt-1 text-sm">{description}</p>
          )}
        </div>
        {extra && <div className="flex items-center gap-2">{extra}</div>}
      </div>

      <Divider className="mt-3! mb-0!" />
    </div>
  );
}

export default PageHeader;
