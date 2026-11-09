import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { listAccommodationsApi, accommodationMetaApi } from "../../api/accommodations";
import AccommodationCard from "../../components/AccommodationCard";
import FormField from "../../components/FormField";
import { SelectField } from "../../components/FormControls";
import { AMENITIES, ROOM_TYPE_LABELS, toOptions } from "../../utils/labels";
import { useRestoreLastViewed, useReturnState } from "../../utils/lastViewed";

/**
 * Trạng thái bộ lọc mặc định khi tải trang
 * @constant {Object}
 */
const initialFilters = {
  q: "",
  district: "",
  roomType: "",
  minPrice: "",
  maxPrice: "",
  minArea: "",
  amenities: [],
  sort: "newest",
};

/**
 * Trang danh sách phòng trọ (Accommodation List Page)
 * Hỗ trợ tìm kiếm từ khóa, lọc theo quận/huyện, loại phòng, khoảng giá, tiện ích và phân trang
 * Tự động ghi nhớ và khôi phục vị trí cuộn khi người dùng xem chi tiết rồi quay lại
 *
 * @returns {JSX.Element}
 */
export default function AccommodationListPage() {
  const { user } = useAuth();

  // Lưu trạng thái bộ lọc và số trang vào sessionStorage để giữ nguyên khi bấm Back từ trang chi tiết
  const [filters, setFilters] = useReturnState("accommodation:filters", initialFilters);
  const [page, setPage] = useReturnState("accommodation:page", 1);
  const [draft, setDraft] = useState(filters);

  // Dữ liệu danh sách phòng và siêu dữ liệu địa bàn
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Nạp danh sách các quận/huyện có bài đăng phòng trọ khả dụng
  useEffect(() => {
    accommodationMetaApi().then((m) => setDistricts(m.districts)).catch(() => {});
  }, []);

  // Truy vấn danh sách phòng trọ mỗi khi thay đổi trang hoặc áp dụng bộ lọc mới
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    listAccommodationsApi({
      ...filters,
      amenities: filters.amenities.join(","),
      page,
      limit: 12,
    })
      .then((res) => active && setData(res))
      .catch((err) => active && setError(err.response?.data?.message || "Không thể kết nối máy chủ"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page, filters]);

  // Cập nhật giá trị các trường nhập liệu trong bản nháp bộ lọc
  const set = (name, value) => setDraft((d) => ({ ...d, [name]: value }));
  const onText = (e) => set(e.target.name, e.target.value);

  // Bật/tắt chọn tiện ích trong bộ lọc
  const toggleAmenity = (a) =>
    set("amenities", draft.amenities.includes(a) ? draft.amenities.filter((x) => x !== a) : [...draft.amenities, a]);

  // Áp dụng bộ lọc bản nháp vào truy vấn chính thức và đưa về trang 1
  const apply = (e) => {
    e.preventDefault();
    setPage(1);
    setFilters(draft);
  };

  // Đặt lại toàn bộ tiêu chí lọc về giá trị ban đầu
  const reset = () => {
    setDraft(initialFilters);
    setFilters(initialFilters);
    setPage(1);
  };

  // Khôi phục vị trí thẻ bài đăng người dùng vừa xem
  useRestoreLastViewed(!loading);
  
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Tiêu đề trang và các nút điều hướng cho chủ trọ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tìm phòng trọ</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{data.total} phòng đang còn trống</p>
        </div>
        {user?.isLandlord && (
          <div className="flex gap-2">
            <Link to="/my-listings" className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600">
              Tin của tôi
            </Link>
            <Link to="/accommodation/new" className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">
              + Đăng tin
            </Link>
          </div>
        )}
      </div>

      {/* Biểu mẫu bộ lọc tìm kiếm nâng cao */}
      <form onSubmit={apply} className="space-y-4 rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Từ khóa" id="q" value={draft.q} onChange={onText} placeholder="Tên đường, phường, tiêu đề..." />
          <SelectField
            label="Quận/huyện"
            id="district"
            value={draft.district}
            onChange={onText}
            placeholder="Tất cả"
            options={districts.map((d) => ({ value: d, label: d }))}
          />
          <SelectField
            label="Loại phòng"
            id="roomType"
            value={draft.roomType}
            onChange={onText}
            placeholder="Tất cả"
            options={toOptions(ROOM_TYPE_LABELS)}
          />
          <SelectField
            label="Sắp xếp"
            id="sort"
            value={draft.sort}
            onChange={onText}
            options={[
              { value: "newest", label: "Mới nhất" },
              { value: "price_asc", label: "Giá tăng dần" },
              { value: "price_desc", label: "Giá giảm dần" },
              { value: "area_desc", label: "Diện tích lớn nhất" },
            ]}
          />
          <FormField label="Giá từ (VNĐ)" id="minPrice" type="number" min="0" step="100000" value={draft.minPrice} onChange={onText} />
          <FormField label="Giá đến (VNĐ)" id="maxPrice" type="number" min="0" step="100000" value={draft.maxPrice} onChange={onText} />
          <FormField label="Diện tích từ (m²)" id="minArea" type="number" min="0" value={draft.minArea} onChange={onText} />
        </div>

        {/* Danh sách các nút chọn tiện ích nhanh */}
        <div>
          <p className="mb-2 text-sm font-medium">Tiện nghi</p>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => toggleAmenity(a)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  draft.amenities.includes(a)
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Nút gửi tìm kiếm và xóa bộ lọc */}
        <div className="flex gap-3">
          <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700">
            Tìm kiếm
          </button>
          <button type="button" onClick={reset} className="rounded-lg border border-gray-300 px-5 py-2 dark:border-gray-600">
            Xóa bộ lọc
          </button>
        </div>
      </form>

      {/* Trạng thái tải và thông báo lỗi nếu có */}
      {loading && <p>Đang tải...</p>}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-600 dark:bg-red-950 dark:text-red-300">{error}</p>}
      {!loading && !error && data.items.length === 0 && <p>Không có phòng nào phù hợp với bộ lọc.</p>}

      {/* Lưới hiển thị danh sách phòng trọ */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((item) => (
          <AccommodationCard key={`${item.id}-${item.isFavorite}`} item={item} />
        ))}
      </div>

      {/* Thanh điều hướng phân trang */}
      {data.pages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="rounded-lg border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-600"
          >
            ← Trước
          </button>
          <span className="text-sm">
            Trang {page}/{data.pages}
          </span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage(page + 1)}
            className="rounded-lg border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-600"
          >
            Sau →
          </button>
        </div>
      )}
    </div>
  );
}
