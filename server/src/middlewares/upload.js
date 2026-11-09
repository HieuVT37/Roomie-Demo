import multer from "multer";
import { httpError } from "../utils/httpError.js";

/**
 * Danh sách định dạng MIME Type hình ảnh được phép tải lên hệ thống
 * @constant {string[]}
 */
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/**
 * Khởi tạo middleware Multer xử lý tải file lên bộ nhớ RAM (Memory Storage)
 * Giới hạn dung lượng tối đa 5MB mỗi file ảnh
 * @param {number} maxFiles - Số lượng file tối đa cho phép trong một lần tải
 * @returns {import('express').RequestHandler} Middleware Multer
 */
const buildUploader = (maxFiles) =>
  multer({
    // Lưu tạm file vào memory buffer trước khi nén hoặc lưu trữ
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 Megabytes
      files: maxFiles,
    },
    // Bộ lọc kiểm tra định dạng file ảnh an toàn
    fileFilter: (req, file, cb) =>
      ALLOWED.includes(file.mimetype)
        ? cb(null, true)
        : cb(httpError(400, "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP")),
  }).array("images", maxFiles);

/**
 * Middleware upload ảnh bài đăng phòng trọ / pass đồ (tối đa 8 ảnh cùng lúc)
 * @type {import('express').RequestHandler}
 */
export const uploadImages = buildUploader(8);

/**
 * Middleware upload ảnh trong tin nhắn trao đổi trò chuyện (tối đa 4 ảnh)
 * @type {import('express').RequestHandler}
 */
export const uploadChatImages = buildUploader(4);
