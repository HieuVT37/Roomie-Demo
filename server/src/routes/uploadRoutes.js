import { Router } from "express";
import StoredFile from "../models/StoredFile.js";
import { requireAuth } from "../middlewares/auth.js";
import { uploadImages } from "../middlewares/upload.js";
import { processImage } from "../services/imageService.js";
import { httpError, asyncHandler } from "../utils/httpError.js";

/**
 * Giới hạn số lượng ảnh công khai tối đa một tài khoản có thể lưu trữ trong hệ thống
 * Mục đích: Ngăn chặn hành vi lạm dụng tài nguyên bộ nhớ MongoDB (Database Quota)
 * @constant {number}
 */
const MAX_PUBLIC_FILES_PER_USER = 80;

const router = Router();

/**
 * @route   POST /api/uploads/images
 * @desc    Tải lên danh sách hình ảnh (phòng trọ, pass đồ, ảnh đại diện), tối ưu WebP và lưu trữ
 * @access  Yêu cầu đăng nhập (requireAuth)
 */
router.post(
  "/images",
  requireAuth,
  uploadImages,
  asyncHandler(async (req, res) => {
    const files = req.files || [];
    if (!files.length) throw httpError(400, "Chưa chọn ảnh nào");

    // Kiểm tra hạn mức lưu trữ ảnh của tài khoản
    const used = await StoredFile.countDocuments({ ownerId: req.user._id, kind: "public" });
    if (used + files.length > MAX_PUBLIC_FILES_PER_USER) {
      throw httpError(403, "Bạn đã tải lên quá nhiều ảnh, không thể tải thêm");
    }

    // Xử lý nén ảnh qua Sharp và lưu bản ghi vào MongoDB
    const urls = [];
    for (const f of files) {
      const { data, size } = await processImage(f.buffer);
      const doc = await StoredFile.create({
        kind: "public",
        ownerId: req.user._id,
        contentType: "image/webp",
        size,
        data,
      });
      urls.push(`/uploads/${doc._id}.webp`);
    }

    res.status(201).json({ urls });
  })
);

export default router;
