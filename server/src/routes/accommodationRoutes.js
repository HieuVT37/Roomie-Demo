import { Router } from "express";
import {
  getMeta,
  listAccommodations,
  getAccommodation,
  myAccommodations,
  createAccommodation,
  updateAccommodation,
  setStatus,
  removeAccommodation,
} from "../controllers/accommodationController.js";
import { requireAuth, optionalAuth } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { listingRules, statusRules } from "../validators/accommodationValidator.js";

const router = Router();

/**
 * -------------------------------------------------------------
 * Tuyến đường công khai & tra cứu (Public & Discovery Routes)
 * Lưu ý: Các route cố định (/meta, /mine) phải đặt trước route động (/:id)
 * -------------------------------------------------------------
 */

// Lấy siêu dữ liệu địa bàn phục vụ thanh tìm kiếm
router.get("/meta", getMeta);

// Lấy danh sách các bài đăng thuộc quyền quản lý của chủ trọ hiện tại
router.get("/mine", requireAuth, myAccommodations);

// Tìm kiếm, lọc và phân trang danh sách phòng trọ (cho phép cả khách vãng lai và user)
router.get("/", optionalAuth, listAccommodations);

// Xem chi tiết một bài đăng phòng trọ theo mã định danh
router.get("/:id", optionalAuth, getAccommodation);

/**
 * -------------------------------------------------------------
 * Tuyến đường quản lý bài đăng của chủ trọ (Landlord CRUD Routes)
 * Yêu cầu: Xác thực tài khoản (requireAuth) và kiểm tra tính hợp lệ dữ liệu (validate)
 * -------------------------------------------------------------
 */

// Đăng tin phòng trọ mới
router.post("/", requireAuth, listingRules, validate, createAccommodation);

// Cập nhật thông tin chi tiết bài đăng phòng trọ
router.put("/:id", requireAuth, listingRules, validate, updateAccommodation);

// Cập nhật trạng thái hiển thị của phòng (sẵn sàng, đã thuê, tạm dừng)
router.patch("/:id/status", requireAuth, statusRules, validate, setStatus);

// Xóa vĩnh viễn bài đăng phòng trọ
router.delete("/:id", requireAuth, removeAccommodation);

export default router;
