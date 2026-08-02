import { notFound } from "next/navigation";

import { orders } from "@/mock/orders";

import { OrderDetail } from "./OrderDetail";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = orders.find((item) => item.id === id);

  if (!order) notFound();

  return <OrderDetail order={order} />;
}
