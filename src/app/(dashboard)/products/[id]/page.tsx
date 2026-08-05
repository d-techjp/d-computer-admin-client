import { Suspense } from "react";
import { Skeleton } from "antd";

import { ProductWorkspace } from "../_components/ProductWorkspace";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // ProductWorkspace đọc tab đang mở từ `useSearchParams`, nên cần Suspense
  // boundary khi trang được prerender.
  return (
    <Suspense fallback={<Skeleton active paragraph={{ rows: 8 }} />}>
      <ProductWorkspace productId={id} />
    </Suspense>
  );
}
