import { notFound } from "next/navigation";

import { products } from "@/mock/products";

import { ProductForm } from "../ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = products.find((item) => item.id === id);

  if (!product) notFound();

  return <ProductForm product={product} />;
}
