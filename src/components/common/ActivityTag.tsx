"use client";

import { Tag } from "antd";

import {
  activityActionLabel,
  activityResourceLabel,
  ACTIVITY_STATUS_LABEL,
  type ActivityStatus,
} from "@/types/activity-log";

/**
 * Màu theo mức độ tác động, không phải theo từng `action`: contract cho phép
 * `action` là chuỗi tự do nên bảng màu chỉ tô những giá trị đã biết, giá trị lạ
 * dùng màu mặc định thay vì không có màu nào.
 */
const ACTION_COLOR: Record<string, string> = {
  login: "blue",
  logout: "default",
  logout_all: "default",
  change_password: "purple",
  create: "green",
  update: "gold",
  delete: "red",
  publish: "green",
  unpublish: "orange",
  adjust_stock: "gold",
  import: "green",
  export: "cyan",
  reorder: "geekblue",
  assign_role: "purple",
  assign_permissions: "purple",
  status_change: "gold",
};

const STATUS_COLOR: Record<ActivityStatus, string> = {
  success: "green",
  failed: "red",
};

export const ActivityActionTag = ({ action }: { action: string }) => (
  <Tag color={ACTION_COLOR[action]}>{activityActionLabel(action)}</Tag>
);

export const ActivityResourceTag = ({ resource }: { resource: string }) => (
  <Tag>{activityResourceLabel(resource)}</Tag>
);

export const ActivityStatusTag = ({ status }: { status: ActivityStatus }) => (
  <Tag color={STATUS_COLOR[status]}>{ACTIVITY_STATUS_LABEL[status]}</Tag>
);
