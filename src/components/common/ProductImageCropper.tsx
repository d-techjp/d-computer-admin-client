"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Button, Modal, Segmented, Slider, Tooltip } from "antd";
import { AlertTriangle, RotateCcw } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area, MediaSize, Point, Size } from "react-easy-crop";

import {
  cropImageToFile,
  PRODUCT_IMAGE_ASPECT,
  PRODUCT_IMAGE_OUTPUT_HEIGHT,
  PRODUCT_IMAGE_OUTPUT_WIDTH,
  PRODUCT_IMAGE_SAFE_PADDING,
  resolveOutputSize,
  type CropBackground,
} from "@/lib/imageCrop";
import { cn } from "@/lib/utils";

/** Thu nhỏ tối đa so với mức "vừa khung" để chừa thêm khoảng trống quanh sản phẩm */
const MIN_ZOOM_RATIO = 0.5;
/** Phóng to tối đa so với mức "vừa khung" */
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
 * Cắt ảnh sản phẩm về 4:3 ngang trước khi ảnh vào preview/draft của form.
 *
 * Mặc định mở ở mức "vừa khung": toàn bộ ảnh gốc nằm trong khung 4:3, phần
 * thừa lấp bằng nền — không tấm nào bị cắt mất sản phẩm nếu người dùng bấm xác
 * nhận ngay. Muốn cắt sát hơn thì kéo ảnh và phóng to bằng slider; khung nét
 * đứt bên trong là vùng an toàn {@link PRODUCT_IMAGE_SAFE_PADDING}, giữ sản
 * phẩm bên trong nó thì listing desktop (khung vuông) vẫn hiển thị trọn vẹn.
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
   * khung 4:3): mức tuyệt đối chỉ tính được sau khi ảnh tải xong, mà chỉnh lại
   * state theo sau đó thì phải dùng effect + setState — vòng render thừa và
   * react-hooks/set-state-in-effect chặn. Cách này cho luôn mặc định đúng ngay
   * từ lần render đầu và slider cũng đọc thẳng ra phần trăm.
   */
  const [zoomRatio, setZoomRatio] = useState(1);
  const [mediaSize, setMediaSize] = useState<MediaSize>();
  const [cropSize, setCropSize] = useState<Size>();
  const [area, setArea] = useState<Area>();
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
    setBackground("white");
  }

  const imageUrl = useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file]);
  useEffect(() => (imageUrl ? () => URL.revokeObjectURL(imageUrl) : undefined), [imageUrl]);

  /** Mức zoom vừa đủ để trọn ảnh gốc lọt vào khung 4:3 — gốc quy chiếu của slider */
  const fitZoom =
    mediaSize && cropSize
      ? Math.min(cropSize.width / mediaSize.width, cropSize.height / mediaSize.height)
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

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

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
            Ảnh sản phẩm dùng chung một khung 4:3 cho thumbnail, thư viện ảnh và ảnh biến
            thể. Kéo ảnh để chỉnh vị trí, dùng thanh trượt để phóng to — giữ sản phẩm nằm
            trong khung nét đứt và chừa khoảng trống quanh sản phẩm khoảng{" "}
            {Math.round(PRODUCT_IMAGE_SAFE_PADDING * 100) - 2}–
            {Math.round(PRODUCT_IMAGE_SAFE_PADDING * 100) + 2}%.
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
                // Cho phép kéo ảnh ra ngoài khung để lấy trọn sản phẩm kèm
                // khoảng trống; phần khung không có ảnh được lấp bằng nền.
                restrictPosition={false}
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
                // Nền của khung chứa lộ ra đúng ở phần khung 4:3 không có ảnh,
                // nên xem trước được luôn phần nền sẽ nằm trong ảnh xuất ra.
                style={{ containerStyle: BACKGROUND_PREVIEW[background] }}
              />
            )}

            {/* Vùng an toàn: khung nét đứt lồng bên trong khung cắt 4:3 */}
            {cropSize && (
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ width: cropSize.width, height: cropSize.height }}
              >
                {/*
                 * Nền trong khung cắt là ảnh sản phẩm trên nền trắng nên viền
                 * trắng chìm mất — dùng màu brand kèm quầng tối mảnh để nét đứt
                 * còn thấy được cả trên nền sáng lẫn trên ảnh tối.
                 */}
                <div
                  className="border-brand absolute rounded-sm border-2 border-dashed shadow-[0_0_0_1px_rgb(0_0_0/0.25)]"
                  style={{ inset: `${PRODUCT_IMAGE_SAFE_PADDING * 100}%` }}
                />
              </div>
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
            <Tooltip title="Đưa ảnh về vị trí và mức thu phóng mặc định (vừa khung)">
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

          <div className="flex flex-wrap items-center justify-between gap-3">
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
                tỉ lệ 4:3 nhưng không được phóng to lên cho khỏi mờ — thu nhỏ bớt hoặc
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
