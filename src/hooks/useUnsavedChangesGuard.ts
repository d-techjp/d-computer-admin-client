"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useConfirmDialog } from "@/components/common/ConfirmDialog";

const DEFAULT_MESSAGE = "Bạn có thay đổi chưa lưu. Rời khỏi trang mà không lưu?";

/**
 * Cảnh báo khi rời trang lúc còn thay đổi chưa lưu:
 * - `beforeunload`: chặn refresh, đóng tab, gõ URL khác, mở link ngoài app.
 *   Bắt buộc dùng dialog gốc của trình duyệt — đây là giới hạn bảo mật của
 *   mọi trình duyệt hiện đại, không có cách hiện UI tuỳ biến ở sự kiện này.
 * - click bắt ở capture phase trên toàn `document`: chặn điều hướng trong app
 *   (menu sidebar...) trước khi Next xử lý click của `<Link>`, hiện hộp thoại
 *   xác nhận dùng chung (`useConfirmDialog`) rồi tự `router.push` nếu người
 *   dùng xác nhận rời đi.
 *
 * Không can thiệp nút back/forward của trình duyệt — tự đẩy pushState/popstate
 * để chặn dễ xung đột với cơ chế điều hướng riêng của App Router, nên bỏ qua
 * trường hợp này (giới hạn đã biết, xem ghi chú nơi gọi hook).
 */
export function useUnsavedChangesGuard(isDirty: boolean, message = DEFAULT_MESSAGE) {
  const router = useRouter();
  const confirmDialog = useConfirmDialog();
  const dirtyRef = useRef(isDirty);

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      event.preventDefault();
      // Nội dung message bị trình duyệt hiện đại bỏ qua và thay bằng dialog mặc định
      event.returnValue = "";
    }

    function handleClick(event: MouseEvent) {
      if (!dirtyRef.current) return;
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Trỏ về đúng trang hiện tại (VD chỉ đổi hash) thì không cần hỏi
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      void confirmDialog({
        title: "Rời khỏi trang?",
        description: message,
        okText: "Rời khỏi trang",
        cancelText: "Ở lại",
        danger: true,
      }).then((confirmed) => {
        if (!confirmed) return;
        dirtyRef.current = false;
        router.push(`${url.pathname}${url.search}${url.hash}`);
      });
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [confirmDialog, message, router]);
}

export default useUnsavedChangesGuard;
