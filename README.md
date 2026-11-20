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

5. **Học Tiếng Anh Thông Minh (Module LEARN & SRS Flashcards)**:
   - **Hệ thống Flashcards chuẩn thuật toán SuperMemo SM-2**:
     - Tự động tính toán khoảng cách ngày ôn tập tối ưu (`interval`, `easeFactor`, `repetitions`, `lapses`).
     - Giao diện thẻ 3D xoay lật mượt mà, phát âm chuẩn tiếng Anh bản ngữ (Web Speech API).
     - Chế độ luyện gõ chính tả (Typing Mode) với so sánh ký tự (character diff) thời gian thực.
     - Chấm điểm ghi nhớ 4 cấp độ (1: Again, 2: Hard, 3: Good, 4: Easy) với phím tắt nhanh 1, 2, 3, 4 hoặc phím Space để lật thẻ.
     - Nhập từ vựng hàng loạt (Bulk Import) linh hoạt nhận diện định dạng dấu gạch nối, dấu gạch đứng, dấu hai chấm.
     - Gộp bộ thẻ (Merge Decks), lọc từ vựng theo trạng thái (New, Learning, Review, Suspended), theo tags và giáo trình nguồn.
     - Thống kê SRS chuyên sâu: Biểu đồ dự báo số thẻ đến hạn 7 ngày tới, tỷ lệ ghi nhớ (retention rate), danh sách từ hay quên (Leech cards) để tập trung củng cố.
   - **Trợ lý Gia sư AI Đa phương thức (Multimodal AI Tutor powered by Google Gemini)**:
     - Đàm thoại trực tiếp với công nghệ Streaming SSE (Server-Sent Events), giải đáp ngữ pháp, chữa bài viết luận, phân tích ngữ nghĩa và thành ngữ.
     - Hỗ trợ tải tệp đa định dạng: Ảnh (JPG, PNG, WEBP), Tài liệu (PDF, Word DOCX, Markdown, Text) với xác thực chữ ký nhị phân (magic bytes) an toàn.
     - Tự động trích xuất từ vựng học thuật từ văn bản hoặc tài liệu đính kèm, đề xuất thẻ flashcard trực tiếp vào bộ thẻ người dùng chỉ với 1 click.
     - **Hồ sơ Người học (Learner Profile - Trí nhớ dài hạn)**: AI ghi nhớ trình độ (A1-C2, IELTS, TOEIC), điểm yếu, mục tiêu kỳ vọng và thời gian học mỗi ngày để cá nhân hóa toàn bộ nội dung.
     - **Chiến lược & Lộ trình học tập (Hierarchical Study Plan)**: Tự động thiết kế cây lộ trình phân cấp Năm -> Tháng -> Tuần -> Nhiệm vụ hàng ngày, và đồng bộ trực tiếp vào hệ thống Lịch và Mục tiêu của GoalCalendar.
   - **Đồng bộ Tiến độ Học tập Tự động (Task & Goal Sync Engine)**:
     - Tự động sinh công việc hệ thống hàng ngày *"Ôn tập X thẻ từ vựng"* khi có thẻ đến hạn.
     - Hoàn thành phiên ôn tập sẽ tự động đánh dấu hoàn thành nhiệm vụ và cập nhật tiến độ mục tiêu học tập liên kết.

6. **Giao Diện Đa Ngôn Ngữ & Dark Mode (i18n & UX)**:
   - Hỗ trợ đầy đủ **Tiếng Việt 🇻🇳** (mặc định) và **English 🇬🇧**. Chuyển đổi mượt mà ngay trên thanh tiêu đề và tự động lưu cấu hình.
   - **Dark Mode**: Đồng bộ giao diện tối/sáng chuẩn xác, độ tương phản cao, không gây mỏi mắt.
   - Hiệu ứng tải dữ liệu mượt mà với **Loading Skeletons** và thông báo **Empty States** sinh động kèm nút hành động nhanh.

7. **Phím Tắt Bàn Phím (Keyboard Shortcuts)**:
   - Nhấn `N`: Mở nhanh hộp thoại tạo mới (Công việc / Mục tiêu / Sự kiện).
   - Nhấn `T`: Chuyển ngay về Hôm nay trên Lịch và Tổng quan.
   - Nhấn `?`: Xem bảng tổng hợp các phím tắt.
   - Tự động nhận diện khi người dùng đang nhập liệu trong ô form để tránh kích hoạt ngoài ý muốn.

8. **Xuất Dữ Liệu (Data Export)**:
   - Xuất danh sách Công việc hoặc Mục tiêu ra tệp **CSV** (đã nhúng UTF-8 BOM chuẩn hiển thị tiếng Việt trên Excel) hoặc **JSON**.

9. **Thông Báo Trình Duyệt (Browser Notifications)**:
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
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/goalcalendar

# JWT Authentication
JWT_ACCESS_SECRET=your_super_secret_access_jwt_key_goalcalendar_2026_must_be_long
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_goalcalendar_2026_must_be_long
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ==============================================================================
# Module LEARN: Cấu hình Google Gemini AI & Quota
# ==============================================================================
# 🔑 Hướng dẫn lấy API Key miễn phí từ Google AI Studio:
# 1. Truy cập https://aistudio.google.com và đăng nhập bằng tài khoản Google.
# 2. Nhấp "Get API key" -> "Create API key in new project" và copy mã key.
# 3. Dán key vào biến GEMINI_API_KEY dưới đây.
# (Nếu để trống, hệ thống sẽ tự động kích hoạt Intelligent Mock Assistant để trải nghiệm offline/testing).
GEMINI_API_KEY=your_gemini_api_key_here

# Mô hình AI khuyến nghị (mặc định: gemini-1.5-flash hoặc gemini-2.0-flash-exp)
GEMINI_MODEL=gemini-1.5-flash

# Giới hạn lượt chat và token hàng ngày cho mỗi người dùng (Rate Control)
MAX_DAILY_CHAT_REQUESTS=50
MAX_DAILY_INPUT_TOKENS=100000
MAX_DAILY_OUTPUT_TOKENS=50000

# ==============================================================================
# Module LEARN: Cấu hình tải tệp & tài liệu đính kèm
# ==============================================================================
MAX_UPLOAD_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document
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
- **Module LEARN (Học tiếng Anh)**:
  - 2 Bộ thẻ flashcard mẫu: *"Oxford 3000 Cơ bản"* và *"IELTS Academic"*.
  - 20 Thẻ từ vựng phong phú kèm phát âm, nghĩa, loại từ, ví dụ ngữ cảnh, nguồn và tags.
  - 13 Nhật ký ôn tập SRS (`ReviewLog`) tạo sẵn lịch sử ôn tập và dự báo 7 ngày.
  - 1 Cuộc trò chuyện AI mẫu với câu hỏi ngữ pháp và trích xuất từ vựng thành flashcard.

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

### 7. Thẻ ghi nhớ & Ôn tập ngắt quãng SRS (`/api/v1/learn`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `GET` | `/api/v1/learn/decks` | Lấy danh sách bộ thẻ kèm thống kê số thẻ và thẻ cần ôn |
| `POST` | `/api/v1/learn/decks` | Tạo bộ thẻ mới (name, description, color, icon) |
| `PATCH` | `/api/v1/learn/decks/:id` | Cập nhật thông tin bộ thẻ |
| `DELETE` | `/api/v1/learn/decks/:id` | Xóa bộ thẻ (hỗ trợ query `cascade=true/false`) |
| `POST` | `/api/v1/learn/decks/merge` | Hợp nhất 2 bộ thẻ (chuyển thẻ từ nguồn sang đích) |
| `GET` | `/api/v1/learn/cards` | Danh sách thẻ (phân trang, lọc theo deckId, status, search, tag) |
| `POST` | `/api/v1/learn/cards` | Tạo thẻ flashcard mới (front, back, pronunciation, partOfSpeech, examples, tags, deckId) |
| `GET` | `/api/v1/learn/cards/:id` | Xem chi tiết thông tin thẻ và lịch sử ôn tập SRS |
| `PATCH` | `/api/v1/learn/cards/:id` | Cập nhật nội dung thẻ flashcard |
| `DELETE` | `/api/v1/learn/cards/:id` | Xóa thẻ flashcard |
| `PATCH` | `/api/v1/learn/cards/:id/suspend` | Tạm hoãn (suspend) hoặc kích hoạt lại thẻ |
| `POST` | `/api/v1/learn/cards/bulk` | Nhập nhiều thẻ hàng loạt (hỗ trợ `preview` và `commit`) |
| `GET` | `/api/v1/learn/review/queue` | Lấy danh sách thẻ đến hạn ôn tập hôm nay theo thuật toán SRS SM-2 |
| `POST` | `/api/v1/learn/review/answer` | Gửi kết quả đánh giá (rating 1-4: Again, Hard, Good, Easy) |
| `GET` | `/api/v1/learn/settings` | Lấy cấu hình học tập cá nhân (chiều thẻ, giới hạn thẻ mới/ôn tập) |
| `PATCH` | `/api/v1/learn/settings` | Cập nhật cấu hình học tập |
| `GET` | `/api/v1/learn/stats` | Thống kê học tập: tổng thẻ, độ chính xác, chuỗi học tập, dự báo ôn tập |

### 8. Trợ lý AI & Lập kế hoạch học tập (`/api/v1/chat`)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `GET` | `/api/v1/chat/conversations` | Lấy danh sách các cuộc trò chuyện (hỗ trợ tìm kiếm theo tiêu đề) |
| `POST` | `/api/v1/chat/conversations` | Tạo cuộc trò chuyện mới |
| `PATCH` | `/api/v1/chat/conversations/:id` | Đổi tên hoặc ghim (pin) cuộc trò chuyện |
| `DELETE` | `/api/v1/chat/conversations/:id` | Xóa cuộc trò chuyện và dữ liệu liên quan |
| `GET` | `/api/v1/chat/conversations/:id/messages` | Lấy lịch sử tin nhắn trong cuộc trò chuyện |
| `POST` | `/api/v1/chat/conversations/:id/messages` | Gửi tin nhắn và nhận phản hồi trực tiếp qua SSE Stream (kèm tệp tài liệu) |
| `POST` | `/api/v1/chat/messages/:id/feedback` | Đánh giá phản hồi của AI (like/dislike kèm lý do) |
| `POST` | `/api/v1/chat/files` | Tải lên tệp tài liệu/ảnh đính kèm cho AI phân tích (tối đa 5 tệp, 10MB) |
| `GET` | `/api/v1/chat/files/:id` | Tải xuống hoặc xem tệp đính kèm |
| `DELETE` | `/api/v1/chat/files/:id` | Xóa tệp đính kèm đã tải lên |
| `GET` | `/api/v1/chat/profile` | Xem hồ sơ năng lực người học (mục tiêu, trình độ, sở thích, điểm yếu) |
| `PATCH` | `/api/v1/chat/profile` | Cập nhật hồ sơ năng lực người học |
| `DELETE` | `/api/v1/chat/profile` | Đặt lại hồ sơ năng lực về mặc định |
| `POST` | `/api/v1/chat/actions/add-cards` | Lưu nhanh các thẻ từ vựng do AI đề xuất vào bộ flashcard |
| `POST` | `/api/v1/chat/actions/apply-plan` | Chuyển đổi kế hoạch học tập AI thành Mục tiêu & Công việc thực tế trên Lịch |
| `GET` | `/api/v1/chat/usage` | Kiểm tra hạn mức và số token AI đã sử dụng trong ngày |

---

## ⌨️ Bảng Phím Tắt Tiện Dụng

### Toàn hệ thống
| Phím tắt | Tác vụ |
|---|---|
| `N` | Mở hộp thoại tạo nhanh: Công việc, Mục tiêu hoặc Sự kiện |
| `T` | Chuyển góc nhìn lịch & tổng quan về ngày **Hôm nay** |
| `?` | Hiển thị hộp thoại trợ giúp phím tắt |
| `Escape` | Đóng bất kỳ hộp thoại (modal) đang mở |

### Trong phiên Ôn tập Flashcard (SRS Review)
| Phím tắt | Tác vụ |
|---|---|
| `Space` | Lật mặt trước / mặt sau của thẻ |
| `1` | Đánh giá: **Học lại** (Again - 1 phút) |
| `2` | Đánh giá: **Khó** (Hard - khoảng cách ngắn) |
| `3` | Đánh giá: **Tốt** (Good - khoảng cách tiêu chuẩn) |
| `4` | Đánh giá: **Dễ** (Easy - khoảng cách dài) |
| `Enter` | Kiểm tra chính tả khi bật chế độ "Gõ để nhớ" / Lật thẻ |

*(Hệ thống thông minh tự vô hiệu hóa phím tắt khi con trỏ đang nằm trong ô gõ chữ, đảm bảo không ảnh hưởng khi soạn thảo văn bản)*

---

## 📄 Bản Quyền & Giấy Phép (License)

Dự án được xây dựng và phát triển dưới giấy phép **MIT License**. Mọi cá nhân, tổ chức đều có quyền tham khảo, sử dụng và đóng góp phát triển.
