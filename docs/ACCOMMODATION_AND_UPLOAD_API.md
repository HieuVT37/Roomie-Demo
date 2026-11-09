# Tài liệu Đặc tả API Module Accommodation & Upload

> **Tác giả:** Nguyễn Bảo An  
> **Module:** Quản lý bài đăng phòng trọ (`Accommodation`) và Dịch vụ xử lý ảnh (`Upload/Files`)  
> **Dự án:** Roomie - Hệ thống tìm kiếm bạn cùng phòng & phòng trọ  

---

## 1. Tổng quan Kiến trúc

Module Accommodation chịu trách nhiệm quản lý toàn bộ vòng đời của tin đăng phòng trọ, bao gồm:
- **Khám phá & Tìm kiếm:** Cho phép người dùng và khách vãng lai tra cứu, lọc phòng trọ theo nhiều tiêu chí (giá, diện tích, vị trí, tiện nghi).
- **Quản lý tin đăng (CRUD):** Chủ trọ (Landlord) có thể đăng tin, chỉnh sửa, thay đổi trạng thái và xóa tin.
- **Tích hợp kiểm duyệt & Hạn mức:** Kiểm tra quyền hạn, gói dịch vụ (Plan) và trạng thái kiểm duyệt (Moderation).
- **Dịch vụ hình ảnh (Upload):** Nhận ảnh qua Multer memory buffer, tối ưu hóa và chuyển đổi định dạng WebP qua Sharp, lưu trữ và stream nhị phân từ MongoDB.

---

## 2. Danh sách Endpoints - Module Accommodation

### 2.1. Tra cứu Siêu dữ liệu địa bàn
* **Endpoint:** `GET /api/accommodations/meta`
* **Quyền truy cập:** Công khai (Public)
* **Mô tả:** Trả về danh sách các quận/huyện có bài đăng khả dụng, sắp xếp theo bảng chữ cái tiếng Việt.
* **Response (200 OK):**
```json
{
  "districts": ["Cầu Giấy", "Đống Đa", "Hà Đông", "Nam Từ Liêm", "Thanh Xuân"]
}
```

---

### 2.2. Tìm kiếm & Phân trang danh sách phòng trọ
* **Endpoint:** `GET /api/accommodations`
* **Quyền truy cập:** Công khai (Hỗ trợ xác thực tùy chọn để trả về trạng thái `isFavorite`)
* **Query Parameters:**
  | Tham số | Kiểu dữ liệu | Mô tả |
  | :--- | :--- | :--- |
  | `q` | `string` | Từ khóa tìm kiếm (tiêu đề, tên đường, phường, quận) |
  | `city` | `string` | Tỉnh / Thành phố |
  | `district` | `string` | Quận / Huyện |
  | `roomType` | `string` | Loại phòng (`single`, `shared`, `studio`, `apartment`, `house`) |
  | `minPrice` | `number` | Giá thuê tối thiểu (VNĐ) |
  | `maxPrice` | `number` | Giá thuê tối đa (VNĐ) |
  | `minArea` | `number` | Diện tích tối thiểu ($m^2$) |
  | `amenities` | `string` | Danh sách tiện ích ngăn cách bởi dấu phẩy |
  | `sort` | `string` | Kiểu sắp xếp: `newest`, `price_asc`, `price_desc`, `area_desc` |
  | `page` | `number` | Số trang (mặc định: 1) |
  | `limit` | `number` | Số kết quả mỗi trang (mặc định: 12, tối đa: 30) |

* **Response (200 OK):**
```json
{
  "items": [
    {
      "id": "672f0a1b2c3d4e5f6a7b8c9d",
      "ownerId": "672f09992c3d4e5f6a7b8c90",
      "title": "Phòng trọ khép kín 25m² gần ĐH Ngoại Thương",
      "address": {
        "city": "Hà Nội",
        "district": "Đống Đa",
        "ward": "Láng Thượng",
        "street": "Chùa Láng"
      },
      "price": 3500000,
      "deposit": 3500000,
      "area": 25,
      "roomType": "single",
      "maxOccupants": 2,
      "amenities": ["wifi", "air_conditioner", "water_heater"],
      "images": ["/uploads/672f0b1a2c3d4e5f6a7b8c91.webp"],
      "status": "available",
      "moderationStatus": "approved",
      "isFavorite": false,
      "viewCount": 42,
      "createdAt": "2026-11-09T08:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pages": 1
}
```

---

### 2.3. Xem chi tiết bài đăng phòng trọ
* **Endpoint:** `GET /api/accommodations/:id`
* **Quyền truy cập:** Công khai (Chỉ người đăng nhập mới thấy số điện thoại liên hệ)
* **Response (200 OK):**
```json
{
  "listing": {
    "id": "672f0a1b2c3d4e5f6a7b8c9d",
    "ownerId": "672f09992c3d4e5f6a7b8c90",
    "title": "Phòng trọ khép kín 25m² gần ĐH Ngoại Thương",
    "description": "Phòng đầy đủ tiện nghi, giờ giấc tự do, an ninh tốt.",
    "price": 3500000,
    "extraCosts": {
      "electricity": 4000,
      "water": 100000,
      "internet": 100000
    }
  },
  "owner": {
    "userId": "672f09992c3d4e5f6a7b8c90",
    "displayName": "Bác Hoàng",
    "avatarUrl": "/uploads/avatar_sample.webp"
  },
  "isOwner": false,
  "isFavorite": true,
  "contactPhone": "0987654321"
}
```

---

### 2.4. Đăng tin phòng trọ mới
* **Endpoint:** `POST /api/accommodations`
* **Quyền truy cập:** Yêu cầu đăng nhập & Có quyền chủ trọ (`isLandlord: true`)
* **Request Body:**
```json
{
  "title": "Phòng trọ mới xây ngõ 68 Cầu Giấy",
  "description": "Có thang máy, khóa vân tay, ban công thoáng mát.",
  "address": {
    "city": "Hà Nội",
    "district": "Cầu Giấy",
    "ward": "Quan Hoa",
    "street": "68 Cầu Giấy"
  },
  "price": 4200000,
  "deposit": 4200000,
  "area": 28,
  "roomType": "studio",
  "maxOccupants": 2,
  "amenities": ["wifi", "air_conditioner", "washing_machine", "balcony"],
  "images": ["/uploads/img1.webp", "/uploads/img2.webp"],
  "contactPhone": "0912345678"
}
```
* **Response (201 Created):** Trả về đối tượng `listing` với `status: "available"` và `moderationStatus: "pending"`.

---

## 3. Danh sách Endpoints - Module Upload & File

### 3.1. Tải lên hình ảnh
* **Endpoint:** `POST /api/uploads/images`
* **Quyền truy cập:** Yêu cầu đăng nhập
* **Content-Type:** `multipart/form-data`
* **Form Field:** `images` (File ảnh, tối đa 8 ảnh/request, dung lượng tối đa 5MB/ảnh)
* **Xử lý ngầm:** Tự động nén sang WebP (chất lượng 78%), giới hạn kích thước tối đa 1600x1600px.
* **Response (201 Created):**
```json
{
  "urls": [
    "/uploads/672f1a2b3c4d5e6f7a8b9c01.webp",
    "/uploads/672f1a2b3c4d5e6f7a8b9c02.webp"
  ]
}
```

### 3.2. Truy xuất hình ảnh công khai
* **Endpoint:** `GET /uploads/:name`
* **Quyền truy cập:** Công khai
* **Header trả về:**
  * `Content-Type: image/webp`
  * `Cache-Control: public, max-age=31536000, immutable`
  * `X-Content-Type-Options: nosniff`

---

## 4. Bảng mã lỗi HTTP Chuẩn hóa

| Mã HTTP | Tên lỗi | Trường hợp xảy ra |
| :---: | :--- | :--- |
| `400` | Bad Request | Dữ liệu đầu vào không hợp lệ theo validation rules |
| `401` | Unauthorized | Chưa đăng nhập hoặc token xác thực hết hạn |
| `403` | Forbidden | Chưa được cấp quyền chủ trọ hoặc vượt quá hạn mức bài đăng |
| `404` | Not Found | Không tìm thấy bài đăng phòng trọ hoặc file ảnh tương ứng |
| `500` | Internal Server Error | Lỗi máy chủ cơ sở dữ liệu hoặc xử lý hình ảnh |

