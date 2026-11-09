import { Link, useLocation, useNavigationType } from "react-router-dom";
import FavoriteButton from "./FavoriteButton";
import ImageFrame from "./ImageFrame";
import { ROOM_TYPE_LABELS, LISTING_STATUS_LABELS, formatVND } from "../utils/labels";
import { saveLastViewed, readLastViewed, isReturningTo } from "../utils/lastViewed";

/**
 * Thẻ hiển thị tóm tắt thông tin phòng trọ (Accommodation Card)
 * Hỗ trợ hiệu ứng highlight khi người dùng quay lại từ trang chi tiết (Last Viewed)
 *
 * @param {Object} props
 * @param {Object} props.item - Dữ liệu phòng trọ DTO
 * @param {string} props.item.id - Mã định danh phòng trọ
 * @param {string} props.item.title - Tiêu đề bài đăng
 * @param {number} props.item.price - Giá thuê hàng tháng
 * @param {number} [props.item.area] - Diện tích phòng (m2)
 * @param {string} props.item.roomType - Loại hình phòng
 * @param {string[]} [props.item.images] - Danh sách ảnh
 * @param {Object} [props.item.address] - Địa chỉ phòng trọ
 * @param {string} props.item.status - Trạng thái phòng trọ
 * @param {boolean} [props.item.isFavorite] - Đã yêu thích hay chưa
 * @param {Function} [props.onFavoriteChange] - Callback xử lý khi thay đổi trạng thái yêu thích
 * @param {boolean} [props.showFavorite=true] - Có hiển thị nút yêu thích hay không
 * @returns {JSX.Element}
 */
export default function AccommodationCard({ item, onFavoriteChange, showFavorite = true }) {
  const { pathname, search } = useLocation();
  const navType = useNavigationType();

  // Kiểm tra xem thẻ này có phải bài đăng người dùng vừa xem và bấm nút quay lại hay không
  const isLastViewed =
    isReturningTo(pathname + search, navType) && readLastViewed()?.id === String(item.id);

  // Ảnh bìa đại diện của phòng trọ
  const cover = item.images?.[0];

  // Chuỗi thông tin phụ: Quận/Huyện · Diện tích · Loại phòng
  const sub = [item.address?.district, item.area && `${item.area} m²`, ROOM_TYPE_LABELS[item.roomType]]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      to={`/accommodation/${item.id}`}
      data-card-id={item.id}
      onClick={() => saveLastViewed(item.id)}
      className={`relative block overflow-hidden rounded-2xl border transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        isLastViewed
          ? "border-indigo-400 shadow-[0_0_0_3px_rgba(129,140,248,0.25),0_0_18px_rgba(129,140,248,0.45)]"
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      {/* Khung ảnh bài đăng có fallback emoji khi chưa có ảnh */}
      <ImageFrame src={cover} alt={item.title} fallback="🏠" />

      {/* Nút bấm thả tim lưu bài đăng yêu thích */}
      {showFavorite && (
        <div className="absolute right-2 top-2 z-10">
          <FavoriteButton listingId={item.id} initial={item.isFavorite} onToggle={onFavoriteChange} />
        </div>
      )}

      {/* Nội dung thông tin chi tiết thẻ phòng trọ */}
      <div className="space-y-1 p-4">
        {/* Giá tiền thuê phòng */}
        <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
          {formatVND(item.price)}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/tháng</span>
        </p>

        {/* Tiêu đề giới hạn 2 dòng */}
        <h3 className="line-clamp-2 font-medium">{item.title}</h3>

        {/* Địa điểm & thông số phòng */}
        <p className="text-sm text-gray-500 dark:text-gray-400">{sub}</p>

        {/* Huy hiệu trạng thái nếu phòng không còn khả dụng */}
        {item.status !== "available" && (
          <span className="inline-block rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700">
            {LISTING_STATUS_LABELS[item.status]}
          </span>
        )}
      </div>
    </Link>
  );
}
