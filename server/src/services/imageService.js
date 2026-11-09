import sharp from "sharp";
import { httpError } from "../utils/httpError.js";

/**
 * Danh sách định dạng hình ảnh Sharp hỗ trợ giải mã và tối ưu
 * @constant {string[]}
 */
const ALLOWED_FORMATS = ["jpeg", "png", "webp"];

/**
 * Xử lý, nén và chuẩn hóa hình ảnh tải lên:
 * - Tự động xoay ảnh theo metadata EXIF (Orientation)
 * - Giới hạn kích thước tối đa 1600x1600px, giữ nguyên tỉ lệ khung hình (không phóng to ảnh nhỏ)
 * - Nén sang định dạng WebP hiện đại với mức chất lượng 78% (giảm tới 70-80% dung lượng mà vẫn sắc nét)
 * - Giới hạn kích thước ảnh đầu vào (tối đa 40 triệu pixels) để phòng chống tấn công nén ảnh (Decompression Bomb)
 *
 * @param {Buffer} buffer - Buffer dữ liệu thô của file ảnh từ Multer
 * @returns {Promise<{ data: Buffer, size: number }>} Dữ liệu ảnh WebP đã nén và dung lượng (bytes)
 * @throws {HttpError} Ném lỗi 400 nếu file bị hỏng hoặc định dạng không hợp lệ
 */
export async function processImage(buffer) {
  try {
    const meta = await sharp(buffer, { limitInputPixels: 40_000_000 }).metadata();
    if (!ALLOWED_FORMATS.includes(meta.format)) throw new Error("format");

    const { data, info } = await sharp(buffer, { limitInputPixels: 40_000_000 })
      .rotate() // Tự động xoay đúng chiều theo thông tin cảm biến chụp ảnh
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 78 })
      .toBuffer({ resolveWithObject: true });

    return { data, size: info.size };
  } catch {
    throw httpError(400, "Tệp tải lên không phải ảnh hợp lệ");
  }
}
