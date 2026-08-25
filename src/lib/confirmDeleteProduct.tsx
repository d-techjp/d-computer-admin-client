/**
 * Xoá sản phẩm kèm cảnh báo nếu nó đang là thành phần của combo — dùng chung
 * giữa danh sách sản phẩm và trang chi tiết để không lặp logic fetch + confirm/UI.
 *
 * Xoá xong, các combo dùng sản phẩm này tự chuyển về "chưa bán" (BE lo, xem
 * `ProductsService.remove`) — FE chỉ cần cho quản trị biết trước khi bấm Xoá.
 */
import Link from "next/link";
import type { App } from "antd";

import routes from "@/config/routes";
import { deleteProduct, fetchProductBundleUsage } from "@/lib/api/products";

type ModalApi = ReturnType<typeof App.useApp>["modal"];
type MessageApi = ReturnType<typeof App.useApp>["message"];

export async function confirmDeleteProduct(params: {
  modal: ModalApi;
  message: MessageApi;
  product: { id: string; name: string };
  onDeleted: () => void | Promise<void>;
}) {
  const { modal, message, product, onDeleted } = params;

  let bundleUsage: Awaited<ReturnType<typeof fetchProductBundleUsage>> = [];
  try {
    bundleUsage = await fetchProductBundleUsage(product.id);
  } catch {
    // Không lấy được cảnh báo thì vẫn cho xoá bình thường — chỉ mất phần gợi ý.
  }

  modal.confirm({
    title: "Xoá sản phẩm?",
    content: bundleUsage.length
      ? (
          <div className="space-y-4">
            <p className="text-fg leading-6">
              <strong className="block text-base" title={product.name}>
                {product.name}
              </strong>
              đang là thành phần của <strong>{bundleUsage.length} combo</strong>.
            </p>
            <div className="overflow-hidden rounded-lg border border-line bg-card">
              <div className="flex items-center justify-between border-b border-line bg-subtle px-4 py-2.5">
                <span className="text-fg text-sm font-semibold">Combo bị ảnh hưởng</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {bundleUsage.length} combo
                </span>
              </div>
              <ul className="max-h-44 divide-y divide-line overflow-y-auto">
                {bundleUsage.map((bundle) => (
                  <li key={bundle.id} className="flex items-center gap-3 px-4 py-3">
                    <Link
                      href={`${routes.products.detail(bundle.id)}?tab=bundle`}
                      className="text-brand hover:text-brand-hover min-w-0 flex-1 truncate text-sm font-medium"
                      title={bundle.name}
                    >
                      {bundle.name}
                    </Link>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                      Chưa bán
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-description text-sm">
              Xoá sản phẩm sẽ chuyển các combo trên sang trạng thái “chưa bán”. Mở tab “Thành phần
              combo” để gỡ hoặc thay thế sản phẩm này.
            </p>
          </div>
        )
      : "Xoá mềm, kéo theo toàn bộ biến thể.",
    okText: "Xoá",
    cancelText: "Huỷ",
    okButtonProps: { danger: true },
    onOk: async () => {
      try {
        await deleteProduct(product.id);
        message.success("Đã xoá sản phẩm");
        await onDeleted();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "Không xoá được sản phẩm");
      }
    },
  });
}
