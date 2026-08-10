/**
 * Dựng `FormData` cho các endpoint multipart.
 *
 * OpenAPI khai `POST /products`, `PATCH /products/{id}` và
 * `PATCH /variants/{id}` **chỉ nhận `multipart/form-data`** (không có biến thể
 * `application/json`), nên mọi mutation của master và biến thể đều đi qua đây
 * kể cả khi không kèm file. Cả hai nhóm endpoint dùng chung một convention —
 * `thumbnail`/`thumbnailFile` cho ảnh đại diện, `images`/`imagesFiles` cho
 * gallery, object lồng nhau (`variants`, `specifications`) gửi dạng chuỗi JSON.
 */

/** Một ảnh trong form: hoặc URL đã có trên R2, hoặc file người dùng vừa chọn */
export interface ImageInput {
  url?: string;
  file?: File;
}

/**
 * Bỏ qua `undefined` / `null` / chuỗi rỗng để PATCH không vô tình ghi đè
 * trường đang có giá trị bằng rỗng. Số `0` và `false` vẫn được gửi.
 */
export function appendField(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") return;

  if (value instanceof File) {
    formData.append(key, value);
    return;
  }
  if (typeof value === "object") {
    formData.append(key, JSON.stringify(value));
    return;
  }
  formData.append(key, String(value));
}

export function appendFields(formData: FormData, fields: Record<string, unknown>) {
  for (const [key, value] of Object.entries(fields)) {
    appendField(formData, key, value);
  }
}

/**
 * Ảnh đầu tiên là thumbnail, phần còn lại là gallery — đúng thứ tự người dùng
 * sắp xếp trong `ImageUploadField`. Ảnh đã có URL gửi lại nguyên URL, ảnh mới
 * gửi file để backend tự upload lên R2.
 *
 * `images` **luôn được gửi**, kể cả khi rỗng: contract ghi *"không gửi
 * thumbnail/images thì giữ nguyên ảnh hiện có"*, nên bỏ qua field khi danh
 * sách rỗng đồng nghĩa với ảnh vừa xoá sẽ quay lại ngay sau khi lưu. Gửi dạng
 * chuỗi JSON vì multipart không diễn đạt được "mảng rỗng" — field rỗng bị
 * backend hiểu là `undefined`.
 *
 * Riêng thumbnail thì vẫn **không xoá được**: gửi chuỗi rỗng bị `@IsUrl` chặn,
 * không gửi thì backend giữ ảnh cũ. Vì vậy form phải giữ lại ít nhất 1 ảnh
 * (xem `minCount` của `ImageUploadField`).
 */
export function appendImages(
  formData: FormData,
  images: ImageInput[],
  keys: {
    thumbnail: string;
    thumbnailFile: string;
    images: string;
    imagesFiles: string;
  } = {
    thumbnail: "thumbnail",
    thumbnailFile: "thumbnailFile",
    images: "images",
    imagesFiles: "imagesFiles",
  },
) {
  const usable = images.filter((image) => image.file || image.url);
  const [thumbnail, ...gallery] = usable;

  if (thumbnail?.file) {
    formData.append(keys.thumbnailFile, thumbnail.file);
  } else if (thumbnail?.url) {
    formData.append(keys.thumbnail, thumbnail.url);
  }

  const galleryUrls = gallery.flatMap((image) =>
    !image.file && image.url ? [image.url] : [],
  );
  formData.append(keys.images, JSON.stringify(galleryUrls));

  for (const image of gallery) {
    if (image.file) formData.append(keys.imagesFiles, image.file);
  }
}

/**
 * `images === undefined` = không đụng tới ảnh; mảng (kể cả rỗng) = thay thế
 * đúng những gì được truyền vào.
 */
export function buildFormData(fields: Record<string, unknown>, images?: ImageInput[]) {
  const formData = new FormData();
  appendFields(formData, fields);
  if (images) appendImages(formData, images);
  return formData;
}
