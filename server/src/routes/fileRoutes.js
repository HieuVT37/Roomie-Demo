import { Router } from "express";
import StoredFile from "../models/StoredFile.js";
import { httpError, asyncHandler } from "../utils/httpError.js";

/**
 * Biểu thức chính quy kiểm tra định dạng tên file hợp lệ (24 ký tự hex của ObjectId + đuôi .webp)
 * Ngăn chặn Path Traversal và truy vấn dữ liệu sai định dạng
 * @constant {RegExp}
 */
const NAME_RE = /^[0-9a-f]{24}\.webp$/;

const router = Router();

/**
 * @route   GET /uploads/:name
 * @desc    Truy xuất và truyền phát (stream) dữ liệu nhị phân của ảnh công khai từ MongoDB
 * @access  Công khai (Kèm Cache-Control 1 năm immutable để tối ưu tốc độ tải trang phía client)
 */
router.get(
  "/:name",
  asyncHandler(async (req, res) => {
    if (!NAME_RE.test(req.params.name)) throw httpError(404, "Không tìm thấy ảnh");

    const file = await StoredFile.findOne({ _id: req.params.name.slice(0, 24), kind: "public" }).select("data contentType");
    if (!file) throw httpError(404, "Không tìm thấy ảnh");

    // Thiết lập HTTP Caching header - ID ảnh là duy nhất và bất biến nên cache vĩnh viễn trên trình duyệt
    res.set({
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    });
    res.send(file.data);
  })
);

export default router;
