"use client";

import { Tag } from "antd";

import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  type OrderStatus,
  type PaymentStatus,
} from "@/types/order";
import {
  PRODUCT_STATUS_LABEL,
  PRODUCT_TYPE_LABEL,
  type ProductStatus,
  type ProductType,
} from "@/types/product";
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
  processing: "cyan",
  shipping: "orange",
  completed: "green",
  cancelled: "red",
  refunded: "purple",
};

const PAYMENT_COLOR: Record<PaymentStatus, string> = {
  unpaid: "default",
  paid: "green",
  refunded: "purple",
  failed: "red",
};

const PRODUCT_COLOR: Record<ProductStatus, string> = {
  active: "green",
  draft: "default",
  out_of_stock: "red",
  archived: "purple",
};

/**
 * `standard` cố tình không có tag: hàng hoá thường chiếm đa số nên gắn chip
 * cho mọi dòng chỉ làm nhiễu — chỉ combo và dịch vụ mới cần đánh dấu.
 */
const PRODUCT_TYPE_COLOR: Record<Exclude<ProductType, "standard">, string> = {
  bundle: "geekblue",
  service: "cyan",
};

const POST_COLOR: Record<PostStatus, string> = {
  published: "green",
  draft: "default",
  archived: "purple",
};

const CUSTOMER_COLOR: Record<CustomerStatus, string> = {
  active: "green",
  inactive: "default",
  banned: "red",
};

const TIER_COLOR: Record<CustomerTier, string> = {
  normal: "default",
  silver: "blue",
  gold: "gold",
  diamond: "purple",
};

const ADMIN_COLOR: Record<AdminUserStatus, string> = {
  active: "green",
  inactive: "default",
  banned: "red",
};

const STOCK_COLOR: Record<StockLevel, string> = {
  in_stock: "green",
  low_stock: "gold",
  out_of_stock: "red",
};

export const OrderStatusTag = ({ status }: { status: OrderStatus }) => (
  <Tag color={ORDER_COLOR[status]}>{ORDER_STATUS_LABEL[status]}</Tag>
);

export const PaymentStatusTag = ({ status }: { status: PaymentStatus }) => (
  <Tag color={PAYMENT_COLOR[status]}>{PAYMENT_STATUS_LABEL[status]}</Tag>
);

export const ProductStatusTag = ({ status }: { status: ProductStatus }) => (
  <Tag color={PRODUCT_COLOR[status]}>{PRODUCT_STATUS_LABEL[status]}</Tag>
);

export const ProductTypeTag = ({ type }: { type: ProductType }) =>
  type === "standard" ? null : (
    <Tag color={PRODUCT_TYPE_COLOR[type]}>{PRODUCT_TYPE_LABEL[type]}</Tag>
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
