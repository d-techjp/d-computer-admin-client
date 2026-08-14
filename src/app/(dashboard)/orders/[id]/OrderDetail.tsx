"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Button, Descriptions, Empty, Input, Select, Skeleton, Space, Steps } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { OrderStatusTag, PaymentStatusTag } from "@/components/common/StatusTag";
import routes from "@/config/routes";
import { fetchOrder, updateOrderPaymentStatus, updateOrderStatus } from "@/lib/api/orders";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  type Order,
  type OrderItem,
  type OrderStatus,
  type PaymentStatus,
} from "@/types/order";

/** Luồng trạng thái chuẩn; đơn đã huỷ nằm ngoài luồng này */
const FLOW: OrderStatus[] = ["pending", "confirmed", "processing", "shipping", "completed"];

const STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABEL).map(
  ([value, label]) => ({ label, value }),
);

const PAYMENT_STATUS_OPTIONS = Object.entries(PAYMENT_STATUS_LABEL).map(
  ([value, label]) => ({ label, value }),
);

const itemColumns: ColumnsType<OrderItem> = [
  {
    title: "Sản phẩm",
    dataIndex: "productName",
    render: (name: string, record) => (
      <div className="min-w-0">
        <div className="truncate font-medium">{name}</div>
        <div className="text-muted text-xs">
          {record.sku}
          {record.variantName ? ` · ${record.variantName}` : ""}
        </div>
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
        {formatCurrency(record.total)}
      </span>
    ),
  },
];

export function OrderDetail({ orderId }: { orderId: string }) {
  const { message } = App.useApp();
  const [order, setOrder] = useState<Order>();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OrderStatus>("pending");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [reason, setReason] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchOrder(orderId);
      setOrder(response);
      setStatus(response.status);
      setPaymentStatus(response.paymentStatus);
      setReason("");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tải được chi tiết đơn hàng");
    } finally {
      setLoading(false);
    }
  }, [message, orderId]);

  useEffect(() => {
    queueMicrotask(() => void loadOrder());
  }, [loadOrder]);

  const currentStep = FLOW.indexOf(status);
  const isOutsideFlow = status === "cancelled" || status === "refunded";

  const statusChanged = !!order && status !== order.status;
  const paymentChanged = !!order && paymentStatus !== order.paymentStatus;

  const shippingAddress = useMemo(() => {
    const detail = order?.shippingAddressDetail;
    if (!detail) return order?.shippingAddress ?? "";
    return [detail.street, detail.ward, detail.district, detail.province].filter(Boolean).join(", ");
  }, [order]);

  const onSaveStatus = async () => {
    if (!order) return;
    setSavingStatus(true);
    try {
      const response = await updateOrderStatus(order.id, {
        status,
        reason: reason || undefined,
      });
      setOrder(response);
      setStatus(response.status);
      setPaymentStatus(response.paymentStatus);
      setReason("");
      message.success(`Đã chuyển đơn sang "${ORDER_STATUS_LABEL[response.status]}"`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không cập nhật được trạng thái đơn");
    } finally {
      setSavingStatus(false);
    }
  };

  const onSavePayment = async () => {
    if (!order) return;
    setSavingPayment(true);
    try {
      const response = await updateOrderPaymentStatus(order.id, paymentStatus);
      setOrder(response);
      setStatus(response.status);
      setPaymentStatus(response.paymentStatus);
      message.success(`Đã cập nhật thanh toán: ${PAYMENT_STATUS_LABEL[response.paymentStatus]}`);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Không cập nhật được trạng thái thanh toán",
      );
    } finally {
      setSavingPayment(false);
    }
  };

  if (loading) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  if (!order) {
    return <Empty description="Không tìm thấy đơn hàng" />;
  }

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
          <Space wrap>
            <OrderStatusTag status={order.status} />
            <PaymentStatusTag status={order.paymentStatus} />
          </Space>
        }
      />

      <div className="bg-card border-line shadow-card mb-4 rounded-lg border p-4">
        {isOutsideFlow ? (
          <div className="flex items-center gap-2">
            <OrderStatusTag status={status} />
            <span className="text-muted text-sm">
              Đơn hàng không còn trong luồng xử lý giao hàng.
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

      <div className="bg-card border-line shadow-card mb-4 grid grid-cols-1 gap-3 rounded-lg border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div>
          <p className="text-fg mb-1 text-sm font-semibold">Trạng thái đơn</p>
          <Select
            value={status}
            options={STATUS_OPTIONS}
            onChange={(value) => setStatus(value)}
            className="w-full"
          />
        </div>
        <div>
          <p className="text-fg mb-1 text-sm font-semibold">Lý do</p>
          <Input
            allowClear
            placeholder="Bắt buộc khi huỷ đơn"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button
            type="primary"
            loading={savingStatus}
            disabled={!statusChanged}
            onClick={onSaveStatus}
          >
            Cập nhật trạng thái
          </Button>
        </div>

        <div>
          <p className="text-fg mb-1 text-sm font-semibold">Trạng thái thanh toán</p>
          <Select
            value={paymentStatus}
            options={PAYMENT_STATUS_OPTIONS}
            onChange={(value) => setPaymentStatus(value)}
            className="w-full"
          />
        </div>
        <div className="lg:col-span-2 flex items-end">
          <Button loading={savingPayment} disabled={!paymentChanged} onClick={onSavePayment}>
            Cập nhật thanh toán
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DataTable<OrderItem>
            rowKey="id"
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
                {shippingAddress}
              </Descriptions.Item>
              <Descriptions.Item label="Thanh toán">
                {PAYMENT_METHOD_LABEL[order.paymentMethod]}
              </Descriptions.Item>
              <Descriptions.Item label="TT thanh toán">
                <PaymentStatusTag status={order.paymentStatus} />
              </Descriptions.Item>
              {order.note && <Descriptions.Item label="Ghi chú">{order.note}</Descriptions.Item>}
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
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">Giảm giá</dt>
                  <dd>-{formatCurrency(order.discount)}</dd>
                </div>
              )}
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
