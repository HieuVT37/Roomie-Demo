import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * @typedef {Object} AccommodationListing
 * @property {mongoose.Types.ObjectId} ownerId - ID của chủ phòng trọ (tham chiếu model User)
 * @property {string} title - Tiêu đề bài đăng phòng trọ (tối đa 150 ký tự)
 * @property {string} description - Mô tả chi tiết về phòng trọ và không gian sống
 * @property {Object} address - Thông tin địa chỉ hành chính chi tiết
 * @property {string} address.city - Tỉnh / Thành phố
 * @property {string} address.district - Quận / Huyện
 * @property {string} [address.ward] - Phường / Xã
 * @property {string} [address.street] - Số nhà, tên đường
 * @property {Object} [location] - Tọa độ địa lý GeoJSON phục vụ tính năng tìm kiếm theo bán kính
 * @property {number} price - Giá thuê hàng tháng (VNĐ)
 * @property {number} [deposit] - Tiền đặt cọc khi thuê phòng (VNĐ)
 * @property {number} [area] - Diện tích phòng (m2)
 * @property {string} [roomType] - Loại hình phòng ('single' | 'shared' | 'studio' | 'apartment' | 'house')
 * @property {number} [maxOccupants] - Số lượng người ở tối đa
 * @property {string[]} [amenities] - Danh sách tiện ích đi kèm (wifi, điều hòa, nóng lạnh, máy giặt...)
 * @property {Object} [extraCosts] - Chi phí phát sinh hàng tháng (điện, nước, internet...)
 * @property {string[]} [images] - Danh sách URL ảnh của phòng trọ
 * @property {string} [rentalTerms] - Các điều khoản, quy định thuê trọ
 * @property {string} [contactPhone] - Số điện thoại liên hệ chủ trọ
 * @property {Date} [availableFrom] - Ngày phòng bắt đầu có thể dọn vào ở
 * @property {string} status - Trạng thái phòng ('available' | 'rented' | 'stopped')
 * @property {string} moderationStatus - Trạng thái kiểm duyệt bài đăng ('pending' | 'approved' | 'rejected')
 * @property {string} [moderationNote] - Ghi chú phản hồi từ quản trị viên khi duyệt / từ chối
 * @property {number} viewCount - Số lượt xem bài đăng
 * @property {Date} createdAt - Thời điểm tạo bài đăng
 * @property {Date} updatedAt - Thời điểm cập nhật bài đăng gần nhất
 */
const accommodationSchema = new Schema(
  {
    // Liên kết với tài khoản người đăng bài
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Thông tin cơ bản bài đăng
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: "" },

    // Thông tin địa chỉ phân cấp hành chính
    address: {
      city: { type: String, required: true, trim: true },
      district: { type: String, required: true, trim: true },
      ward: { type: String, trim: true },
      street: { type: String, trim: true },
    },

    // GeoJSON định vị tọa độ (chuẩn bị cho tích hợp bản đồ số)
    location: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number], default: undefined },
    },

    // Thông tin tài chính & chi phí
    price: { type: Number, required: true, min: 0 },
    deposit: { type: Number, min: 0 },
    area: { type: Number, min: 0 },

    // Phân loại phòng và sức chứa
    roomType: { type: String, enum: ["single", "shared", "studio", "apartment", "house"] },
    maxOccupants: { type: Number, min: 1 },

    // Danh sách tiện ích
    amenities: [{ type: String, trim: true }],

    // Chi phí dịch vụ bổ sung
    extraCosts: {
      electricity: Number,
      water: Number,
      internet: Number,
      other: String,
    },

    // Hình ảnh thực tế phòng trọ
    images: [String],

    // Quy định và thông tin liên hệ
    rentalTerms: { type: String, default: "" },
    contactPhone: { type: String, default: null },
    availableFrom: { type: Date, default: null },

    // Trạng thái vận hành và kiểm duyệt
    status: { type: String, enum: ["available", "rented", "stopped"], default: "available" },
    moderationStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    moderationNote: { type: String, default: "" },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "accommodationListings" }
);

// Tạo chỉ mục phục vụ truy vấn tìm kiếm nhanh chóng theo địa bàn và trạng thái
accommodationSchema.index({ status: 1, moderationStatus: 1, createdAt: -1 });
accommodationSchema.index({ "address.city": 1, "address.district": 1 });
accommodationSchema.index({ price: 1 });

export default mongoose.model("AccommodationListing", accommodationSchema);
