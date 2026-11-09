import mongoose from "mongoose";
import AccommodationListing from "../models/AccommodationListing.js";
import Favorite from "../models/Favorite.js";
import Profile from "../models/Profile.js";
import { getPlanLimits } from "../services/planService.js";
import { httpError, asyncHandler } from "../utils/httpError.js";

/**
 * Điều kiện lọc mặc định cho các bài đăng hiển thị công khai trên hệ thống
 * @constant {Object}
 */
const PUBLIC = { status: "available", moderationStatus: "approved" };

/**
 * Danh sách các trường dữ liệu hợp lệ cho một bài đăng phòng trọ
 * @constant {string[]}
 */
const FIELDS = [
  "title", "description", "address", "price", "deposit", "area", "roomType", "maxOccupants",
  "amenities", "extraCosts", "images", "rentalTerms", "availableFrom", "contactPhone",
];

/**
 * Ánh xạ các kiểu sắp xếp bài đăng từ query parameter sang cú pháp sắp xếp của MongoDB
 * @constant {Object<string, Object>}
 */
const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  area_desc: { area: -1 },
};

/**
 * Ép kiểu dữ liệu chuỗi an toàn, loại bỏ khoảng trắng thừa
 * Ngăn chặn tấn công NoSQL Injection qua query string dạng object
 * @param {unknown} v - Giá trị đầu vào
 * @returns {string} Chuỗi ký tự đã chuẩn hóa
 */
const str = (v) => (typeof v === "string" ? v.trim() : "");

/**
 * Ép kiểu dữ liệu số an toàn từ chuỗi truy vấn
 * @param {unknown} v - Giá trị đầu vào
 * @returns {number|null} Số hợp lệ hoặc null nếu không phải số hợp lệ
 */
const num = (v) => {
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Thoát các ký tự đặc biệt của biểu thức chính quy (Regex) để tìm kiếm an toàn
 * @param {string} s - Chuỗi cần xử lý
 * @returns {string} Chuỗi an toàn để đưa vào RegExp
 */
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Chuyển đổi dữ liệu Document MongoDB thành Data Transfer Object (DTO) cho client
 * Đảm bảo tính nhất quán của dữ liệu trả về và ẩn các trường nhạy cảm
 * @param {Object} l - Đối tượng listing từ MongoDB
 * @param {Object} [extra={}] - Các trường dữ liệu bổ sung (ví dụ: isFavorite, moderationNote)
 * @returns {Object} Đối tượng DTO chuẩn
 */
const toDto = (l, extra = {}) => ({
  id: l._id,
  ownerId: l.ownerId,
  title: l.title,
  description: l.description,
  address: l.address,
  price: l.price,
  deposit: l.deposit,
  area: l.area,
  roomType: l.roomType,
  maxOccupants: l.maxOccupants,
  amenities: l.amenities || [],
  extraCosts: l.extraCosts || {},
  images: l.images || [],
  rentalTerms: l.rentalTerms,
  availableFrom: l.availableFrom,
  status: l.status,
  moderationStatus: l.moderationStatus,
  viewCount: l.viewCount,
  createdAt: l.createdAt,
  ...extra,
});

/**
 * Lấy tập hợp các ID phòng trọ mà người dùng đã lưu vào danh sách yêu thích
 * @param {Object|null} user - Thông tin người dùng hiện tại
 * @param {Array<mongoose.Types.ObjectId>} ids - Danh sách ID các phòng trọ cần kiểm tra
 * @returns {Promise<Set<string>>} Tập hợp ID đã được yêu thích
 */
async function favoriteSet(user, ids) {
  if (!user || !ids.length) return new Set();
  const favs = await Favorite.find({ userId: user._id, targetType: "accommodation", targetId: { $in: ids } }).lean();
  return new Set(favs.map((f) => String(f.targetId)));
}

/**
 * Đếm số lượng bài đăng phòng trọ đang hiển thị (available) của một chủ trọ
 * @param {mongoose.Types.ObjectId} ownerId - ID của chủ phòng trọ
 * @returns {Promise<number>} Số lượng tin đang khả dụng
 */
const countActive = (ownerId) => AccommodationListing.countDocuments({ ownerId, status: "available" });

/**
 * Kiểm tra quyền hạn và hạn mức đăng tin của người dùng dựa theo gói dịch vụ (Subscription Plan)
 * Thực hiện kiểm tra chặt chẽ ở backend để đảm bảo tính toàn vẹn
 * @param {Object} user - Thông tin người dùng
 * @throws {HttpError} Ném lỗi 403 nếu không đủ quyền hoặc vượt quá hạn mức
 */
async function assertCanPost(user) {
  if (!user.isLandlord) {
    throw httpError(403, "Tài khoản của bạn chưa được cấp quyền đăng tin cho thuê", "NOT_LANDLORD");
  }
  const limits = await getPlanLimits(user.currentPlan);
  if (!limits.canPostAccommodation) {
    throw httpError(403, "Gói hiện tại không hỗ trợ đăng tin cho thuê, hãy nâng cấp gói", "PLAN_REQUIRED");
  }
  const active = await countActive(user._id);
  if (active >= limits.maxActiveAccommodationListings) {
    throw httpError(
      403,
      `Bạn đã đạt giới hạn ${limits.maxActiveAccommodationListings} tin đang hiển thị của gói ${user.currentPlan}`,
      "QUOTA_EXCEEDED"
    );
  }
}

/**
 * Thiết lập trạng thái kiểm duyệt khởi tạo cho tin mới
 * @returns {string} Trạng thái 'pending'
 */
const initialModeration = () => "pending";

/**
 * Trích xuất chỉ các trường dữ liệu hợp lệ từ object gửi lên
 * @param {Object} obj - Dữ liệu đầu vào
 * @param {string[]} keys - Danh sách các khóa cần lấy
 * @returns {Object} Đối tượng mới chỉ chứa các khóa được chỉ định
 */
const pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj[k]]));

/**
 * Tìm và nạp bài đăng thuộc quyền sở hữu của người dùng hiện tại
 * @param {string} id - ID bài đăng
 * @param {Object} user - Người dùng yêu cầu
 * @returns {Promise<import('mongoose').Document>} Document bài đăng
 * @throws {HttpError} Ném lỗi 404 nếu không tìm thấy hoặc không thuộc quyền sở hữu
 */
async function loadOwned(id, user) {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, "Không tìm thấy tin");
  const listing = await AccommodationListing.findOne({ _id: id, ownerId: user._id });
  if (!listing) throw httpError(404, "Không tìm thấy tin");
  return listing;
}

/* ---------------- API Công khai (Public Endpoints) ---------------- */

/**
 * @route   GET /api/accommodations/meta
 * @desc    Lấy danh sách các quận/huyện có bài đăng phòng trọ khả dụng phục vụ bộ lọc
 * @access  Công khai
 */
export const getMeta = asyncHandler(async (req, res) => {
  const districts = await AccommodationListing.distinct("address.district", PUBLIC);
  res.json({ districts: districts.sort((a, b) => a.localeCompare(b, "vi")) });
});

/**
 * @route   GET /api/accommodations
 * @desc    Tìm kiếm và phân trang danh sách phòng trọ theo các tiêu chí lọc
 * @access  Công khai
 */
export const listAccommodations = asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = { ...PUBLIC };

  // Lọc theo địa bàn hành chính
  if (str(q.city)) filter["address.city"] = str(q.city);
  if (str(q.district)) filter["address.district"] = str(q.district);
  if (str(q.roomType)) filter.roomType = str(q.roomType);

  // Lọc theo khoảng giá
  const minPrice = num(q.minPrice);
  const maxPrice = num(q.maxPrice);
  if (minPrice !== null || maxPrice !== null) {
    filter.price = {};
    if (minPrice !== null) filter.price.$gte = minPrice;
    if (maxPrice !== null) filter.price.$lte = maxPrice;
  }

  // Lọc theo diện tích tối thiểu
  const minArea = num(q.minArea);
  if (minArea !== null) filter.area = { $gte: minArea };

  // Lọc theo tiện ích (yêu cầu chứa đủ tất cả tiện ích chọn)
  const amenities = str(q.amenities).split(",").map((s) => s.trim()).filter(Boolean);
  if (amenities.length) filter.amenities = { $all: amenities };

  // Tìm kiếm từ khóa tự do
  const keyword = str(q.q);
  if (keyword) {
    const re = new RegExp(escapeRegex(keyword), "i");
    filter.$or = [{ title: re }, { "address.street": re }, { "address.ward": re }, { "address.district": re }];
  }

  // Phân trang & sắp xếp
  const page = Math.max(1, parseInt(q.page) || 1);
  const limit = Math.min(30, Math.max(1, parseInt(q.limit) || 12));
  const sort = { ...(SORTS[str(q.sort)] || SORTS.newest), _id: -1 };

  const [items, total] = await Promise.all([
    AccommodationListing.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    AccommodationListing.countDocuments(filter),
  ]);
  const favs = await favoriteSet(req.user, items.map((i) => i._id));

  res.json({
    items: items.map((l) => toDto(l, { isFavorite: favs.has(String(l._id)) })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

/**
 * @route   GET /api/accommodations/:id
 * @desc    Lấy chi tiết một bài đăng phòng trọ kèm thông tin chủ trọ và trạng thái yêu thích
 * @access  Công khai (yêu cầu đăng nhập để thấy số điện thoại liên hệ)
 */
export const getAccommodation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw httpError(404, "Không tìm thấy tin");

  const l = await AccommodationListing.findById(id).lean();
  const isOwner = Boolean(l && req.user && String(l.ownerId) === String(req.user._id));
  const isAdmin = req.user?.role === "admin";
  const publiclyVisible = l && l.moderationStatus === "approved" && l.status !== "stopped";
  if (!l || (!publiclyVisible && !isOwner && !isAdmin)) throw httpError(404, "Không tìm thấy tin");

  // Tăng lượt xem tin (chỉ tăng khi người xem không phải chủ tin hoặc admin)
  if (!isOwner && !isAdmin) AccommodationListing.updateOne({ _id: id }, { $inc: { viewCount: 1 } }).catch(() => { });

  const [ownerProfile, favs] = await Promise.all([
    Profile.findOne({ userId: l.ownerId }).select("displayName avatarUrl").lean(),
    favoriteSet(req.user, [l._id]),
  ]);

  res.json({
    listing: toDto(l),
    owner: {
      userId: l.ownerId,
      displayName: ownerProfile?.displayName || "Chủ trọ",
      avatarUrl: ownerProfile?.avatarUrl || null,
    },
    isOwner,
    isFavorite: favs.has(String(l._id)),
    // Chỉ người đã đăng nhập mới thấy thông tin liên hệ
    contactPhone: req.user ? l.contactPhone || null : null,
  });
});

/* ---------------- Quản lý của Chủ trọ (Landlord Endpoints) ---------------- */

/**
 * @route   GET /api/accommodations/mine
 * @desc    Lấy danh sách toàn bộ bài đăng của chủ trọ kèm hạn mức đăng tin
 * @access  Yêu cầu đăng nhập
 */
export const myAccommodations = asyncHandler(async (req, res) => {
  const [items, limits, active] = await Promise.all([
    AccommodationListing.find({ ownerId: req.user._id }).sort({ createdAt: -1 }).lean(),
    getPlanLimits(req.user.currentPlan),
    countActive(req.user._id),
  ]);
  res.json({
    items: items.map((l) => toDto(l, { moderationNote: l.moderationNote || "" })),
    quota: {
      active,
      limit: limits.maxActiveAccommodationListings,
      canPost: Boolean(req.user.isLandlord && limits.canPostAccommodation),
      plan: req.user.currentPlan,
    },
  });
});

/**
 * @route   POST /api/accommodations
 * @desc    Tạo bài đăng phòng trọ mới (chờ quản trị viên kiểm duyệt)
 * @access  Yêu cầu đăng nhập & quyền chủ trọ
 */
export const createAccommodation = asyncHandler(async (req, res) => {
  await assertCanPost(req.user);

  const listing = await AccommodationListing.create({
    ...pick(req.body, FIELDS),
    ownerId: req.user._id,
    status: "available",
    moderationStatus: initialModeration(),
  });
  res.status(201).json({ listing: toDto(listing.toObject()) });
});

/**
 * @route   PUT /api/accommodations/:id
 * @desc    Cập nhật toàn bộ thông tin bài đăng phòng trọ (chuyển về trạng thái chờ duyệt)
 * @access  Yêu cầu đăng nhập & chính chủ bài đăng
 */
export const updateAccommodation = asyncHandler(async (req, res) => {
  const listing = await loadOwned(req.params.id, req.user);

  // PUT thay thế toàn bộ: trường nào không gửi lên thì bị xóa (ví dụ bỏ trống tiền cọc)
  for (const key of FIELDS) listing.set(key, req.body[key]);
  listing.moderationStatus = "pending"; // sửa tin thì phải duyệt lại
  listing.moderationNote = "";
  await listing.save();

  res.json({ listing: toDto(listing.toObject()) });
});

/**
 * @route   PATCH /api/accommodations/:id/status
 * @desc    Thay đổi trạng thái phòng trọ (available / rented / stopped)
 * @access  Yêu cầu đăng nhập & chính chủ bài đăng
 */
export const setStatus = asyncHandler(async (req, res) => {
  const listing = await loadOwned(req.params.id, req.user);
  const { status } = req.body;

  if (status === "available" && listing.status !== "available") await assertCanPost(req.user);

  listing.status = status;
  await listing.save();
  res.json({ listing: toDto(listing.toObject()) });
});

/**
 * @route   DELETE /api/accommodations/:id
 * @desc    Xóa vĩnh viễn bài đăng phòng trọ và các bản ghi yêu thích liên quan
 * @access  Yêu cầu đăng nhập & chính chủ bài đăng
 */
export const removeAccommodation = asyncHandler(async (req, res) => {
  const listing = await loadOwned(req.params.id, req.user);
  await Promise.all([
    listing.deleteOne(),
    Favorite.deleteMany({ targetType: "accommodation", targetId: listing._id }),
  ]);
  res.json({ message: "Đã xóa tin" });
});

export { toDto };
