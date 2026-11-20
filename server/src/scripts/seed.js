import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/user.model.js';
import { Category } from '../models/category.model.js';
import { Goal } from '../models/goal.model.js';
import { Task } from '../models/task.model.js';
import { Event } from '../models/event.model.js';
import { ProgressLog } from '../models/progressLog.model.js';
import { TaskCompletion } from '../models/taskCompletion.model.js';
import { Deck, Card, ReviewLog, Conversation, Message, AiUsage } from '../modules/learn/models/index.js';
import { recalculateGoalProgress } from '../services/progress.service.js';

const DEMO_EMAIL = 'demo@goalcalendar.com';
const DEMO_PASSWORD = 'password123';
const DEMO_NAME = 'Demo User';

const formatDateYYYYMMDD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export async function runSeed(mongoUri = env.MONGODB_URI) {
  if (mongoose.connection.readyState !== 1) {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log(`[Seed] Connected to MongoDB`);
  }

  try {
    // 1. Clean existing demo user and related data
    const existingUser = await User.findOne({ email: DEMO_EMAIL });
    if (existingUser) {
      console.log(`[Seed] Cleaning previous demo data for userId: ${existingUser._id}...`);
      await Promise.all([
        Category.deleteMany({ userId: existingUser._id }),
        Goal.deleteMany({ userId: existingUser._id }),
        Task.deleteMany({ userId: existingUser._id }),
        Event.deleteMany({ userId: existingUser._id }),
        ProgressLog.deleteMany({ userId: existingUser._id }),
        TaskCompletion.deleteMany({ userId: existingUser._id }),
        Deck.deleteMany({ userId: existingUser._id }),
        Card.deleteMany({ userId: existingUser._id }),
        ReviewLog.deleteMany({ userId: existingUser._id }),
        Conversation.deleteMany({ userId: existingUser._id }),
        Message.deleteMany({ userId: existingUser._id }),
        AiUsage.deleteMany({ userId: existingUser._id }),
        User.deleteOne({ _id: existingUser._id }),
      ]);
      console.log('[Seed] Previous data cleaned.');
    }

    // 2. Create Demo User
    const passwordHash = await User.hashPassword(DEMO_PASSWORD);
    const user = await User.create({
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      passwordHash,
      settings: {
        language: 'vi',
        theme: 'light',
        weekStartsOn: 1,
      },
    });
    console.log(`[Seed] Demo user created: ${user.name} (${user.email})`);

    // 3. Create 5 Standard Categories
    const categoriesData = [
      { name: 'Công việc', color: '#3b82f6', icon: 'Briefcase' },
      { name: 'Sức khỏe', color: '#10b981', icon: 'Activity' },
      { name: 'Học tập', color: '#8b5cf6', icon: 'BookOpen' },
      { name: 'Tài chính', color: '#f59e0b', icon: 'DollarSign' },
      { name: 'Cá nhân', color: '#ec4899', icon: 'User' },
    ];

    const categories = await Category.insertMany(
      categoriesData.map((cat) => ({ ...cat, userId: user._id }))
    );
    const catMap = {};
    for (const cat of categories) {
      catMap[cat.name] = cat;
    }
    console.log(`[Seed] Created ${categories.length} categories.`);

    // 4. Date references
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const startOfYear = new Date(currentYear, 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const startOfMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // 5. Create Hierarchical Goals
    // 5.1 Yearly Goals
    const yearlyGoal1 = await Goal.create({
      userId: user._id,
      title: `Đạt thu nhập & Nâng cao kỹ năng ${currentYear}`,
      description: 'Mục tiêu tổng quát phát triển sự nghiệp công nghệ và nâng tầm thu nhập.',
      type: 'year',
      categoryId: catMap['Công việc']._id,
      startDate: startOfYear,
      endDate: endOfYear,
      progressMode: 'auto',
      priority: 'high',
      status: 'in_progress',
      color: '#3b82f6',
      weight: 1,
      progressCache: 50,
    });

    const yearlyGoal2 = await Goal.create({
      userId: user._id,
      title: 'Tiết kiệm 100 triệu',
      description: 'Quỹ dự phòng khẩn cấp và đầu tư tăng trưởng tài sản cá nhân.',
      type: 'year',
      categoryId: catMap['Tài chính']._id,
      startDate: startOfYear,
      endDate: endOfYear,
      progressMode: 'numeric',
      targetValue: 100,
      currentValue: 45,
      unit: 'triệu VNĐ',
      progressCache: 45,
      priority: 'high',
      status: 'in_progress',
      color: '#f59e0b',
      weight: 1,
    });

    // 5.2 Monthly Goals
    const monthlyGoal1 = await Goal.create({
      userId: user._id,
      parentId: yearlyGoal1._id,
      title: 'Hoàn thành khóa học React & TypeScript nâng cao',
      description: 'Làm chủ React 18, Zustand, React Query và mẫu thiết kế kiến trúc sạch.',
      type: 'month',
      categoryId: catMap['Học tập']._id,
      startDate: startOfMonth,
      endDate: endOfMonth,
      progressMode: 'auto',
      priority: 'high',
      status: 'in_progress',
      color: '#8b5cf6',
      weight: 2,
      progressCache: 60,
    });

    const monthlyGoal2 = await Goal.create({
      userId: user._id,
      title: 'Đọc 3 cuốn sách chuyên ngành',
      description: 'Đọc Clean Architecture, Designing Data-Intensive Applications, Refactoring.',
      type: 'month',
      categoryId: catMap['Học tập']._id,
      startDate: startOfMonth,
      endDate: endOfMonth,
      progressMode: 'numeric',
      targetValue: 3,
      currentValue: 2,
      unit: 'cuốn',
      progressCache: 66.7,
      priority: 'medium',
      status: 'in_progress',
      color: '#8b5cf6',
      weight: 1,
    });

    // 5.3 Weekly Goals
    const weeklyGoal1 = await Goal.create({
      userId: user._id,
      parentId: monthlyGoal1._id,
      title: 'Xây dựng dự án GoalCalendar',
      description: 'Hoàn thiện toàn bộ giai đoạn phát triển, kiểm thử và tài liệu hướng dẫn.',
      type: 'week',
      categoryId: catMap['Công việc']._id,
      startDate: startOfWeek,
      endDate: endOfWeek,
      progressMode: 'auto',
      priority: 'high',
      status: 'in_progress',
      color: '#3b82f6',
      weight: 2,
      progressCache: 70,
    });

    const weeklyGoal2 = await Goal.create({
      userId: user._id,
      title: 'Chạy bộ 20km',
      description: 'Tập luyện thể thao đều đặn mỗi tuần để duy trì thể lực dẻo dai.',
      type: 'week',
      categoryId: catMap['Sức khỏe']._id,
      startDate: startOfWeek,
      endDate: endOfWeek,
      progressMode: 'numeric',
      targetValue: 20,
      currentValue: 15,
      unit: 'km',
      progressCache: 75,
      priority: 'medium',
      status: 'in_progress',
      color: '#10b981',
      weight: 1,
    });

    console.log('[Seed] Created hierarchical goals (Yearly, Monthly, Weekly).');

    // 6. Create Tasks
    const today = new Date(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(now.getDate() - 2);

    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);

    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(now.getDate() - 5);

    const habitTask = await Task.create({
      userId: user._id,
      title: 'Uống 2 lít nước & 15 phút giãn cơ',
      notes: 'Thói quen duy trì sức khỏe và cải thiện độ tập trung khi lập trình.',
      goalId: weeklyGoal2._id,
      priority: 'low',
      tags: ['health', 'habit', 'wellness'],
      recurrence: {
        type: 'daily',
        interval: 1,
      },
      isCompleted: false,
    });

    const habitTask2 = await Task.create({
      userId: user._id,
      title: 'Đọc 10 trang sách kỹ thuật',
      notes: 'Duy trì thói quen đọc sách phát triển chuyên môn mỗi ngày.',
      goalId: monthlyGoal2._id,
      priority: 'medium',
      tags: ['study', 'reading', 'habit'],
      recurrence: {
        type: 'daily',
        interval: 1,
      },
      isCompleted: false,
    });

    const habitTask3 = await Task.create({
      userId: user._id,
      title: 'Ghi chép nhật ký phản tư & Thiền 10 phút',
      notes: 'Thói quen chánh niệm và tái tạo năng lượng tinh thần buổi tối.',
      categoryId: catMap['Cá nhân']._id,
      priority: 'low',
      tags: ['mindfulness', 'reflection', 'habit'],
      recurrence: {
        type: 'daily',
        interval: 1,
      },
      isCompleted: false,
    });

    const tasksData = [
      // Today Tasks
      {
        userId: user._id,
        title: 'Review PR và deploy staging GoalCalendar',
        notes: 'Kiểm tra kỹ các luồng dark mode, i18n và phím tắt trước khi merge.',
        goalId: weeklyGoal1._id,
        dueDate: today,
        dueTime: '17:00',
        priority: 'high',
        tags: ['work', 'release', 'dev'],
        isCompleted: false,
      },
      {
        userId: user._id,
        title: 'Luyện tập 1 bài thuật toán LeetCode Medium',
        notes: 'Chủ đề: Dynamic Programming hoặc Graph traversal.',
        goalId: monthlyGoal1._id,
        dueDate: today,
        dueTime: '21:00',
        priority: 'medium',
        tags: ['study', 'algorithm'],
        isCompleted: false,
      },
      // Task with checklist subtasks
      {
        userId: user._id,
        title: 'Xây dựng tính năng Export dữ liệu CSV & JSON',
        notes: 'Cho phép người dùng sao lưu và xuất công việc / mục tiêu bất kỳ lúc nào.',
        goalId: weeklyGoal1._id,
        dueDate: tomorrow,
        dueTime: '15:00',
        priority: 'high',
        tags: ['feature', 'export'],
        subtasks: [
          { title: 'Tạo CSV exporter chuẩn UTF-8 BOM', done: true },
          { title: 'Tạo JSON export định dạng cấu trúc chi tiết', done: true },
          { title: 'Kiểm thử tải file và hiển thị toast thông báo', done: false },
        ],
        isCompleted: false,
      },
      // This week tasks
      {
        userId: user._id,
        title: 'Viết tài liệu API & Cấu trúc cơ sở dữ liệu',
        notes: 'Cập nhật README.md chi tiết từ A-Z với hướng dẫn chạy Docker MongoDB.',
        goalId: weeklyGoal1._id,
        dueDate: tomorrow,
        dueTime: '16:00',
        priority: 'medium',
        tags: ['docs', 'work'],
        isCompleted: false,
      },
      // Completed tasks
      {
        userId: user._id,
        title: 'Khởi tạo repo và cấu hình ESLint / Prettier',
        notes: 'Đã hoàn thành cấu hình môi trường chuẩn.',
        goalId: weeklyGoal1._id,
        dueDate: threeDaysAgo,
        completedAt: threeDaysAgo,
        priority: 'medium',
        tags: ['setup', 'devops'],
        isCompleted: true,
      },
      {
        userId: user._id,
        title: 'Chạy bộ 5km công viên đầu tuần',
        notes: 'Pace 6:00, nhịp tim ổn định 145 bpm.',
        goalId: weeklyGoal2._id,
        dueDate: twoDaysAgo,
        completedAt: twoDaysAgo,
        priority: 'medium',
        tags: ['running', 'health'],
        isCompleted: true,
      },
      // Overdue task
      {
        userId: user._id,
        title: 'Gửi báo cáo tổng kết chi tiêu tháng trước',
        notes: 'Cần phân loại các khoản đầu tư và chi phí cố định.',
        goalId: yearlyGoal2._id,
        dueDate: fiveDaysAgo,
        priority: 'high',
        tags: ['finance', 'urgent'],
        isCompleted: false,
      },
    ];

    await Task.insertMany(tasksData);
    console.log('[Seed] Created tasks with subtasks, completed, overdue, and today tasks.');

    // 7. Seed TaskCompletion for 7-day streak on habit task
    const streakDates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      streakDates.push(formatDateYYYYMMDD(d));
    }

    // Gap date (8 days ago) must not have completion for habitTask so streak is exactly 7
    const streakGapDate = new Date(now);
    streakGapDate.setDate(now.getDate() - 7);
    const streakGapDateStr = formatDateYYYYMMDD(streakGapDate);

    const streakCompletions = streakDates.map((dateStr) => ({
      userId: user._id,
      taskId: habitTask._id,
      date: dateStr,
      completedAt: new Date(`${dateStr}T08:30:00Z`),
    }));
    await TaskCompletion.insertMany(streakCompletions);
    console.log(`[Seed] Seeded 7-day streak (${streakDates[0]} ➔ ${streakDates[streakDates.length - 1]}) for habit task 🔥`);

    // 8. Seed Historical TaskCompletions & Progress across the Year for Heatmap & Charts
    console.log('[Seed] Generating year-round completion records for Heatmap & Activity charts...');
    const scatterCompletions = [];
    const habitTasks = [habitTask, habitTask2, habitTask3];

    // Generate scattered completions across 2026 for Heatmap & Activity charts
    for (let m = 0; m <= currentMonth; m++) {
      const daysInMonth = new Date(currentYear, m + 1, 0).getDate();
      const maxDay = m === currentMonth ? now.getDate() : daysInMonth;

      for (let day = 1; day <= maxDay; day++) {
        // Randomly complete 1 to 3 items on ~75% of days
        const shouldHaveActivity = (day * 7 + m * 13) % 10 < 8;
        if (shouldHaveActivity) {
          const count = 1 + ((day + m) % 3); // 1, 2, or 3
          const d = new Date(currentYear, m, day);
          const dateStr = formatDateYYYYMMDD(d);

          // Skip if already in 7-day streak for habitTask
          for (let k = 0; k < count; k++) {
            const currentHabit = habitTasks[k];
            // If habitTask, do not add if dateStr is in streakDates or is streakGapDateStr
            if (currentHabit._id.equals(habitTask._id)) {
              if (streakDates.includes(dateStr) || dateStr === streakGapDateStr) {
                continue;
              }
            }

            scatterCompletions.push({
              userId: user._id,
              taskId: currentHabit._id,
              date: dateStr,
              completedAt: new Date(currentYear, m, day, 9 + k * 4, 15, 0),
            });
          }
        }
      }
    }
    if (scatterCompletions.length > 0) {
      await TaskCompletion.insertMany(scatterCompletions);
    }
    console.log(`[Seed] Inserted ${scatterCompletions.length} historical task completions for Heatmap.`);

    // 9. Create Calendar Events in current month
    const event1Start = new Date(now);
    event1Start.setHours(9, 0, 0, 0);
    const event1End = new Date(now);
    event1End.setHours(10, 30, 0, 0);

    const event2Start = new Date(tomorrow);
    event2Start.setHours(19, 30, 0, 0);
    const event2End = new Date(tomorrow);
    event2End.setHours(21, 0, 0, 0);

    const event3Start = new Date(yesterday);
    event3Start.setHours(6, 30, 0, 0);
    const event3End = new Date(yesterday);
    event3End.setHours(7, 30, 0, 0);

    const event4Start = new Date(endOfWeek);
    event4Start.setHours(15, 0, 0, 0);
    const event4End = new Date(endOfWeek);
    event4End.setHours(16, 30, 0, 0);

    const eventsData = [
      {
        userId: user._id,
        title: 'Họp Sprint Planning & Goal Review',
        description: 'Đánh giá kết quả sprint trước và lên kế hoạch các mục tiêu tuần mới.',
        start: event1Start,
        end: event1End,
        allDay: false,
        color: '#3b82f6',
        categoryId: catMap['Công việc']._id,
        reminders: [15, 60],
      },
      {
        userId: user._id,
        title: 'Học tiếng Anh giao tiếp với giáo viên bản ngữ',
        description: 'Luyện phản xạ tình huống đàm phán công nghệ và trình bày ý tưởng.',
        start: event2Start,
        end: event2End,
        allDay: false,
        color: '#8b5cf6',
        categoryId: catMap['Học tập']._id,
        reminders: [30],
      },
      {
        userId: user._id,
        title: 'Tập Gym rèn luyện thể lực',
        description: 'Bài tập cơ lưng xô & ngực, chạy cardio nhẹ nhàng 15 phút.',
        start: event3Start,
        end: event3End,
        allDay: false,
        color: '#10b981',
        categoryId: catMap['Sức khỏe']._id,
        reminders: [15],
      },
      {
        userId: user._id,
        title: 'Cân đối ngân sách & Kế hoạch tài chính',
        description: 'Tổng kết thu chi tuần và kiểm tra tỷ lệ tiết kiệm vào mục tiêu 100tr.',
        start: event4Start,
        end: event4End,
        allDay: false,
        color: '#f59e0b',
        categoryId: catMap['Tài chính']._id,
        reminders: [60],
      },
    ];

    await Event.insertMany(eventsData);
    console.log('[Seed] Created calendar events in current month.');

    // 10. Create Rich ProgressLogs for Trend Line Chart & Analytics
    const progressLogs = [
      // Yearly Goal 2 (Savings 100M)
      {
        userId: user._id,
        goalId: yearlyGoal2._id,
        date: new Date(currentYear, 1, 15),
        value: 10,
        delta: 10,
        snapshotPercent: 10,
        note: 'Tiết kiệm khởi đầu năm mới',
      },
      {
        userId: user._id,
        goalId: yearlyGoal2._id,
        date: new Date(currentYear, 3, 30),
        value: 20,
        delta: 10,
        snapshotPercent: 20,
        note: 'Thưởng dự án quý 1 gửi tiết kiệm',
      },
      {
        userId: user._id,
        goalId: yearlyGoal2._id,
        date: new Date(currentYear, 6, 20),
        value: 30,
        delta: 10,
        snapshotPercent: 30,
        note: 'Khoản tiết kiệm định kỳ giữa năm',
      },
      {
        userId: user._id,
        goalId: yearlyGoal2._id,
        date: new Date(currentYear, 8, 30),
        value: 40,
        delta: 10,
        snapshotPercent: 40,
        note: 'Lợi nhuận đầu tư ngắn hạn cộng thêm',
      },
      {
        userId: user._id,
        goalId: yearlyGoal2._id,
        date: new Date(currentYear, 10, 10),
        value: 45,
        delta: 5,
        snapshotPercent: 45,
        note: 'Tiết kiệm tháng 11',
      },

      // Monthly Goal 2 (Read 3 books)
      {
        userId: user._id,
        goalId: monthlyGoal2._id,
        date: new Date(currentYear, currentMonth, 5),
        value: 1,
        delta: 1,
        snapshotPercent: 33.3,
        note: 'Đọc xong cuốn Clean Architecture',
      },
      {
        userId: user._id,
        goalId: monthlyGoal2._id,
        date: new Date(currentYear, currentMonth, 12),
        value: 2,
        delta: 1,
        snapshotPercent: 66.7,
        note: 'Đọc xong cuốn Designing Data-Intensive Applications',
      },

      // Weekly Goal 2 (Run 20km)
      {
        userId: user._id,
        goalId: weeklyGoal2._id,
        date: fiveDaysAgo,
        value: 5,
        delta: 5,
        snapshotPercent: 25,
        note: 'Chạy 5km ngày đầu tuần',
      },
      {
        userId: user._id,
        goalId: weeklyGoal2._id,
        date: threeDaysAgo,
        value: 10,
        delta: 5,
        snapshotPercent: 50,
        note: 'Chạy 5km buổi chiều',
      },
      {
        userId: user._id,
        goalId: weeklyGoal2._id,
        date: yesterday,
        value: 15,
        delta: 5,
        snapshotPercent: 75,
        note: 'Chạy 5km buổi sáng sớm',
      },

      // Yearly Goal 1 & Monthly Goal 1
      {
        userId: user._id,
        goalId: yearlyGoal1._id,
        date: new Date(currentYear, 2, 1),
        value: 20,
        delta: 20,
        snapshotPercent: 20,
        note: 'Hoàn thành quý 1 các kỹ năng nền tảng',
      },
      {
        userId: user._id,
        goalId: yearlyGoal1._id,
        date: new Date(currentYear, 5, 15),
        value: 35,
        delta: 15,
        snapshotPercent: 35,
        note: 'Xong dự án Fullstack đầu tiên',
      },
      {
        userId: user._id,
        goalId: yearlyGoal1._id,
        date: new Date(currentYear, 8, 20),
        value: 50,
        delta: 15,
        snapshotPercent: 50,
        note: 'Đạt cột mốc 50% mục tiêu sự nghiệp',
      },
    ];

    await ProgressLog.insertMany(progressLogs);
    console.log('[Seed] Created progress logs across the year for Trend Line and Analytics.');

    // 11. Run progress recalculation for weekly, monthly, and yearly auto goals
    await recalculateGoalProgress(weeklyGoal1._id, user._id, 'Initial seed calculation');

    // 12. Seed Flashcard Decks & Vocabulary Cards (Module LEARN)
    const oxfordDeck = await Deck.create({
      userId: user._id,
      name: 'Oxford 3000 Cơ bản',
      color: '#3b82f6',
      description: 'Từ vựng tiếng Anh giao tiếp thông dụng hàng ngày',
    });

    const ieltsDeck = await Deck.create({
      userId: user._id,
      name: 'IELTS Academic',
      color: '#8b5cf6',
      description: 'Từ vựng học thuật nâng cao cho bài thi IELTS Writing & Reading',
    });

    const pastDueDate = new Date(Date.now() - 2 * 3600 * 1000); // 2 hours ago (due)
    const futureDueDate = new Date(Date.now() + 5 * 86400 * 1000); // 5 days later

    const sampleCards = [
      // Deck 1: Oxford 3000
      {
        userId: user._id,
        deckId: oxfordDeck._id,
        word: 'accomplish',
        meaning: 'hoàn thành, đạt được mục tiêu',
        partOfSpeech: 'verb',
        example: 'She accomplished her lifelong goal of running a marathon.',
        note: 'Đồng nghĩa: achieve, complete',
        source: 'Oxford Word Skills',
        tags: ['oxford', 'verb', 'common'],
        srs: {
          easeFactor: 2.5,
          intervalDays: 25,
          repetitions: 4,
          lapses: 0,
          dueDate: futureDueDate,
          lastReviewedAt: now,
          status: 'review',
        },
      },
      {
        userId: user._id,
        deckId: oxfordDeck._id,
        word: 'accurate',
        meaning: 'chính xác, đúng đắn, không có sai sót',
        partOfSpeech: 'adjective',
        example: 'The accurate calculation helped us save a lot of money.',
        note: 'Trái nghĩa: inaccurate',
        source: 'Oxford Word Skills',
        tags: ['oxford', 'adjective'],
        srs: {
          easeFactor: 2.4,
          intervalDays: 1,
          repetitions: 1,
          lapses: 0,
          dueDate: pastDueDate,
          lastReviewedAt: new Date(Date.now() - 86400 * 1000),
          status: 'learning',
        },
      },
      {
        userId: user._id,
        deckId: oxfordDeck._id,
        word: 'adapt',
        meaning: 'thích nghi, quen thuộc với hoàn cảnh mới',
        partOfSpeech: 'verb',
        example: 'It took him several months to adapt to living abroad.',
        note: 'Đi kèm giới từ to: adapt to sth',
        source: 'Oxford Word Skills',
        tags: ['oxford', 'verb'],
        srs: {
          easeFactor: 2.5,
          intervalDays: 0,
          repetitions: 0,
          lapses: 0,
          dueDate: now,
          lastReviewedAt: null,
          status: 'new',
        },
      },
      {
        userId: user._id,
        deckId: oxfordDeck._id,
        word: 'benefit',
        meaning: 'lợi ích, thuận lợi / mang lại lợi ích',
        partOfSpeech: 'noun',
        example: 'Regular exercise offers countless physical and mental benefits.',
        note: 'Dạng tính từ: beneficial',
        source: 'Oxford 3000',
        tags: ['oxford', 'noun'],
        srs: {
          easeFactor: 2.6,
          intervalDays: 30,
          repetitions: 5,
          lapses: 0,
          dueDate: futureDueDate,
          lastReviewedAt: now,
          status: 'review',
        },
      },
      {
        userId: user._id,
        deckId: oxfordDeck._id,
        word: 'crucial',
        meaning: 'cực kỳ quan trọng, quyết định',
        partOfSpeech: 'adjective',
        example: 'Sound sleep is crucial for maintaining overall cognitive function.',
        note: 'Đồng nghĩa: essential, vital',
        source: 'Oxford 3000',
        tags: ['oxford', 'adjective'],
        srs: {
          easeFactor: 2.5,
          intervalDays: 2,
          repetitions: 1,
          lapses: 0,
          dueDate: pastDueDate,
          lastReviewedAt: new Date(Date.now() - 2 * 86400 * 1000),
          status: 'learning',
        },
      },
      {
        userId: user._id,
        deckId: oxfordDeck._id,
        word: 'diversity',
        meaning: 'sự đa dạng, phong phú',
        partOfSpeech: 'noun',
        example: 'Our company actively embraces and promotes cultural diversity.',
        note: 'Tính từ: diverse',
        source: 'Oxford 3000',
        tags: ['oxford', 'noun'],
        srs: {
          easeFactor: 2.5,
          intervalDays: 0,
          repetitions: 0,
          lapses: 0,
          dueDate: now,
          lastReviewedAt: null,
          status: 'new',
        },
      },
      {
        userId: user._id,
        deckId: oxfordDeck._id,
        word: 'enhance',
        meaning: 'nâng cao, gia tăng chất lượng hoặc giá trị',
        partOfSpeech: 'verb',
        example: 'Listening to English podcasts will quickly enhance your pronunciation.',
        note: 'Đồng nghĩa: improve, boost',
        source: 'Oxford 3000',
        tags: ['oxford', 'verb'],
        srs: {
          easeFactor: 2.5,
          intervalDays: 1,
          repetitions: 1,
          lapses: 0,
          dueDate: pastDueDate,
          lastReviewedAt: new Date(Date.now() - 86400 * 1000),
          status: 'learning',
        },
      },
      {
        userId: user._id,
        deckId: oxfordDeck._id,
        word: 'frequent',
        meaning: 'thường xuyên, hay xảy ra',
        partOfSpeech: 'adjective',
        example: 'He is a frequent passenger on the early morning express train.',
        note: 'Trạng từ: frequently',
        source: 'Oxford 3000',
        tags: ['oxford', 'adjective'],
        srs: {
          easeFactor: 2.5,
          intervalDays: 0,
          repetitions: 0,
          lapses: 0,
          dueDate: now,
          lastReviewedAt: null,
          status: 'new',
        },
      },
      {
        userId: user._id,
        deckId: oxfordDeck._id,
        word: 'generate',
        meaning: 'tạo ra, sản sinh ra (năng lượng, ý tưởng)',
        partOfSpeech: 'verb',
        example: 'The solar panels generate clean electricity for the whole campus.',
        note: 'Danh từ: generation',
        source: 'Oxford 3000',
        tags: ['oxford', 'verb'],
        srs: {
          easeFactor: 2.5,
          intervalDays: 22,
          repetitions: 3,
          lapses: 0,
          dueDate: futureDueDate,
          lastReviewedAt: now,
          status: 'review',
        },
      },
      {
        userId: user._id,
        deckId: oxfordDeck._id,
        word: 'hesitate',
        meaning: 'ngập ngừng, do dự',
        partOfSpeech: 'verb',
        example: 'Please do not hesitate to contact our customer support team.',
        note: 'Danh từ: hesitation',
        source: 'Oxford 3000',
        tags: ['oxford', 'verb'],
        srs: {
          easeFactor: 2.5,
          intervalDays: 0,
          repetitions: 0,
          lapses: 0,
          dueDate: now,
          lastReviewedAt: null,
          status: 'suspended',
        },
      },

      // Deck 2: IELTS Academic
      {
        userId: user._id,
        deckId: ieltsDeck._id,
        word: 'alleviate',
        meaning: 'làm giảm bớt, xoa dịu (nỗi đau, áp lực, tắc đường)',
        partOfSpeech: 'verb',
        example: 'Urgent infrastructure investments are required to alleviate urban congestion.',
        note: 'Đồng nghĩa: relieve, ease, mitigate',
        source: 'Cambridge IELTS 17',
        tags: ['ielts', 'writing-task-2'],
        srs: {
          easeFactor: 2.5,
          intervalDays: 28,
          repetitions: 4,
          lapses: 0,
          dueDate: futureDueDate,
          lastReviewedAt: now,
          status: 'review',
        },
      },
      {
        userId: user._id,
        deckId: ieltsDeck._id,
        word: 'coherent',
        meaning: 'mạch lạc, chặt chẽ, dễ hiểu',
        partOfSpeech: 'adjective',
        example: 'A coherent essay structure is crucial for achieving Band 7+ in Writing.',
        note: 'Danh từ: coherence',
        source: 'Cambridge IELTS 16',
        tags: ['ielts', 'academic'],
        srs: {
          easeFactor: 2.3,
          intervalDays: 2,
          repetitions: 1,
          lapses: 0,
          dueDate: pastDueDate,
          lastReviewedAt: new Date(Date.now() - 2 * 86400 * 1000),
          status: 'learning',
        },
      },
      {
        userId: user._id,
        deckId: ieltsDeck._id,
        word: 'deteriorate',
        meaning: 'suy giảm, trở nên tồi tệ hơn theo thời gian',
        partOfSpeech: 'verb',
        example: 'Air quality in the city center has begun to deteriorate dramatically.',
        note: 'Danh từ: deterioration',
        source: 'IELTS Academic Vocab',
        tags: ['ielts', 'verb'],
        srs: {
          easeFactor: 2.5,
          intervalDays: 0,
          repetitions: 0,
          lapses: 0,
          dueDate: now,
          lastReviewedAt: null,
          status: 'new',
        },
      },
      {
        userId: user._id,
        deckId: ieltsDeck._id,
        word: 'eloquent',
        meaning: 'hùng biện, có tài ăn nói lưu loát và thuyết phục',
        partOfSpeech: 'adjective',
        example: 'She delivered an eloquent defense of environmental conservation.',
        note: 'Trạng từ: eloquently',
        source: 'IELTS Speaking Master',
        tags: ['ielts', 'speaking'],
        srs: {
          easeFactor: 2.5,
          intervalDays: 24,
          repetitions: 3,
          lapses: 0,
          dueDate: futureDueDate,
          lastReviewedAt: now,
          status: 'review',
        },
      },
      {
        userId: user._id,
        deckId: ieltsDeck._id,
        word: 'feasible',
        meaning: 'khả thi, có thể thực hiện thành công',
        partOfSpeech: 'adjective',
        example: 'Transitioning completely to renewable energy is technically feasible.',
        note: 'Danh từ: feasibility',
        source: 'Cambridge IELTS 15',
        tags: ['ielts', 'adjective'],
        srs: {
          easeFactor: 2.4,
          intervalDays: 1,
          repetitions: 1,
          lapses: 0,
          dueDate: pastDueDate,
          lastReviewedAt: new Date(Date.now() - 86400 * 1000),
          status: 'learning',
        },
      },
      {
        userId: user._id,
        deckId: ieltsDeck._id,
        word: 'inevitable',
        meaning: 'không thể tránh khỏi, tất yếu',
        partOfSpeech: 'adjective',
        example: 'Technological disruption has become an inevitable part of modern economies.',
        note: 'Đồng nghĩa: unavoidable',
        source: 'Cambridge IELTS 18',
        tags: ['ielts', 'academic'],
        srs: {
          easeFactor: 2.5,
          intervalDays: 0,
          repetitions: 0,
          lapses: 0,
          dueDate: now,
          lastReviewedAt: null,
          status: 'new',
        },
      },
      {
        userId: user._id,
        deckId: ieltsDeck._id,
        word: 'meticulous',
        meaning: 'tỉ mỉ, cẩn thận từng chi tiết nhỏ',
        partOfSpeech: 'adjective',
        example: 'Scientific research demands meticulous planning and precise documentation.',
        note: 'Đồng nghĩa: painstaking, thorough',
        source: 'Cambridge IELTS 17',
        tags: ['ielts', 'academic'],
        srs: {
          easeFactor: 2.5,
          intervalDays: 35,
          repetitions: 5,
          lapses: 0,
          dueDate: futureDueDate,
          lastReviewedAt: now,
          status: 'review',
        },
      },
      {
        userId: user._id,
        deckId: ieltsDeck._id,
        word: 'prevalent',
        meaning: 'phổ biến rộng rãi, thịnh hành',
        partOfSpeech: 'adjective',
        example: 'Remote work arrangements are increasingly prevalent across technology firms.',
        note: 'Danh từ: prevalence',
        source: 'IELTS Academic Vocab',
        tags: ['ielts', 'academic'],
        srs: {
          easeFactor: 2.5,
          intervalDays: 0,
          repetitions: 0,
          lapses: 0,
          dueDate: now,
          lastReviewedAt: null,
          status: 'new',
        },
      },
      {
        userId: user._id,
        deckId: ieltsDeck._id,
        word: 'scrutinize',
        meaning: 'xem xét kỹ lưỡng, kiểm tra cặn kẽ',
        partOfSpeech: 'verb',
        example: 'Financial regulators will scrutinize the acquisition deal thoroughly.',
        note: 'Danh từ: scrutiny',
        source: 'Cambridge IELTS 14',
        tags: ['ielts', 'verb'],
        srs: {
          easeFactor: 2.4,
          intervalDays: 2,
          repetitions: 1,
          lapses: 0,
          dueDate: pastDueDate,
          lastReviewedAt: new Date(Date.now() - 2 * 86400 * 1000),
          status: 'learning',
        },
      },
      {
        userId: user._id,
        deckId: ieltsDeck._id,
        word: 'ubiquitous',
        meaning: 'có mặt ở khắp nơi cùng lúc, nhan nhản',
        partOfSpeech: 'adjective',
        example: 'Mobile phones and high-speed internet have become ubiquitous in daily life.',
        note: 'Đồng nghĩa: omnipresent, pervasive',
        source: 'Cambridge IELTS 15',
        tags: ['ielts', 'academic'],
        srs: {
          easeFactor: 2.6,
          intervalDays: 45,
          repetitions: 6,
          lapses: 0,
          dueDate: futureDueDate,
          lastReviewedAt: now,
          status: 'review',
        },
      },
    ];

    const insertedCards = await Card.insertMany(sampleCards);

    // Seed realistic ReviewLogs for cards that have been reviewed
    const sampleReviewLogs = [];
    for (const c of insertedCards) {
      if (c.srs.repetitions > 0 || c.srs.lapses > 0) {
        sampleReviewLogs.push({
          userId: user._id,
          cardId: c._id,
          rating: c.srs.lapses > 0 ? 1 : c.srs.repetitions >= 3 ? 4 : 3,
          prevInterval: Math.max(0, c.srs.intervalDays - 5),
          newInterval: c.srs.intervalDays,
          durationMs: 2500 + Math.floor(Math.random() * 2000),
          reviewedAt: c.srs.lastReviewedAt || now,
        });
      }
    }
    if (sampleReviewLogs.length > 0) {
      await ReviewLog.insertMany(sampleReviewLogs);
    }

    console.log(`[Seed] Seeded 2 Learn decks ("${oxfordDeck.name}", "${ieltsDeck.name}"), ${sampleCards.length} rich flashcards and ${sampleReviewLogs.length} review logs.`);

    // 10. Seed Demo AI Chat Conversation
    const demoConv = await Conversation.create({
      userId: user._id,
      title: 'Lộ trình học IELTS 7.0 & Từ vựng C1',
      pinned: true,
    });
    await Message.create([
      {
        conversationId: demoConv._id,
        userId: user._id,
        role: 'user',
        content: 'Chào AI, hãy giúp tôi lên lộ trình học tiếng Anh bứt phá từ vựng nhé!',
      },
      {
        conversationId: demoConv._id,
        userId: user._id,
        role: 'assistant',
        content: 'Chào bạn! Tôi rất vui được đồng hành cùng bạn trên con đường chinh phục tiếng Anh. Với nền tảng trong GoalCalendar, bạn hãy tập trung hoàn thành các mục tiêu từ vựng hàng ngày và duy trì chuỗi Spaced Repetition đều đặn nhé!',
        tokenUsage: { input: 18, output: 42 },
      },
    ]);
    console.log('[Seed] Seeded 1 demo AI Chat conversation with messages.');

    console.log('---------------------------------------------------------');
    console.log('✅ SEED COMPLETED SUCCESSFULLY!');
    console.log(`👤 Demo Account: ${DEMO_EMAIL}`);
    console.log(`🔑 Password:     ${DEMO_PASSWORD}`);
    console.log('📊 Includes: 5 Categories, Hierarchical Goals, Tasks, Habit Streak, Events, Flashcards & Year-round Stats');
    console.log('---------------------------------------------------------');

    return {
      user,
      categories,
      yearlyGoal1,
      yearlyGoal2,
      monthlyGoal1,
      monthlyGoal2,
      weeklyGoal1,
      weeklyGoal2,
      decks: [oxfordDeck, ieltsDeck],
      cardsCount: sampleCards.length,
    };
  } catch (err) {
    console.error('[Seed] Error seeding data:', err);
    throw err;
  }
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('server/src/scripts/seed.js')) {
  runSeed()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      await mongoose.disconnect();
      process.exit(1);
    });
}
