/**
 * Hằng số + tiện ích dùng chung cho mọi nơi cho phép chọn ảnh từ máy —
 * `ImageUploadField` (ảnh sản phẩm) và `VariantImagesModal` (ảnh riêng biến
 * thể). Tách riêng để hai nơi luôn validate giống hệt nhau thay vì mỗi chỗ tự
 * định nghĩa lại danh sách định dạng/giới hạn dung lượng.
 */

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

export const MAX_IMAGE_SIZE_MB = 5;

export function isAcceptedImageType(file: File) {
  return ACCEPTED_IMAGE_TYPES.includes(file.type);
}

export function isWithinImageSizeLimit(file: File) {
  return file.size <= MAX_IMAGE_SIZE_MB * 1024 * 1024;
}

export function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
