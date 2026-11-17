# GoalCalendar 🎯📅

> Ứng dụng kết hợp **Lịch (giống Google Calendar)** và **Quản lý mục tiêu + To-do** phân cấp theo thời gian (Năm / Quý / Tháng / Tuần / Dài hạn) với tính toán và hiển thị tiến độ trực quan.

---

## 🚀 Tech Stack

- **Frontend:**
  - React 18 + TypeScript + Vite
  - Tailwind CSS
  - React Router v6
  - TanStack Query (React Query v5)
  - Zustand (state management)
  - React Hook Form + Zod
  - Lucide React (icon set)
  - Date-fns
- **Backend:**
  - Node.js + Express (ES Modules)
  - Mongoose + MongoDB
  - JWT Authentication (Access Token 15m + Refresh Token rotation 7d)
  - Bcrypt (mã hóa mật khẩu)
  - Zod (schema validation)
  - Helmet (bảo mật HTTP headers)
  - CORS, Morgan (logger)
  - Express Rate Limit (giới hạn tần suất request)
  - Vitest + Supertest + MongoDB Memory Server (kiểm thử tự động)

---

## 📁 Cấu trúc Thư mục

```text
goalcalendar/
├── client/                      # Giao diện người dùng (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/          # Reusable UI components (Button, Input, ProtectedRoute...)
│   │   ├── features/
│   │   │   ├── auth/            # Auth schemas & components
│   │   │   ├── calendar/        # (Phase 4)
│   │   │   ├── goals/           # (Phase 3)
│   │   │   ├── tasks/           # (Phase 3)
│   │   │   └── stats/           # (Phase 5)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── pages/               # Trang LoginPage, RegisterPage, DashboardPage
│   │   ├── services/            # Axios API client, auth service
│   │   ├── store/               # Zustand auth store (token persistence, auto-refresh)
│   │   ├── types/               # TypeScript interfaces
│   │   ├── utils/               # Helper utilities
│   │   ├── App.tsx              # Router & Provider configuration
│   │   └── main.tsx             # Entry point
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── tailwind.config.js
│
├── server/                      # Máy chủ API (Node.js + Express + Mongoose)
│   ├── src/
│   │   ├── config/              # env.js, db.js (MongoDB connection)
│   │   ├── controllers/         # auth.controller.js
│   │   ├── middlewares/         # auth, error, validate middlewares
│   │   ├── models/              # user.model.js
│   │   ├── routes/              # index.js, auth.routes.js
│   │   ├── services/            # (Phase 2: progress calculation engine)
│   │   ├── utils/               # jwt.js, response.js
│   │   ├── validators/          # auth.validator.js
│   │   ├── app.js               # Express application factory
│   │   └── server.js            # Server entry point
│   ├── test/                    # Automated integration & unit tests
│   │   ├── setup.js             # In-memory MongoDB lifecycle for tests
│   │   └── auth.test.js         # 18 test cases cho Auth & Settings
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── vitest.config.js
│
├── .gitignore
├── package.json                 # Root package scripts
└── README.md
```

---

## 🛠️ Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 1. Yêu cầu hệ thống
- **Node.js**: phiên bản >= 18.x (khuyến nghị v20+ hoặc v22+)
- **MongoDB**: Đang chạy local (`mongodb://localhost:27017/goalcalendar`) hoặc MongoDB Atlas URI (Lưu ý: Test tự động dùng MongoDB Memory Server tích hợp sẵn, không cần cài MongoDB riêng để chạy test).

### 2. Cài đặt dependencies

```bash
# Cài đặt server
cd server
npm install

# Cài đặt client
cd ../client
npm install
```

### 3. Cấu hình biến môi trường (.env)

Tạo file `.env` từ file `.env.example`:

**Server (`server/.env`):**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/goalcalendar
JWT_ACCESS_SECRET=your_super_secret_access_jwt_key_goalcalendar_2026
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_goalcalendar_2026
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

**Client (`client/.env`):**
```env
VITE_API_URL=http://localhost:5000/api/v1
```

### 4. Chạy chế độ phát triển (Development)

Mở 2 terminal:

**Terminal 1 - Khởi chạy Backend:**
```bash
cd server
npm run dev
# Server lắng nghe tại http://localhost:5000
```

**Terminal 2 - Khởi chạy Frontend:**
```bash
cd client
npm run dev
# Frontend chạy tại http://localhost:5173
```

Hoặc từ thư mục gốc:
```bash
npm run dev:server
npm run dev:client
```

---

## 🧪 Chạy Kiểm Thử Tự Động (Automated Testing)

Chạy bộ 18 test cases tích hợp backend (sử dụng MongoDB in-memory tự động):

```bash
cd server
npm test
```

Tất cả 18 test cases kiểm tra:
1. Đăng ký tài khoản (hợp lệ, mật khẩu ngắn, email sai định dạng, email trùng lặp)
2. Đăng nhập (thành công, sai mật khẩu, tài khoản không tồn tại)
3. Cấp mới token (Refresh Token rotation, phát hiện và từ chối token đã bị thu hồi)
4. Xác thực Bearer Token (`GET /api/v1/auth/me`, từ chối không có token hoặc token sai định dạng)
5. Cập nhật cài đặt cá nhân (`PATCH /api/v1/auth/settings`: language, theme, weekStartsOn)
6. Đăng xuất (`POST /api/v1/auth/logout`) và hủy phiên làm việc.

---

## 📡 Danh Sách API Xác Thực (Prefix `/api/v1/auth`)

| Phương thức | Đường dẫn | Mô tả | Yêu cầu xác thực |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản mới (name, email, password, settings) | Không |
| `POST` | `/api/v1/auth/login` | Đăng nhập (email, password) -> trả về user + access & refresh token | Không |
| `POST` | `/api/v1/auth/refresh` | Cấp access token mới và rotate refresh token | Không |
| `POST` | `/api/v1/auth/logout` | Đăng xuất và thu hồi refresh token | Không |
| `GET` | `/api/v1/auth/me` | Lấy thông tin user hiện tại | `Bearer <accessToken>` |
| `PATCH` | `/api/v1/auth/settings` | Cập nhật ngôn ngữ, theme (dark/light), ngày bắt đầu tuần | `Bearer <accessToken>` |

**Chuẩn phản hồi chung:**
```json
{
  "success": true,
  "data": { ... }
}
```
Khi có lỗi:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [ ... ]
  }
}
```

---

## 🎯 Kế Hoạch Các Giai Đoạn Tiếp Theo

- **Giai đoạn 1 (Hiện tại - Đã xong):** Khởi tạo project, kết nối DB, hoàn thiện kiến trúc xác thực (JWT + Refresh rotation, User settings, Client Auth UI + Interceptor, 18 automated tests).
- **Giai đoạn 2:** Models + API cho Category, Goal, Task, Event + engine tính tiến độ (`progress.service.js` với unit test).
- **Giai đoạn 3:** Giao diện quản lý Task / Goal (cây mục tiêu, CRUD, tick animation, numeric progress update).
- **Giai đoạn 4:** Lịch 4 chế độ xem (Tháng, Tuần, Ngày, Agenda), kéo thả, hiển thị gộp Event / Task / Goal.
- **Giai đoạn 5:** Dashboard + Vòng tròn % tiến độ + Biểu đồ Recharts + Heatmap + Thống kê chi tiết.
- **Giai đoạn 6:** Dark mode hoàn chỉnh, i18n Việt/Anh, seed data mẫu, hoàn thiện UX.
