import { body } from "express-validator";

/**
 * Danh sách các loại hình phòng trọ được hệ thống hỗ trợ
 * @type {string[]}
 */
const ROOM_TYPES = ["single", "shared", "studio", "apartment", "house"];

/**
 * Biểu thức chính quy kiểm tra định dạng đường dẫn ảnh hợp lệ (ảnh upload nội bộ hoặc URL bên ngoài)
 * @type {RegExp}
 */
const IMAGE_RE = /^(\/uploads\/[\w-]+\.(jpg|png|webp)|https?:\/\/\S+)$/;

/**
 * Helper sinh middleware validate cho trường dữ liệu tiền tệ (VNĐ)
 * @param {string} path - Đường dẫn trường trong body request
 * @param {string} label - Tên nhãn hiển thị trong thông báo lỗi
 * @returns {ValidationChain}
 */
const money = (path, label) =>
  body(path).optional().isInt({ min: 0, max: 1_000_000_000 }).withMessage(`${label} không hợp lệ`).toInt();

/**
 * Tập hợp các quy tắc kiểm tra tính hợp lệ dữ liệu (Validation Rules)
 * Dùng cho cả tạo mới bài đăng phòng trọ (POST) và cập nhật bài đăng (PUT)
 * @type {Array<import('express-validator').ValidationChain>}
 */
export const listingRules = [
  // Tiêu đề & mô tả bài đăng
  body("title").trim().isLength({ min: 5, max: 150 }).withMessage("Tiêu đề từ 5 đến 150 ký tự"),
  body("description").optional().isLength({ max: 5000 }).withMessage("Mô tả tối đa 5000 ký tự"),

  // Địa chỉ hành chính bắt buộc
  body("address.city").trim().notEmpty().withMessage("Vui lòng nhập thành phố"),
  body("address.district").trim().notEmpty().withMessage("Vui lòng nhập quận/huyện"),
  body("address.ward").optional().trim().isLength({ max: 100 }),
  body("address.street").optional().trim().isLength({ max: 200 }),

  // Giá thuê chính & tiền đặt cọc
  body("price").isInt({ min: 0, max: 1_000_000_000 }).withMessage("Giá thuê không hợp lệ").toInt(),
  money("deposit", "Tiền cọc"),

  // Diện tích & sức chứa
  body("area").optional().isFloat({ min: 1, max: 1000 }).withMessage("Diện tích từ 1 đến 1000 m²").toFloat(),
  body("roomType").isIn(ROOM_TYPES).withMessage("Loại phòng không hợp lệ"),
  body("maxOccupants").optional().isInt({ min: 1, max: 20 }).withMessage("Số người tối đa không hợp lệ").toInt(),

  // Danh mục tiện ích đi kèm
  body("amenities").optional().isArray({ max: 30 }).withMessage("Tối đa 30 tiện nghi"),
  body("amenities.*").trim().isLength({ min: 1, max: 50 }),

  // Chi phí phụ trợ hàng tháng
  money("extraCosts.electricity", "Giá điện"),
  money("extraCosts.water", "Giá nước"),
  money("extraCosts.internet", "Phí internet"),
  body("extraCosts.other").optional().isLength({ max: 200 }),

  // Hình ảnh thực tế phòng trọ (tối đa 8 ảnh)
  body("images").optional().isArray({ max: 8 }).withMessage("Tối đa 8 ảnh"),
  body("images.*").matches(IMAGE_RE).withMessage("Đường dẫn ảnh không hợp lệ"),

  // Điều khoản thuê và thời gian bàn giao
  body("rentalTerms").optional().isLength({ max: 2000 }),
  body("availableFrom").optional({ nullable: true }).isISO8601().withMessage("Ngày có thể dọn vào không hợp lệ").toDate(),
  body("contactPhone").optional({ nullable: true }).matches(/^[0-9+\s().-]{8,20}$/).withMessage("Số điện thoại không hợp lệ"),
];

/**
 * Quy tắc kiểm tra cập nhật trạng thái bài đăng phòng trọ (PATCH /status)
 * @type {Array<import('express-validator').ValidationChain>}
 */
export const statusRules = [
  body("status").isIn(["available", "rented", "stopped"]).withMessage("Trạng thái không hợp lệ"),
];

/**
 * Quy tắc kiểm tra thao tác lưu danh mục yêu thích
 * @type {Array<import('express-validator').ValidationChain>}
 */
export const favoriteRules = [
  body("targetType").isIn(["accommodation", "pass"]).withMessage("Loại mục yêu thích không hợp lệ"),
  body("targetId").isMongoId().withMessage("Mã mục yêu thích không hợp lệ"),
];
