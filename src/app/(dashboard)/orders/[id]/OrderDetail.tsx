"use client";

import { useState } from "react";
import { App, Button, Descriptions, Select, Steps } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { OrderStatusTag } from "@/components/common/StatusTag";
import routes from "@/config/routes";
import { fakeMutate } from "@/lib/fakeFetch";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  type Order,
  type OrderItem,
  type OrderStatus,
} from "@/types/order";

/** Luồng trạng thái chuẩn; đơn đã huỷ nằm ngoài luồng này */
const FLOW: OrderStatus[] = ["pending", "confirmed", "shipping", "delivered"];

const STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABEL).map(
  ([value, label]) => ({ label, value }),
);

const itemColumns: ColumnsType<OrderItem> = [
  {
    title: "Sản phẩm",
    dataIndex: "productName",
    render: (name: string, record) => (
      <div className="min-w-0">
        <div className="truncate font-medium">{name}</div>
        <div className="text-muted text-xs">{record.sku}</div>
      </div>
    ),
  },
  {
    title: "Đơn giá",
    dataIndex: "price",
    width: 150,
    align: "right",
    render: (value: number) => formatCurrency(value),
  },
  {
    title: "Số lượng",
    dataIndex: "quantity",
    width: 100,
    align: "right",
    render: (value: number) => formatNumber(value),
  },
  {
    title: "Thành tiền",
    key: "lineTotal",
    width: 160,
    align: "right",
    render: (_, record) => (
      <span className="font-semibold">
        {formatCurrency(record.price * record.quantity)}
      </span>
    ),
  },
];

export function OrderDetail({ order }: { order: Order }) {
  const { message } = App.useApp();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [saving, setSaving] = useState(false);

  const currentStep = FLOW.indexOf(status);
  const isCancelled = status === "cancelled";

  const onSave = async () => {
    setSaving(true);
    await fakeMutate({ id: order.id, status });
    setSaving(false);
    message.success(`Đã chuyển đơn sang "${ORDER_STATUS_LABEL[status]}"`);
  };

  return (
    <>
      <PageHeader
        title={`Đơn hàng ${order.code}`}
        description={`Đặt lúc ${dayjs(order.createdAt).format("HH:mm DD/MM/YYYY")}`}
        breadcrumb={[
          { label: "Quản lý đơn hàng", href: routes.orders.index },
          { label: order.code },
        ]}
        extra={
          <>
            <Select
              value={status}
              options={STATUS_OPTIONS}
              onChange={(value) => setStatus(value)}
              className="w-44"
            />
            <Button
              type="primary"
              loading={saving}
              disabled={status === order.status}
              onClick={onSave}
            >
              Cập nhật trạng thái
            </Button>
          </>
        }
      />

      <div className="bg-card border-line shadow-card mb-4 rounded-lg border p-4">
        {isCancelled ? (
          <div className="flex items-center gap-2">
            <OrderStatusTag status="cancelled" />
            <span className="text-muted text-sm">
              Đơn hàng đã bị huỷ, không còn trong luồng xử lý.
            </span>
          </div>
        ) : (
          <Steps
            size="small"
            current={currentStep < 0 ? 0 : currentStep}
            items={FLOW.map((step) => ({ title: ORDER_STATUS_LABEL[step] }))}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DataTable<OrderItem>
            rowKey="productId"
            columns={itemColumns}
            dataSource={order.items}
            pagination={false}
          />
        </div>

        <div className="space-y-4">
          <section className="bg-card border-line shadow-card rounded-lg border p-4">
            <h3 className="text-fg mb-3 font-semibold">Khách hàng</h3>
            <Descriptions column={1} size="small" colon={false}>
              <Descriptions.Item label="Họ tên">
                {order.customerName}
              </Descriptions.Item>
              <Descriptions.Item label="Điện thoại">
                {order.customerPhone}
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ giao">
                {order.shippingAddress}
              </Descriptions.Item>
              <Descriptions.Item label="Thanh toán">
                {PAYMENT_METHOD_LABEL[order.paymentMethod]}
              </Descriptions.Item>
            </Descriptions>
          </section>

          <section className="bg-card border-line shadow-card rounded-lg border p-4">
            <h3 className="text-fg mb-3 font-semibold">Thanh toán</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Tạm tính</dt>
                <dd>{formatCurrency(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Phí vận chuyển</dt>
                <dd>{formatCurrency(order.shippingFee)}</dd>
              </div>
              <div className="border-line flex justify-between border-t pt-2 text-base font-bold">
                <dt>Tổng cộng</dt>
                <dd className="text-brand">{formatCurrency(order.total)}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </>
  );
}

export default OrderDetail;
