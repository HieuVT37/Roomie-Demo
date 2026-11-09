import api from "./axios";

/**
 * Tải danh sách các file hình ảnh lên server và nhận về mảng đường dẫn WebP
 * @param {File[]} files - Danh sách các đối tượng File ảnh được chọn từ trình duyệt
 * @returns {Promise<{ urls: string[] }>} Mảng đường dẫn ảnh trên hệ thống
 */
export const uploadImagesApi = (files) => {
  const form = new FormData();
  files.forEach((f) => form.append("images", f));
  return api.post("/uploads/images", form).then((r) => r.data);
};
