# GoalCalendar 🎯📅

> Ứng dụng quản trị hiệu suất toàn diện kết hợp **Lịch biểu đa chế độ (giống Google Calendar)**, **Quản lý mục tiêu phân cấp (Năm / Tháng / Tuần / Numeric / Auto)** và **Theo dõi công việc & thói quen hàng ngày (Daily Habit & Streak Tracker)** với công cụ tính toán tiến độ tự động (Progress Engine) và bảng điều khiển trực quan hóa dữ liệu.

---

## 🌟 Tính Năng Nổi Bật

1. **Hệ Thống Mục Tiêu Phân Cấp & Tiến Độ Tự Động (Core Progress Engine)**:
   - Hỗ trợ mục tiêu theo chu kỳ: Năm (Yearly), Tháng (Monthly), Tuần (Weekly) hoặc Dài hạn.
   - 2 chế độ tiến độ:
     - **Tự động (Auto)**: Tự động cộng dồn (rollup) trọng số từ các mục tiêu con (Sub-goals) và công việc liên kết (Linked Tasks).
     - **Định lượng (Numeric)**: Theo dõi theo số liệu cụ thể (VD: Chạy 20 km, Đọc 3 cuốn sách, Tiết kiệm 100 triệu VNĐ) với thanh trượt và nút cập nhật nhanh.
   - Ghi nhận nhật ký lịch sử tiến độ (`ProgressLog`) theo thời gian thực để phân tích xu hướng.

2. **Lịch Biểu Đa Chế Độ (Interactive Calendar)**:
   - 4 góc nhìn linh hoạt: **Tháng (Month)**, **Tuần (Week)**, **Ngày (Day)** và **Lịch trình (Agenda)**.
   - Tích hợp đồng thời: Sự kiện (Events), Công việc có hạn chót (Tasks), và Cột mốc mục tiêu (Goals).
   - Bộ lọc hiển thị nhanh theo loại đối tượng hoặc theo Danh mục chủ đề.

3. **Quản Lý Công Việc & Thói Quen (Tasks & Habits)**:
   - Phân loại trực quan: Việc hôm nay, tuần này, sắp tới, quá hạn và đã hoàn tất.
   - Hỗ trợ Checklist việc phụ (Subtasks) với thanh tiến độ hoàn thành.
   - Thói quen lặp lại (Hàng ngày, T2-T6, Hàng tuần) tích hợp đếm chuỗi kỷ luật liên tục (**🔥 Streak count**).

4. **Báo Cáo & Phân Tích Hiệu Suất (Insights & Visual Analytics)**:
   - **Bản đồ cống hiến (Contribution Heatmap)**: Trực quan hóa mật độ hoàn thành công việc theo từng ngày trong năm (tương tự GitHub activity graph).
   - **Biểu đồ đường xu hướng (Trend Line Chart)**: So sánh tiến độ thực tế theo thời gian với đường lý tưởng (Ideal Pace).
   - **Biểu đồ cột ngày trong tuần (Stats Bar Chart)**: Khám phá ngày bạn đạt năng suất cao nhất trong tuần.
   - **Biểu đồ tròn danh mục (Category Donut Chart)**: Đánh giá độ cân bằng cuộc sống giữa Công việc, Sức khỏe, Học tập, Tài chính và Cá nhân.

5. **Giao Diện Đa Ngôn Ngữ & Dark Mode (i18n & UX)**:
   - Hỗ trợ đầy đủ **Tiếng Việt 🇻🇳** (mặc định) và **English 🇬🇧**. Chuyển đổi mượt mà ngay trên thanh tiêu đề và tự động lưu cấu hình.
   - **Dark Mode**: Đồng bộ giao diện tối/sáng chuẩn xác, độ tương phản cao, không gây mỏi mắt.
   - Hiệu ứng tải dữ liệu mượt mà với **Loading Skeletons** và thông báo **Empty States** sinh động kèm nút hành động nhanh.

6. **Phím Tắt Bàn Phím (Keyboard Shortcuts)**:
   - Nhấn `N`: Mở nhanh hộp thoại tạo mới (Công việc / Mục tiêu / Sự kiện).
   - Nhấn `T`: Chuyển ngay về Hôm nay trên Lịch và Tổng quan.
   - Nhấn `?`: Xem bảng tổng hợp các phím tắt.
   - Tự động nhận diện khi người dùng đang nhập liệu trong ô form để tránh kích hoạt ngoài ý muốn.

7. **Xuất Dữ Liệu (Data Export)**:
   - Xuất danh sách Công việc hoặc Mục tiêu ra tệp **CSV** (đã nhúng UTF-8 BOM chuẩn hiển thị tiếng Việt trên Excel) hoặc **JSON**.

8. **Thông Báo Trình Duyệt (Browser Notifications)**:
   - Tích hợp Web Notifications API nhắc nhở việc đến hạn trong ngày.

---

## 🚀 Tech Stack

### Frontend
- **Framework & Core**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, PostCSS, Lucide React Icons
- **State Management**: Zustand (Auth store, i18n store, Theme store)
- **Data Fetching & Cache**: TanStack Query (React Query v5)
- **Form Handling**: React Hook Form, Zod validation
- **Date Handling**: Date-fns

### Backend
- **Runtime & Server**: Node.js (ES Modules), Express.js
- **Database & ODM**: MongoDB, Mongoose
- **Authentication**: JWT (Access Token 15 phút, Refresh Token Rotation 7 ngày)
- **Security**: Bcrypt, Helmet, Express Rate Limit, CORS, Zod Schema Validation
- **Testing**: Vitest, Supertest, MongoDB Memory Server

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
ToDoLand/
├── client/                              # Ứng dụng Frontend (React + Vite)
│   ├── src/
│   │   ├── api/                         # Axios client & API endpoints
│   │   ├── components/
│   │   │   ├── calendar/                # CalendarHeader, EventModal, Month/Week/Day/Agenda views
│   │   │   ├── charts/                  # ContributionHeatmap, TrendLine, StatsBar, CategoryDonut
│   │   │   ├── common/                  # QuickCreateModal, ShortcutsModal, ExportModal, NotificationModal
│   │   │   ├── goals/                   # GoalCard, GoalModal, GoalTree, NumericProgressWidget
│   │   │   ├── layout/                  # Header, Sidebar, AppLayout
│   │   │   ├── tasks/                   # TaskCard, TaskModal, SubtaskList, StreakBadge
│   │   │   └── ui/                      # Button, Input, Modal, Skeleton, EmptyState, Badge
│   │   ├── i18n/                        # vi.ts, en.ts, Zustand useI18n store
│   │   ├── pages/                       # DashboardPage, TasksPage, GoalsPage, CalendarPage, InsightsPage, Login, Register
│   │   ├── store/                       # Zustand auth store, theme store
│   │   ├── types/                       # TypeScript interfaces (Goal, Task, Event, Category, Stats)
│   │   ├── utils/                       # Date helpers, export utilities (CSV/JSON)
│   │   ├── App.tsx                      # Main Router & Providers
│   │   └── main.tsx                     # Entry point
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── server/                              # Ứng dụng Backend (Node.js + Express)
│   ├── src/
│   │   ├── config/                      # env.js, db.js (MongoDB Mongoose connection)
│   │   ├── controllers/                 # auth, category, goal, task, event, stats controllers
│   │   ├── middlewares/                 # auth, error handler, validate middlewares
│   │   ├── models/                      # User, Category, Goal, Task, Event, ProgressLog, TaskCompletion
│   │   ├── routes/                      # auth, category, goal, task, event, stats routes
│   │   ├── scripts/
│   │   │   └── seed.js                  # Kịch bản nạp dữ liệu mẫu phong phú (Demo Seed Script)
│   │   ├── services/
│   │   │   └── progress.service.js      # Engine tính toán tiến độ mục tiêu tự động
│   │   ├── utils/                       # JWT helpers, standard API response
│   │   ├── validators/                  # Zod request validators
│   │   ├── app.js                       # Express app configuration
│   │   └── server.js                    # Server bootstrap
│   ├── test/                            # Unit & Integration tests (Vitest + In-memory MongoDB)
│   ├── package.json
│   └── vitest.config.js
│
├── package.json                         # Root package scripts điều phối dự án
└── README.md                            # Tài liệu hướng dẫn sử dụng và triển khai
```

---

## 🛠️ Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 1. Yêu cầu hệ thống
- **Node.js**: phiên bản `>= 18.x` (khuyến nghị v20.x hoặc v22.x LTS)
- **MongoDB**: Đang chạy cục bộ trên máy, MongoDB Atlas hoặc Docker Container.

> **Mẹo khởi chạy nhanh MongoDB bằng Docker:**
> ```bash
> docker run -d --name mongo-goalcalendar -p 27017:27017 -v mongo_data:/data/db mongo:latest
> ```

---

### 2. Cài đặt các gói phụ thuộc (Dependencies)

Tại thư mục gốc của dự án:
```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

---

### 3. Cấu hình biến môi trường (.env)

Tạo file cấu hình môi trường dựa trên `.env.example`:

**Backend (`server/.env`):**
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

**Frontend (`client/.env`):**
```env
VITE_API_URL=http://localhost:5000/api/v1
```

---

### 4. Nạp Dữ Liệu Mẫu (Seed Data) 🌱

Để trải nghiệm ứng dụng ngay với hệ thống dữ liệu hoàn chỉnh, chạy lệnh seed:

```bash
# Từ thư mục gốc:
npm run seed

# Hoặc từ thư mục server:
cd server && npm run seed
```

#### Dữ liệu demo bao gồm:
- **Tài khoản người dùng mẫu**:
  - **Email**: `demo@goalcalendar.com`
  - **Mật khẩu**: `password123`
  - *(Trên trang đăng nhập có sẵn nút **"⚡ Đăng nhập bằng Demo User"** để đăng nhập ngay với 1 cú click)*
- **5 Danh mục chuẩn**:
  - 💼 **Công việc** (Work - Xanh dương `#3b82f6`)
  - 🏃‍♂️ **Sức khỏe** (Health - Xanh lá `#10b981`)
  - 📚 **Học tập** (Study - Tím `#8b5cf6`)
  - 💰 **Tài chính** (Finance - Vàng cam `#f59e0b`)
  - 🌸 **Cá nhân** (Personal - Hồng `#ec4899`)
- **Mục tiêu thực tế phân cấp**:
  - Mục tiêu Năm: *"Đạt thu nhập & Nâng cao kỹ năng 2026"* (Tự động cộng dồn), *"Tiết kiệm 100 triệu"* (Định lượng: 45/100 triệu VNĐ).
  - Mục tiêu Tháng: *"Hoàn thành khóa học React & TypeScript nâng cao"*, *"Đọc 3 cuốn sách chuyên ngành"* (Định lượng: 2/3 cuốn).
  - Mục tiêu Tuần: *"Xây dựng dự án GoalCalendar"*, *"Chạy bộ 20km"* (Định lượng: 15/20 km).
- **Công việc & Thói quen**:
  - Công việc có checklist subtasks.
  - Thói quen lặp lại hàng ngày có sẵn chuỗi kỷ luật **🔥 7 ngày liên tục**.
  - Các công việc hoàn thành và quá hạn để hiển thị trạng thái lọc.
- **Sự kiện trên lịch**: Họp Sprint đầu tuần, Lớp học tiếng Anh, Buổi tập thể thao cuối tuần.
- **Dữ liệu phân tích lịch sử**: Hơn 80 bản ghi `ProgressLog` và `TaskCompletion` rải đều trong năm, hiển thị sinh động trên **Contribution Heatmap**, **Trend Line Chart**, **Stats Bar Chart** và **Donut Chart** ngay khi đăng nhập.

---

### 5. Khởi Chạy Ứng Dụng (Development)

Chạy đồng thời cả Frontend và Backend:

```bash
# Terminal 1 - Backend API:
cd server
npm run dev
# Lắng nghe tại: http://localhost:5000

# Terminal 2 - Frontend Web:
cd client
npm run dev
# Giao diện chạy tại: http://localhost:5173
```

Hoặc sử dụng lệnh điều phối từ thư mục gốc:
```bash
npm run dev:server
npm run dev:client
```

Mở trình duyệt tại: **http://localhost:5173**

---

## 🧪 Kiểm Thử & Biên Dịch (Testing & Build)

### 1. Kiểm thử tự động Backend (Vitest)
Hệ thống sử dụng MongoDB in-memory, có thể chạy độc lập mà không ảnh hưởng tới cơ sở dữ liệu thật:
```bash
cd server
npm test
```
*Bộ kiểm thử bao quát toàn bộ Auth, Categories, Goals, Tasks, Events, Progress Engine và Seed Data script.*

### 2. Biên dịch Frontend (Production Build)
```bash
cd client
npm run build
```
Kiểm tra type-safety với TypeScript Compiler (`tsc`) và tối ưu hóa gói bundle với Vite.

---

## 📡 Danh Sách API Tham Khảo (API Reference)

Tất cả các endpoint (ngoại trừ Auth công khai) đều yêu cầu Header: `Authorization: Bearer <accessToken>`.

### 1. Xác thực (`/api/v1/auth`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản mới |
| `POST` | `/api/v1/auth/login` | Đăng nhập hệ thống (trả về access & refresh token) |
| `POST` | `/api/v1/auth/refresh` | Cấp mới access token và rotate refresh token |
| `POST` | `/api/v1/auth/logout` | Đăng xuất và thu hồi refresh token |
| `GET` | `/api/v1/auth/me` | Lấy thông tin tài khoản hiện tại |
| `PATCH` | `/api/v1/auth/settings` | Cập nhật ngôn ngữ (vi/en), theme (dark/light), ngày bắt đầu tuần |

### 2. Danh mục (`/api/v1/categories`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `GET` | `/api/v1/categories` | Lấy danh sách danh mục người dùng |
| `POST` | `/api/v1/categories` | Tạo danh mục mới (name, color, icon) |
| `PUT` | `/api/v1/categories/:id` | Chỉnh sửa danh mục |
| `DELETE` | `/api/v1/categories/:id` | Xóa danh mục |

### 3. Mục tiêu (`/api/v1/goals`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `GET` | `/api/v1/goals` | Lấy danh sách mục tiêu (hỗ trợ lọc theo period, status, category) |
| `GET` | `/api/v1/goals/tree` | Lấy cây mục tiêu phân cấp lồng nhau |
| `POST` | `/api/v1/goals` | Tạo mục tiêu mới (auto hoặc numeric) |
| `GET` | `/api/v1/goals/:id` | Xem chi tiết mục tiêu |
| `PUT` | `/api/v1/goals/:id` | Cập nhật mục tiêu |
| `PATCH` | `/api/v1/goals/:id/progress` | Cập nhật nhanh giá trị tiến độ cho mục tiêu định lượng |
| `DELETE` | `/api/v1/goals/:id` | Xóa mục tiêu |

### 4. Công việc (`/api/v1/tasks`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `GET` | `/api/v1/tasks` | Danh sách công việc (lọc theo ngày, trạng thái, mục tiêu, tag) |
| `POST` | `/api/v1/tasks` | Tạo công việc mới (hạn chót, lặp lại, subtasks) |
| `GET` | `/api/v1/tasks/:id` | Chi tiết công việc |
| `PUT` | `/api/v1/tasks/:id` | Cập nhật công việc |
| `PATCH` | `/api/v1/tasks/:id/complete` | Đánh dấu hoàn thành / chưa hoàn thành công việc |
| `PATCH` | `/api/v1/tasks/:id/subtasks/:subtaskId` | Cập nhật trạng thái một việc phụ |
| `DELETE` | `/api/v1/tasks/:id` | Xóa công việc |

### 5. Sự kiện Lịch (`/api/v1/events`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `GET` | `/api/v1/events` | Danh sách sự kiện trong khoảng thời gian `start` đến `end` |
| `POST` | `/api/v1/events` | Tạo sự kiện mới |
| `GET` | `/api/v1/events/:id` | Xem chi tiết sự kiện |
| `PUT` | `/api/v1/events/:id` | Cập nhật sự kiện |
| `DELETE` | `/api/v1/events/:id` | Xóa sự kiện |

### 6. Thống kê & Phân tích (`/api/v1/stats`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `GET` | `/api/v1/stats/overview` | Thống kê tổng hợp: % hoàn thành, streak, số lượng việc/mục tiêu |
| `GET` | `/api/v1/stats/heatmap` | Dữ liệu đóng góp theo từng ngày trong năm cho Contribution Heatmap |
| `GET` | `/api/v1/stats/trend/:goalId` | Dữ liệu lịch sử tiến độ mục tiêu so với đường lý tưởng |
| `GET` | `/api/v1/stats/distribution` | Phân bổ công việc và mục tiêu theo ngày trong tuần và danh mục |

---

## ⌨️ Bảng Phím Tắt Tiện Dụng

| Phím tắt | Tác vụ |
|---|---|
| `N` | Mở hộp thoại tạo nhanh: Công việc, Mục tiêu hoặc Sự kiện |
| `T` | Chuyển góc nhìn lịch & tổng quan về ngày **Hôm nay** |
| `?` | Hiển thị hộp thoại trợ giúp phím tắt |
| `Escape` | Đóng bất kỳ hộp thoại (modal) đang mở |

*(Hệ thống thông minh tự vô hiệu hóa phím tắt khi con trỏ đang nằm trong ô gõ chữ, đảm bảo không ảnh hưởng khi soạn thảo văn bản)*

---

## 📄 Bản Quyền & Giấy Phép (License)

Dự án được xây dựng và phát triển dưới giấy phép **MIT License**. Mọi cá nhân, tổ chức đều có quyền tham khảo, sử dụng và đóng góp phát triển.
