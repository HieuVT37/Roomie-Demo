import api from "./axios";

/**
 * Trích xuất thuộc tính `data` từ đối tượng phản hồi Axios
 * @template T
 * @param {import('axios').AxiosResponse<T>} r - Axios Response
 * @returns {T} Dữ liệu phản hồi
 */
const d = (r) => r.data;

/**
 * Lấy danh sách bài đăng phòng trọ theo các tiêu chí tìm kiếm và phân trang
 * @param {Object} params - Tham số truy vấn (city, district, minPrice, maxPrice, roomType, page, limit...)
 * @returns {Promise<{ items: Array<Object>, total: number, page: number, pages: number }>}
 */
export const listAccommodationsApi = (params) => api.get("/accommodations", { params }).then(d);

/**
 * Lấy danh sách các địa bàn (quận/huyện) có phòng trọ khả dụng
 * @returns {Promise<{ districts: string[] }>}
 */
export const accommodationMetaApi = () => api.get("/accommodations/meta").then(d);

/**
 * Lấy chi tiết thông tin phòng trọ theo mã định danh
 * @param {string} id - ID bài đăng phòng trọ
 * @returns {Promise<{ listing: Object, owner: Object, isOwner: boolean, isFavorite: boolean, contactPhone: string|null }>}
 */
export const getAccommodationApi = (id) => api.get(`/accommodations/${id}`).then(d);

/**
 * Lấy danh sách phòng trọ do tài khoản hiện tại quản lý kèm thông tin hạn mức gói
 * @returns {Promise<{ items: Array<Object>, quota: Object }>}
 */
export const myAccommodationsApi = () => api.get("/accommodations/mine").then(d);

/**
 * Tạo bài đăng phòng trọ mới
 * @param {Object} data - Dữ liệu biểu mẫu phòng trọ
 * @returns {Promise<{ listing: Object }>}
 */
export const createAccommodationApi = (data) => api.post("/accommodations", data).then(d);

/**
 * Cập nhật thông tin bài đăng phòng trọ đã có
 * @param {string} id - ID bài đăng phòng trọ
 * @param {Object} data - Dữ liệu cập nhật đầy đủ
 * @returns {Promise<{ listing: Object }>}
 */
export const updateAccommodationApi = (id, data) => api.put(`/accommodations/${id}`, data).then(d);

/**
 * Thay đổi trạng thái hiển thị của bài đăng (available / rented / stopped)
 * @param {string} id - ID bài đăng phòng trọ
 * @param {string} status - Trạng thái mới
 * @returns {Promise<{ listing: Object }>}
 */
export const setAccommodationStatusApi = (id, status) =>
  api.patch(`/accommodations/${id}/status`, { status }).then(d);

/**
 * Xóa bài đăng phòng trọ
 * @param {string} id - ID bài đăng phòng trọ
 * @returns {Promise<{ message: string }>}
 */
export const deleteAccommodationApi = (id) => api.delete(`/accommodations/${id}`).then(d);
