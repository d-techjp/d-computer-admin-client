"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Button, Modal, Segmented, Slider, Tooltip } from "antd";
import { AlertTriangle, RotateCcw } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area, MediaSize, Point, Size } from "react-easy-crop";

import {
  cropImageToFile,
  PRODUCT_IMAGE_ASPECT,
  PRODUCT_IMAGE_ASPECT_LABEL,
  PRODUCT_IMAGE_OUTPUT_HEIGHT,
  PRODUCT_IMAGE_OUTPUT_WIDTH,
  resolveOutputSize,
  type CropBackground,
} from "@/lib/imageCrop";
import { cn } from "@/lib/utils";

/**
 * Không cho thu nhỏ dưới mức "phủ kín khung": card storefront hiển thị ảnh
 * bằng `object-cover`, nên phần khung không có ảnh sẽ thành dải nền trắng nằm
 * luôn trong file ảnh và lộ ra ở mép card.
 */
const MIN_ZOOM_RATIO = 1;
/** Phóng to tối đa so với mức "phủ kín khung" */
const MAX_ZOOM_RATIO = 3;

const CENTER: Point = { x: 0, y: 0 };

/** Nền xem trước bên trong khung cắt: trắng phẳng, hoặc caro cho vùng trong suốt */
const BACKGROUND_PREVIEW: Record<CropBackground, React.CSSProperties> = {
  white: { background: "#ffffff" },
  transparent: {
    backgroundColor: "#ffffff",
    backgroundImage:
      "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
    backgroundSize: "16px 16px",
    backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
  },
};

interface ProductImageCropperProps {
  /** `undefined` = đóng modal */
  file?: File;
  /** Vị trí trong lượt chọn nhiều ảnh, để người dùng biết còn bao nhiêu tấm */
  step?: number;
  total?: number;
  /** Bỏ qua ảnh này — file gốc **không** được đưa vào form */
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

/**
 * Cắt ảnh sản phẩm về khung chuẩn ({@link PRODUCT_IMAGE_ASPECT}) trước khi ảnh vào preview/draft của form.
 *
 * Ảnh luôn phủ kín khung (mở ở mức vừa phủ kín, không thu nhỏ hơn được và
 * không kéo được ra ngoài khung) — ảnh xuất ra vì vậy không bao giờ có dải nền
 * lấp ở mép. Ảnh gốc khác tỉ lệ khung thì phần thừa bị cắt bỏ, người dùng kéo ảnh
 * để chọn phần giữ lại. Ô "Xem trước" vẽ đúng vùng sẽ xuất ra, để người dùng
 * không nhầm khung cắt với vùng nào khác trong ảnh.
 *
 * Chỉ áp dụng cho file mới chọn từ máy; ảnh đã có URL từ backend không bị bắt
 * cắt lại (xem `useProductImageCropper`).
 */
export function ProductImageCropper({
  file,
  step,
  total,
  onCancel,
  onConfirm,
}: ProductImageCropperProps) {
  const { message } = App.useApp();

  const [crop, setCrop] = useState<Point>(CENTER);
  /**
   * Zoom được giữ **tương đối** so với mức "vừa khung" (1 = trọn ảnh trong
   * khung): mức tuyệt đối chỉ tính được sau khi ảnh tải xong, mà chỉnh lại
   * state theo sau đó thì phải dùng effect + setState — vòng render thừa và
   * react-hooks/set-state-in-effect chặn. Cách này cho luôn mặc định đúng ngay
   * từ lần render đầu và slider cũng đọc thẳng ra phần trăm.
   */
  const [zoomRatio, setZoomRatio] = useState(1);
  const [mediaSize, setMediaSize] = useState<MediaSize>();
  const [cropSize, setCropSize] = useState<Size>();
  const [area, setArea] = useState<Area>();
  /** Cùng vùng cắt nhưng theo % ảnh gốc — dùng để vẽ ô xem trước */
  const [areaPercent, setAreaPercent] = useState<Area>();
  const [background, setBackground] = useState<CropBackground>("white");
  const [exporting, setExporting] = useState(false);

  // Nạp lại từ đầu khi modal chuyển sang ảnh khác trong cùng một lượt chọn,
  // ngay trong lúc render để không có một nhịp hiển thị thông số của ảnh trước.
  const [openedFor, setOpenedFor] = useState(file);
  if (file !== openedFor) {
    setOpenedFor(file);
    setCrop(CENTER);
    setZoomRatio(1);
    setMediaSize(undefined);
    setCropSize(undefined);
    setArea(undefined);
    setAreaPercent(undefined);
    setBackground("white");
  }

  const imageUrl = useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file]);
  useEffect(() => (imageUrl ? () => URL.revokeObjectURL(imageUrl) : undefined), [imageUrl]);

  /** Mức zoom vừa đủ để ảnh phủ kín khung — gốc quy chiếu của slider */
  const fitZoom =
    mediaSize && cropSize
      ? Math.max(cropSize.width / mediaSize.width, cropSize.height / mediaSize.height)
      : undefined;
  const zoom = (fitZoom ?? 1) * zoomRatio;

  // Bỏ qua object mới có cùng kích thước để không render lại mỗi lần kéo ảnh
  const onCropSizeChange = useCallback((size: Size) => {
    setCropSize((current) =>
      current && current.width === size.width && current.height === size.height
        ? current
        : size,
    );
  }, []);

  const onCropComplete = useCallback((percent: Area, pixels: Area) => {
    setAreaPercent(percent);
    setArea(pixels);
  }, []);

  const reset = () => {
    setZoomRatio(1);
    setCrop(CENTER);
  };

  const confirm = async () => {
    if (!file || !area || area.width <= 0) return;

    setExporting(true);
    try {
      onConfirm(await cropImageToFile({ file, area, background }));
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không cắt được ảnh");
    } finally {
      setExporting(false);
    }
  };

  const output = area ? resolveOutputSize(area.width) : undefined;
  const isBelowTarget = !!output && output.width < PRODUCT_IMAGE_OUTPUT_WIDTH;
  const hasMultiple = !!total && total > 1;

  return (
    <Modal
      title={
        hasMultiple
          ? `Cắt ảnh sản phẩm — ${step}/${total}`
          : "Cắt ảnh sản phẩm"
      }
      open={!!file}
      onCancel={onCancel}
      onOk={confirm}
      okText="Dùng ảnh này"
      cancelText={hasMultiple ? "Bỏ qua ảnh này" : "Huỷ"}
      okButtonProps={{ disabled: !area }}
      confirmLoading={exporting}
      maskClosable={false}
      destroyOnHidden
      width={640}
    >
      {file && (
        <div className="space-y-3 pt-2">
          <p className="text-muted text-sm">
            Ảnh sản phẩm dùng chung một khung {PRODUCT_IMAGE_ASPECT_LABEL} cho thumbnail, thư viện ảnh và ảnh biến
            thể. Ảnh xuất ra là toàn bộ phần nằm trong khung viền xanh — kéo ảnh để chọn
            phần giữ lại, phóng to bằng thanh trượt để cắt bớt (ví dụ bỏ chân case hay dải
            nền thừa). Kiểm tra lại ở ô Xem trước trước khi dùng ảnh.
          </p>

          <div className="bg-subtle border-line relative h-[340px] w-full overflow-hidden rounded-lg border">
            {imageUrl && (
              <Cropper
                image={imageUrl}
                aspect={PRODUCT_IMAGE_ASPECT}
                crop={crop}
                zoom={zoom}
                minZoom={(fitZoom ?? 1) * MIN_ZOOM_RATIO}
                maxZoom={(fitZoom ?? 1) * MAX_ZOOM_RATIO}
                // Không cho kéo ảnh hở khung — hở chỗ nào là chỗ đó thành nền trắng.
                restrictPosition
                showGrid={false}
                zoomWithScroll
                onCropChange={setCrop}
                onZoomChange={(value) => setZoomRatio(value / (fitZoom ?? 1))}
                onMediaLoaded={setMediaSize}
                onCropSizeChange={onCropSizeChange}
                onCropComplete={onCropComplete}
                cropperProps={{
                  "aria-label":
                    "Vùng cắt ảnh sản phẩm — dùng phím mũi tên để chỉnh vị trí",
                }}
                // Ảnh đã phủ kín khung nên nền chỉ lộ ra qua vùng trong suốt của
                // ảnh PNG/WebP — xem trước được phần nền sẽ nằm trong ảnh xuất ra.
                style={{
                  containerStyle: BACKGROUND_PREVIEW[background],
                  // Viền mặc định trắng mờ chìm mất trên ảnh nền sáng, trông như
                  // không có khung — dùng màu brand cho rõ ranh giới vùng xuất ra.
                  cropAreaStyle: { border: "2px solid var(--color-brand)" },
                }}
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-muted w-20 shrink-0 text-xs">Thu phóng</span>
            <Slider
              className="flex-1"
              min={MIN_ZOOM_RATIO}
              max={MAX_ZOOM_RATIO}
              step={0.01}
              value={zoomRatio}
              onChange={setZoomRatio}
              disabled={!fitZoom}
              ariaLabelForHandle="Mức thu phóng ảnh"
              tooltip={{ formatter: (value) => `${Math.round((value ?? 1) * 100)}%` }}
            />
            <Tooltip title="Đưa ảnh về giữa và mức thu phóng mặc định (vừa phủ kín khung)">
              <Button
                size="small"
                icon={<RotateCcw size={14} />}
                onClick={reset}
                disabled={!fitZoom}
              >
                Đặt lại
              </Button>
            </Tooltip>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <span className="text-muted block text-xs">Xem trước (đúng ảnh sẽ lưu)</span>
              <div
                className="border-line relative w-40 overflow-hidden rounded border"
                style={{ ...BACKGROUND_PREVIEW[background], aspectRatio: PRODUCT_IMAGE_ASPECT }}
              >
                {imageUrl && areaPercent && areaPercent.width > 0 && (
                  // eslint-disable-next-line @next/next/no-img-element -- blob URL cục bộ, không qua next/image
                  <img
                    src={imageUrl}
                    alt=""
                    className="absolute max-w-none"
                    style={{
                      width: `${10000 / areaPercent.width}%`,
                      height: `${10000 / areaPercent.height}%`,
                      left: `${(-areaPercent.x * 100) / areaPercent.width}%`,
                      top: `${(-areaPercent.y * 100) / areaPercent.height}%`,
                    }}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted text-xs">Nền</span>
              <Segmented
                size="small"
                value={background}
                onChange={(value) => setBackground(value as CropBackground)}
                options={[
                  { label: "Trắng", value: "white" },
                  { label: "Trong suốt", value: "transparent" },
                ]}
              />
            </div>

            <span
              className={cn("text-xs", isBelowTarget ? "text-warning" : "text-muted")}
            >
              Kích thước xuất ra: {output?.width ?? PRODUCT_IMAGE_OUTPUT_WIDTH} ×{" "}
              {output?.height ?? PRODUCT_IMAGE_OUTPUT_HEIGHT} px
            </span>
          </div>

          {isBelowTarget && (
            <p className="text-warning flex items-start gap-1.5 text-xs">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                Vùng đang chọn chỉ có {output?.width} px chiều ngang, nhỏ hơn chuẩn{" "}
                {PRODUCT_IMAGE_OUTPUT_WIDTH} × {PRODUCT_IMAGE_OUTPUT_HEIGHT}. Ảnh vẫn đúng
                tỉ lệ khung nhưng không được phóng to lên cho khỏi mờ — thu nhỏ bớt hoặc
                chọn ảnh gốc lớn hơn nếu cần ảnh nét.
              </span>
            </p>
          )}

          {file.type === "image/gif" && (
            <p className="text-muted text-xs">
              Ảnh GIF sẽ được xuất thành ảnh tĩnh sau khi cắt.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

/**
 * Xếp hàng lần lượt từng file người dùng vừa chọn qua {@link ProductImageCropper}
 * rồi trả về danh sách ảnh đã cắt — dùng ở mọi chỗ chọn ảnh sản phẩm
 * (`ImageUploadField`, `VariantImagesModal`).
 *
 * Trả `Promise` theo cùng kiểu với `useConfirmDialog`: nơi gọi chỉ cần `await`
 * rồi tiếp tục luồng preview/draft sẵn có, không phải đảo lại state của mình.
 * Bỏ qua một ảnh thì ảnh đó **không** vào kết quả, các ảnh còn lại vẫn tiếp tục.
 */
export function useProductImageCropper() {
  const [queue, setQueue] = useState<File[]>([]);
  const [index, setIndex] = useState(0);
  const [session, setSession] = useState<{
    resolve: (files: File[]) => void;
    results: File[];
  }>();

  const cropFiles = useCallback(
    (files: File[]) =>
      new Promise<File[]>((resolve) => {
        if (!files.length) {
          resolve([]);
          return;
        }
        setQueue(files);
        setIndex(0);
        setSession({ resolve, results: [] });
      }),
    [],
  );

  const advance = (cropped?: File) => {
    if (!session) return;

    const results = cropped ? [...session.results, cropped] : session.results;
    const next = index + 1;

    if (next < queue.length) {
      setIndex(next);
      setSession({ ...session, results });
      return;
    }

    setQueue([]);
    setIndex(0);
    setSession(undefined);
    session.resolve(results);
  };

  const cropperNode = (
    <ProductImageCropper
      file={queue[index]}
      step={index + 1}
      total={queue.length}
      onCancel={() => advance()}
      onConfirm={(cropped) => advance(cropped)}
    />
  );

  return { cropFiles, cropperNode };
}

export default ProductImageCropper;
