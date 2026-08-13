/**
 * Cắt ảnh sản phẩm về khung 4:3 ngay trên trình duyệt, trước khi file được đưa
 * vào preview/draft của form. Đứng cạnh `imageUpload.ts` (validate định dạng +
 * dung lượng) để mọi nơi chọn ảnh sản phẩm cùng dùng một chuẩn đầu ra.
 *
 * Vì sao 4:3: storefront hiển thị ảnh sản phẩm trong khung 4:3 ở trang chi tiết
 * và card mobile, còn listing desktop dùng khung vuông với `object-contain` —
 * ảnh 4:3 dùng lại được cho cả thumbnail, gallery lẫn ảnh biến thể mà không chỗ
 * nào bị cắt cụt.
 */

import { MAX_IMAGE_SIZE_MB } from "./imageUpload";

export const PRODUCT_IMAGE_ASPECT = 4 / 3;
export const PRODUCT_IMAGE_OUTPUT_WIDTH = 1600;
export const PRODUCT_IMAGE_OUTPUT_HEIGHT = 1200;

/**
 * Khoảng trống nên chừa quanh sản phẩm ở mỗi cạnh (8–12%): listing desktop đặt
 * ảnh trong khung vuông nên hai mép trái/phải bị thu lại, sản phẩm sát mép sẽ
 * trông như bị cắt.
 */
export const PRODUCT_IMAGE_SAFE_PADDING = 0.1;

/** Nền lấp phần khung 4:3 không được ảnh gốc phủ kín */
export type CropBackground = "white" | "transparent";

/** Vùng cắt tính theo pixel của ảnh gốc — đúng dạng `croppedAreaPixels` của react-easy-crop */
export interface PixelCropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const OUTPUT_TYPE = "image/webp";

/** Backend nhận jpeg/png/webp/gif, nên WebP không encode được thì vẫn còn đường lui */
const FALLBACK_TYPE: Record<CropBackground, string> = {
  white: "image/jpeg",
  transparent: "image/png",
};

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** Giảm dần chất lượng cho tới khi ảnh lọt giới hạn dung lượng của endpoint upload */
const QUALITY_STEPS = [0.92, 0.8, 0.68];

const MAX_OUTPUT_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

/**
 * Không phóng to ảnh nhỏ lên 1600px — làm vậy chỉ khiến ảnh mờ chứ không thêm
 * chi tiết. Ảnh thiếu độ phân giải được xuất đúng bằng số pixel thật của vùng
 * cắt, vẫn giữ nguyên tỉ lệ 4:3 (UI cảnh báo người dùng ở `ProductImageCropper`).
 */
export function resolveOutputSize(cropWidth: number) {
  const width = Math.max(1, Math.min(PRODUCT_IMAGE_OUTPUT_WIDTH, Math.round(cropWidth)));

  return width >= PRODUCT_IMAGE_OUTPUT_WIDTH
    ? { width: PRODUCT_IMAGE_OUTPUT_WIDTH, height: PRODUCT_IMAGE_OUTPUT_HEIGHT }
    : { width, height: Math.round(width / PRODUCT_IMAGE_ASPECT) };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không đọc được ảnh vừa chọn"));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

async function encode(canvas: HTMLCanvasElement, background: CropBackground) {
  let encoded: Blob | null = null;

  for (const quality of QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, OUTPUT_TYPE, quality);
    if (!blob) break;

    encoded = blob;
    // Trình duyệt không encode được WebP thì `toBlob` trả về PNG theo spec —
    // PNG không đổi dung lượng theo `quality` nên thử tiếp cũng vô ích.
    if (blob.size <= MAX_OUTPUT_BYTES || blob.type !== OUTPUT_TYPE) break;
  }

  if (encoded) return encoded;

  const fallback = await canvasToBlob(canvas, FALLBACK_TYPE[background], 0.9);
  if (!fallback) throw new Error("Trình duyệt không xuất được ảnh sau khi cắt");
  return fallback;
}

/** Giữ tên gốc cho dễ nhận ra trên R2, chỉ đổi đuôi theo định dạng thực sự xuất ra */
function renameWithExtension(name: string, type: string) {
  const base = name.replace(/\.[^./\\]+$/, "").trim();
  return `${base || "product-image"}.${EXTENSION_BY_TYPE[type] ?? "webp"}`;
}

export interface CropImageOptions {
  file: File;
  area: PixelCropArea;
  background?: CropBackground;
}

/**
 * Trả về `File` mới (mặc định WebP) dùng thẳng được cho luồng multipart hiện
 * có — `thumbnailFile` / `imagesFiles` của `POST /products`, `PATCH
 * /products/{id}`, `PATCH /variants/{id}` và `POST /uploads/images`.
 */
export async function cropImageToFile({
  file,
  area,
  background = "white",
}: CropImageOptions): Promise<File> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const { width, height } = resolveOutputSize(area.width);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Trình duyệt không hỗ trợ cắt ảnh");

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    if (background === "white") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
    }

    /*
     * Vẽ trọn ảnh gốc rồi dịch/thu phóng theo vùng cắt thay vì dùng source rect
     * của `drawImage`: khi người dùng thu nhỏ để lấy trọn sản phẩm, vùng cắt
     * tràn ra ngoài mép ảnh — phần tràn đó để lộ nền đã tô sẵn ở trên.
     */
    const scale = width / area.width;
    context.drawImage(
      image,
      -area.x * scale,
      -area.y * scale,
      image.naturalWidth * scale,
      image.naturalHeight * scale,
    );

    const blob = await encode(canvas, background);

    return new File([blob], renameWithExtension(file.name, blob.type), {
      type: blob.type,
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
