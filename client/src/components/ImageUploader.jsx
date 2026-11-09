import { useRef, useState } from "react";
import { uploadImagesApi } from "../api/uploads";

/**
 * Component hỗ trợ người dùng chọn nhiều file ảnh và tải lên máy chủ
 * Hỗ trợ xem trước (preview), chọn ảnh làm ảnh bìa (cover) và xóa từng ảnh
 *
 * @param {Object} props
 * @param {string[]} props.images - Mảng các URL hình ảnh hiện tại
 * @param {Function} props.onChange - Callback khi danh sách ảnh thay đổi: (newImages: string[]) => void
 * @param {number} [props.max=8] - Giới hạn số lượng ảnh tối đa
 * @param {boolean} [props.showCover=true] - Có hiển thị tính năng đặt ảnh bìa hay không
 * @returns {JSX.Element}
 */
export default function ImageUploader({ images, onChange, max = 8, showCover = true }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Xử lý sự kiện khi người dùng chọn file từ thiết bị
   * @param {React.ChangeEvent<HTMLInputElement>} e
   */
  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // Đặt lại giá trị input để cho phép chọn lại cùng file nếu cần
    if (!files.length) return;

    // Kiểm tra tổng số lượng ảnh sau khi thêm có vượt mức cho phép không
    if (images.length + files.length > max) {
      setError(`Tối đa ${max} ảnh`);
      return;
    }

    setError("");
    setUploading(true);
    try {
      // Gửi request upload ảnh dạng multipart/form-data
      const { urls } = await uploadImagesApi(files);
      onChange([...images, ...urls]);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được ảnh");
    } finally {
      setUploading(false);
    }
  };

  /**
   * Xóa một ảnh khỏi danh sách
   * @param {string} url - Đường dẫn ảnh cần xóa
   */
  const remove = (url) => onChange(images.filter((u) => u !== url));

  /**
   * Đưa ảnh được chọn lên đầu danh sách để làm ảnh bìa
   * @param {string} url - Đường dẫn ảnh được chọn làm ảnh bìa
   */
  const makeCover = (url) => onChange([url, ...images.filter((u) => u !== url)]);

  return (
    <div className="space-y-3">
      {/* Khung lưới hiển thị danh sách các ảnh đã tải lên */}
      <div className="flex flex-wrap gap-3">
        {images.map((url, i) => (
          <div key={url} className="relative h-24 w-32 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <img src={url} alt="" className="h-full w-full object-cover" />
            {/* Huy hiệu ảnh bìa cho ảnh đầu tiên */}
            {showCover && i === 0 && (
              <span className="absolute left-1 top-1 rounded bg-indigo-600 px-1 text-[10px] text-white">Ảnh bìa</span>
            )}
            {/* Các nút hành động trên ảnh */}
            <div className="absolute bottom-1 right-1 flex gap-1">
              {showCover && i !== 0 && (
                <button type="button" onClick={() => makeCover(url)} className="rounded bg-black/60 px-1 text-[10px] text-white">
                  Đặt bìa
                </button>
              )}
              <button type="button" onClick={() => remove(url)} className="rounded bg-red-600 px-1 text-[10px] text-white">
                Xóa
              </button>
            </div>
          </div>
        ))}

        {/* Nút bấm mở hộp thoại chọn file tải ảnh mới */}
        {images.length < max && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-indigo-500 dark:border-gray-600"
          >
            {uploading ? "Đang tải..." : "+ Thêm ảnh"}
          </button>
        )}
      </div>

      {/* Input ẩn nhận file ảnh từ máy */}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} className="hidden" />
      <p className="text-xs text-gray-500 dark:text-gray-400">JPG, PNG hoặc WebP, tối đa 5MB mỗi ảnh, tối đa {max} ảnh.</p>
      {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
    </div>
  );
}
