"use client";

import { Tag } from "antd";

import { ORDER_STATUS_LABEL, type OrderStatus } from "@/types/order";
import { PRODUCT_STATUS_LABEL, type ProductStatus } from "@/types/product";
import { POST_STATUS_LABEL, type PostStatus } from "@/types/post";
import {
  CUSTOMER_STATUS_LABEL,
  CUSTOMER_TIER_LABEL,
  type CustomerStatus,
  type CustomerTier,
} from "@/types/customer";
import {
  ADMIN_USER_STATUS_LABEL,
  type AdminUserStatus,
} from "@/types/admin-user";
import { STOCK_LEVEL_LABEL, type StockLevel } from "@/types/warehouse";

/**
 * Nhãn trạng thái dùng chung cho mọi bảng. Màu đi kèm chữ (không bao giờ chỉ
 * có màu), nên người dùng khó phân biệt màu vẫn đọc được trạng thái.
 */

const ORDER_COLOR: Record<OrderStatus, string> = {
  pending: "gold",
  confirmed: "blue",
  shipping: "orange",
  delivered: "green",
  cancelled: "red",
};

const PRODUCT_COLOR: Record<ProductStatus, string> = {
  active: "green",
  draft: "default",
  out_of_stock: "red",
};

const POST_COLOR: Record<PostStatus, string> = {
  published: "green",
  draft: "default",
  archived: "purple",
};

const CUSTOMER_COLOR: Record<CustomerStatus, string> = {
  active: "green",
  inactive: "default",
  blocked: "red",
};

const TIER_COLOR: Record<CustomerTier, string> = {
  normal: "default",
  silver: "blue",
  gold: "gold",
  diamond: "purple",
};

const ADMIN_COLOR: Record<AdminUserStatus, string> = {
  active: "green",
  suspended: "red",
};

const STOCK_COLOR: Record<StockLevel, string> = {
  in_stock: "green",
  low_stock: "gold",
  out_of_stock: "red",
};

export const OrderStatusTag = ({ status }: { status: OrderStatus }) => (
  <Tag color={ORDER_COLOR[status]}>{ORDER_STATUS_LABEL[status]}</Tag>
);

export const ProductStatusTag = ({ status }: { status: ProductStatus }) => (
  <Tag color={PRODUCT_COLOR[status]}>{PRODUCT_STATUS_LABEL[status]}</Tag>
);

export const PostStatusTag = ({ status }: { status: PostStatus }) => (
  <Tag color={POST_COLOR[status]}>{POST_STATUS_LABEL[status]}</Tag>
);

export const CustomerStatusTag = ({ status }: { status: CustomerStatus }) => (
  <Tag color={CUSTOMER_COLOR[status]}>{CUSTOMER_STATUS_LABEL[status]}</Tag>
);

export const CustomerTierTag = ({ tier }: { tier: CustomerTier }) => (
  <Tag color={TIER_COLOR[tier]}>{CUSTOMER_TIER_LABEL[tier]}</Tag>
);

export const AdminStatusTag = ({ status }: { status: AdminUserStatus }) => (
  <Tag color={ADMIN_COLOR[status]}>{ADMIN_USER_STATUS_LABEL[status]}</Tag>
);

export const StockLevelTag = ({ level }: { level: StockLevel }) => (
  <Tag color={STOCK_COLOR[level]}>{STOCK_LEVEL_LABEL[level]}</Tag>
);
