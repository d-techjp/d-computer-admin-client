"use client";

import { App } from "antd";
import { AlertTriangle, HelpCircle } from "lucide-react";

export interface ConfirmDialogOptions {
  title: string;
  description?: React.ReactNode;
  okText?: string;
  cancelText?: string;
  /** Nhấn mạnh hành động khó hoàn tác (rời trang mất dữ liệu, xoá...) */
  danger?: boolean;
}

/**
 * Hộp thoại xác nhận dùng chung, thay cho `window.confirm()` mặc định của
 * trình duyệt — cái đó không theo theme sáng/tối của app và không tuỳ biến
 * được nút/nội dung. Trả về `Promise<boolean>` nên gọi được ở bất cứ đâu cần
 * đợi người dùng quyết định trước khi làm tiếp (điều hướng, xoá, ghi đè...).
 *
 * Chỉ dùng được bên trong cây `<AntdApp>` (mọi trang trong `(dashboard)` đã
 * có sẵn qua `providers.tsx`). Với xác nhận neo vào đúng một nút bấm cụ thể,
 * ưu tiên `Popconfirm` — nó chỉ ra rõ ràng "cái gì" đang bị xoá; dùng hook này
 * khi không có một nút cố định để neo, ví dụ chặn điều hướng khi rời trang.
 */
export function useConfirmDialog() {
  const { modal } = App.useApp();

  return function confirm(options: ConfirmDialogOptions) {
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const settle = (value: boolean) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      modal.confirm({
        title: options.title,
        content: options.description,
        icon: options.danger ? (
          <AlertTriangle className="text-danger" size={22} />
        ) : (
          <HelpCircle className="text-brand" size={22} />
        ),
        okText: options.okText ?? "Xác nhận",
        cancelText: options.cancelText ?? "Huỷ",
        okButtonProps: { danger: options.danger },
        onOk: () => settle(true),
        onCancel: () => settle(false),
        // Đóng bằng phím Esc / click ra ngoài cũng là "không xác nhận"
        afterClose: () => settle(false),
      });
    });
  };
}

export default useConfirmDialog;
