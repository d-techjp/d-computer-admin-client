"use client";

import { Alert, Skeleton, Tooltip } from "antd";
import { Infinity as InfinityIcon } from "lucide-react";

import { formatNumber } from "@/lib/utils";
import type { VariantAvailability } from "@/types/variant";

/**
 * Số combo còn bán được — `GET /variants/{id}/availability`.
 *
 * `limitedBy` là các thành phần đang chặn tồn kho, hiển thị kèm phép tính để
 * người quản kho biết cần nhập thêm cái nào chứ không chỉ thấy một con số.
 */
export function AvailabilityPanel({
  availability,
  loading,
  hasItems,
}: {
  availability?: VariantAvailability;
  loading?: boolean;
  hasItems: boolean;
}) {
  return (
    <section className="bg-card border-line shadow-card h-fit space-y-3 rounded-lg border p-4">
      <h3 className="text-fg font-semibold">Khả năng bán</h3>

      {loading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : !hasItems ? (
        <p className="text-muted text-sm">
          Thêm thành phần để tính được số combo bán ra.
        </p>
      ) : !availability ? (
        <p className="text-muted text-sm">Chưa tính được, thử tải lại trang.</p>
      ) : availability.available === null ? (
        <div className="flex items-center gap-2">
          <InfinityIcon size={20} className="text-success" />
          <div>
            <div className="text-fg font-semibold">Không giới hạn</div>
            <div className="text-muted text-xs">
              Mọi thành phần đều không quản lý tồn kho.
            </div>
          </div>
        </div>
      ) : (
        <>
          <div>
            <div
              className={
                availability.available > 0
                  ? "text-fg text-2xl font-bold"
                  : "text-danger text-2xl font-bold"
              }
            >
              {formatNumber(availability.available)}
            </div>
            <div className="text-muted text-sm">combo còn bán được</div>
          </div>

          {availability.available === 0 && (
            <Alert
              type="error"
              showIcon
              message="Không bán được combo"
              description="Ít nhất một thành phần bắt buộc đã hết hàng."
            />
          )}

          {availability.limitedBy.length > 0 && (
            <div className="space-y-2">
              <p className="text-muted text-xs font-medium">Thành phần đang giới hạn</p>
              {availability.limitedBy.map((limit) => (
                <div
                  key={limit.variantId}
                  className="border-line rounded-md border px-3 py-2 text-sm"
                >
                  <div className="font-medium">{limit.sku}</div>
                  <div className="text-muted text-xs">
                    Tồn {formatNumber(limit.stock)} · cần {formatNumber(limit.quantity)}/combo →{" "}
                    <Tooltip title="floor(tồn / số lượng cần)">
                      <span className="underline decoration-dotted">
                        giới hạn {formatNumber(Math.floor(limit.stock / (limit.quantity || 1)))}
                      </span>
                    </Tooltip>
                  </div>
                </div>
              ))}
              <p className="text-muted text-xs">
                Nhập thêm các thành phần trên để tăng số combo bán được.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default AvailabilityPanel;
