"use client";

import { Tag } from "antd";

import {
  ACTIVITY_ACTION_LABEL,
  ACTIVITY_MODULE_LABEL,
  ACTIVITY_RESULT_LABEL,
  type ActivityAction,
  type ActivityModule,
  type ActivityResult,
} from "@/types/activity-log";

const ACTION_COLOR: Record<ActivityAction, string> = {
  login: "blue",
  logout: "default",
  create: "green",
  update: "gold",
  delete: "red",
  export: "cyan",
  permission_change: "purple",
};

const RESULT_COLOR: Record<ActivityResult, string> = {
  success: "green",
  failed: "red",
};

export const ActivityActionTag = ({ action }: { action: ActivityAction }) => (
  <Tag color={ACTION_COLOR[action]}>{ACTIVITY_ACTION_LABEL[action]}</Tag>
);

export const ActivityModuleTag = ({ module }: { module: ActivityModule }) => (
  <Tag>{ACTIVITY_MODULE_LABEL[module]}</Tag>
);

export const ActivityResultTag = ({ result }: { result: ActivityResult }) => (
  <Tag color={RESULT_COLOR[result]}>{ACTIVITY_RESULT_LABEL[result]}</Tag>
);
