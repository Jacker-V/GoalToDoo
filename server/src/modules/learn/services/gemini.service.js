import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { env } from '../../../config/env.js';
import { Goal } from '../../../models/goal.model.js';
import { Task } from '../../../models/task.model.js';
import { TaskCompletion } from '../../../models/taskCompletion.model.js';
import { Card } from '../models/card.model.js';
import { LearnerProfile } from '../models/learnerProfile.model.js';

export const SAMPLE_PROPOSED_CARDS = [
  {
    word: 'Perseverance',
    meaning: 'Sự kiên trì, bền bỉ vượt qua khó khăn',
    partOfSpeech: 'noun',
    example: 'Language learning requires exceptional perseverance.',
    note: 'Band C1 • Trích xuất từ tài liệu',
  },
  {
    word: 'Acquisition',
    meaning: 'Sự tiếp thu, lĩnh hội kiến thức hoặc ngôn ngữ',
    partOfSpeech: 'noun',
    example: 'Spaced repetition significantly accelerates vocabulary acquisition.',
    note: 'Band C1 • Trích xuất từ tài liệu',
  },
  {
    word: 'Fluency',
    meaning: 'Sự lưu loát, trôi chảy trong giao tiếp',
    partOfSpeech: 'noun',
    example: 'Consistent daily practice is key to reaching conversational fluency.',
    note: 'Band B2 • Trích xuất từ tài liệu',
  },
  {
    word: 'Nuance',
    meaning: 'Sắc thái tinh tế về ngữ nghĩa hoặc cảm xúc',
    partOfSpeech: 'noun',
    example: 'Advanced learners should appreciate semantic nuances in idioms.',
    note: 'Band C2 • Trích xuất từ tài liệu',
  },
  {
    word: 'Resilience',
    meaning: 'Sự kiên cường, khả năng phục hồi nhanh chóng',
    partOfSpeech: 'noun',
    example: 'Mental resilience enables students to overcome exam anxiety.',
    note: 'Band B2 • Trích xuất từ tài liệu',
  },
];

export const SAMPLE_STUDY_PLAN = {
  yearGoal: {
    title: 'Chinh phục IELTS 6.5 & Giao tiếp tự tin',
    description: 'Lộ trình phát triển toàn diện 4 kỹ năng và làm chủ 1500 từ vựng cốt lõi trong 6 tháng',
    priority: 'high',
    color: '#6366f1',
  },
  monthGoals: [
    {
      title: 'Tháng 1-2: Xây vững nền tảng phát âm IPA & 500 từ cốt lõi',
      description: 'Làm chủ 44 âm IPA, học thì hiện tại đơn & quá khứ đơn, ôn 15 từ vựng/ngày',
      priority: 'high',
      color: '#3b82f6',
      weight: 1,
    },
    {
      title: 'Tháng 3-4: Bứt phá vốn từ 1,500 từ & Kỹ thuật Shadowing',
      description: 'Mở rộng từ vựng chủ đề công việc, du lịch, luyện nói nhại theo VOA/BBC',
      priority: 'medium',
      color: '#10b981',
      weight: 1,
    },
  ],
  weekGoals: [
    {
      title: 'Tuần 1: Chuẩn hóa 20 nguyên âm & Thói quen Flashcard',
      description: 'Học 20 nguyên âm IPA và ôn tập 50 thẻ từ vựng đầu tiên trên GoalCalendar',
      priority: 'high',
      monthGoalIndex: 0,
      weight: 1,
    },
    {
      title: 'Tuần 2: 24 phụ âm & Ôn tập ngữ pháp thì Hiện tại',
      description: 'Phân biệt phụ âm vô thanh/hữu thanh và áp dụng chia động từ thì hiện tại',
      priority: 'medium',
      monthGoalIndex: 0,
      weight: 1,
    },
  ],
  tasks: [
    {
      title: 'Luyện 10 nguyên âm đơn IPA (15 phút)',
      notes: 'Xem video hướng dẫn VOA và luyện tập khẩu hình miệng trước gương',
      priority: 'high',
      weekGoalIndex: 0,
      subtasks: [
        { title: 'Luyện cặp âm /i:/ và /i/' },
        { title: 'Luyện cặp âm /u:/ và /u/' },
      ],
    },
    {
      title: 'Ôn 20 thẻ từ vựng chủ đề Daily Routine',
      notes: 'Dùng Spaced Repetition (SRS) trên GoalCalendar',
      priority: 'medium',
      weekGoalIndex: 0,
      subtasks: [],
    },
    {
      title: 'Đọc mẩu tin tức BBC ngắn & trích 5 từ vựng mới',
      notes: 'Thêm trực tiếp vào bộ thẻ Flashcard trên GoalCalendar',
      priority: 'medium',
      weekGoalIndex: 0,
      subtasks: [],
    },
    {
      title: 'Luyện nghe phản xạ hội thoại giao tiếp cơ bản (20 phút)',
      notes: 'Nghe podcast Spotlight English hoặc 6 Minute English',
      priority: 'medium',
      weekGoalIndex: 1,
      subtasks: [],
    },
  ],
};

export const SAMPLE_PROPOSED_PROFILE_UPDATE = {
  level: 'Intermediate (B1)',
  targetGoal: 'IELTS 6.5 trong 6 tháng',
  dailyMinutes: 45,
  weaknesses: ['Từ vựng học thuật', 'Phản xạ nói trôi chảy', 'Ngữ pháp thì hoàn thành'],
  interests: ['Công nghệ', 'Du lịch quốc tế', 'Kinh doanh'],
  notes: 'Tập trung luyện nghe podcast và hoàn thành 100% thẻ flashcard đến hạn mỗi ngày',
};

/**
 * Checks if the user prompt or attached files indicate vocabulary extraction.
 */
export function shouldProposeCards(userPrompt, attachments = []) {
  if (attachments && attachments.length > 0) return true;
  const lower = (userPrompt || '').toLowerCase();
  return (
    lower.includes('trích từ') ||
    lower.includes('trích xuất') ||
    lower.includes('tạo thẻ') ||
    lower.includes('đề xuất từ') ||
    lower.includes('từ mới') ||
    lower.includes('extract') ||
    lower.includes('flashcard') ||
    lower.includes('vocab')
  );
}

/**
 * Checks if the user prompt requests a structured study plan/roadmap.
 */
export function shouldProposeStudyPlan(userPrompt) {
  const lower = (userPrompt || '').toLowerCase();
  return (
    lower.includes('lộ trình') ||
    lower.includes('kế hoạch') ||
    lower.includes('chiến lược') ||
    lower.includes('roadmap') ||
    lower.includes('study plan') ||
    lower.includes('lên lịch') ||
    lower.includes('mất gốc')
  );
}

/**
 * Checks if the user prompt indicates learner profile information/updates.
 */
export function shouldUpdateLearnerProfile(userPrompt) {
  const lower = (userPrompt || '').toLowerCase();
  return (
    lower.includes('trình độ') ||
    lower.includes('mục tiêu') ||
    lower.includes('ielts') ||
    lower.includes('toeic') ||
    lower.includes('toefl') ||
    lower.includes('cefr') ||
    /\b(a1|a2|b1|b2|c1|c2)\b/i.test(lower) ||
    lower.includes('điểm yếu') ||
    lower.includes('sở thích') ||
    lower.includes('yếu kỹ năng') ||
    lower.includes('target') ||
    lower.includes('phút mỗi ngày') ||
    lower.includes('hồ sơ học tập') ||
    lower.includes('cập nhật hồ sơ')
  );
}

/**
 * Gathers user productivity & learning context to ground AI interactions.
 */
export const getUserAppContext = async (userId) => {
  try {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    const [goals, dueCardsCount, leechCards, regularDoneCount, recurringDoneCount, learnerProfile] = await Promise.all([
      Goal.find({ userId, status: { $in: ['in_progress', 'not_started'] } })
        .limit(5)
        .select('title progressCache targetValue currentValue unit status')
        .lean(),
      Card.countDocuments({
        userId,
        'srs.status': { $ne: 'suspended' },
        'srs.dueDate': { $lte: new Date() },
      }),
      Card.find({ userId, 'srs.lapses': { $gte: 2 } })
        .sort({ 'srs.lapses': -1 })
        .limit(5)
        .select('word meaning srs.lapses')
        .lean(),
      Task.countDocuments({
        userId,
        isCompleted: true,
        $or: [
          { completedAt: { $gte: weekStart, $lte: weekEnd } },
          { completedAt: null, updatedAt: { $gte: weekStart, $lte: weekEnd } },
        ],
      }),
      TaskCompletion.countDocuments({
        userId,
        date: { $gte: weekStartStr, $lte: weekEndStr },
      }),
      LearnerProfile.findOne({ userId }).lean(),
    ]);

    const weeklyCompletedTasks = regularDoneCount + recurringDoneCount;
    const avgGoalProgress =
      goals.length > 0
        ? Math.round(goals.reduce((acc, g) => acc + (g.progressCache || 0), 0) / goals.length)
        : 0;

    return {
      activeGoals: goals.map((g) => ({
        title: g.title,
        progress: g.progressCache ?? 0,
        targetValue: g.targetValue,
        currentValue: g.currentValue,
        unit: g.unit || '',
      })),
      weeklyProgress: {
        completedTasks: weeklyCompletedTasks,
        avgGoalProgress,
      },
      dueCardsCount,
      leechCards: leechCards.map((c) => ({
        word: c.word,
        meaning: c.meaning,
        lapses: c.srs?.lapses || 0,
      })),
      learnerProfile: learnerProfile || null,
    };
  } catch (err) {
    console.warn('[GeminiService] Failed to gather user app context:', err.message);
    return {
      activeGoals: [],
      weeklyProgress: { completedTasks: 0, avgGoalProgress: 0 },
      dueCardsCount: 0,
      leechCards: [],
      learnerProfile: null,
    };
  }
};

/**
 * Builds the system instruction prompt including app context and rolling summary.
 */
export const buildSystemPrompt = (appContext, summary) => {
  let prompt = `Bạn là GoalCalendar AI - Trợ lý gia sư tiếng Anh và huấn luyện viên năng suất cá nhân thông minh.
Nhiệm vụ của bạn:
1. Hướng dẫn người dùng học tiếng Anh toàn diện: từ vựng, ngữ pháp, phát âm (IPA), thành ngữ, collocations, sửa bài viết, và lập kế hoạch ôn thi.
2. Gắn kết việc học với các mục tiêu cá nhân và thói quen ôn tập thẻ từ vựng thực tế trong GoalCalendar.
3. Khi người dùng gửi tệp đính kèm (ảnh, PDF, tài liệu) hoặc yêu cầu trích xuất từ vựng ('trích từ mới', 'trích xuất', 'tạo flashcard'), hãy phân tích kỹ lưỡng và cung cấp danh sách từ vựng hay. Nếu có đề xuất các thẻ từ vựng cụ thể, hãy đưa vào khối json:propose_cards dạng:
\`\`\`json:propose_cards
[
  {
    "word": "Perseverance",
    "meaning": "Sự kiên trì, bền bỉ",
    "partOfSpeech": "noun",
    "example": "Success requires perseverance.",
    "note": "Band C1"
  }
]
\`\`\`
4. Khi người dùng yêu cầu lập lộ trình, chiến lược học hoặc kế hoạch học tập phân cấp (roadmap, study plan), hãy giải thích chi tiết trong bài viết VÀ đính kèm khối json:propose_study_plan dạng:
\`\`\`json:propose_study_plan
{
  "yearGoal": { "title": "...", "description": "...", "priority": "high", "color": "#6366f1" },
  "monthGoals": [{ "title": "...", "description": "...", "priority": "high", "color": "#3b82f6", "weight": 1 }],
  "weekGoals": [{ "title": "...", "description": "...", "priority": "high", "monthGoalIndex": 0, "weight": 1 }],
  "tasks": [{ "title": "...", "notes": "...", "dueDate": "...", "priority": "medium", "weekGoalIndex": 0, "subtasks": [] }]
}
\`\`\`
5. Khi người dùng chia sẻ hoặc thay đổi thông tin về trình độ, mục tiêu kỳ vọng, thời gian rảnh, điểm yếu hoặc sở thích, hãy đồng thời đề xuất cập nhật hồ sơ người học vào khối json:update_learner_profile dạng:
\`\`\`json:update_learner_profile
{
  "level": "...",
  "targetGoal": "...",
  "dailyMinutes": 45,
  "weaknesses": ["..."],
  "interests": ["..."],
  "notes": "..."
}
\`\`\`
6. Luôn giải thích rõ ràng, súc tích, phong cách thân thiện, khuyến khích học viên. Định dạng markdown đẹp mắt.`;

  // Tier 3 Memory: Learner Profile
  if (appContext?.learnerProfile) {
    const lp = appContext.learnerProfile;
    prompt += `\n\n--- HỒ SƠ NGƯỜI HỌC (LEARNER PROFILE - TRÍ NHỚ TẦNG 3) ---`;
    prompt += `\n• Trình độ hiện tại: ${lp.level || 'Intermediate (B1)'}`;
    if (lp.targetGoal) prompt += `\n• Mục tiêu kỳ vọng: ${lp.targetGoal}`;
    if (lp.targetDate) prompt += `\n• Thời hạn hoàn thành: ${new Date(lp.targetDate).toISOString().slice(0, 10)}`;
    prompt += `\n• Thời gian học mỗi ngày: ${lp.dailyMinutes || 30} phút`;
    if (lp.weaknesses && lp.weaknesses.length > 0) {
      prompt += `\n• Điểm yếu cần khắc phục: ${lp.weaknesses.join(', ')}`;
    }
    if (lp.interests && lp.interests.length > 0) {
      prompt += `\n• Sở thích / Chủ đề quan tâm: ${lp.interests.join(', ')}`;
    }
    if (lp.notes) {
      prompt += `\n• Ghi chú cá nhân: ${lp.notes}`;
    }
    prompt += `\n(GHI CHÚ: Hãy luôn cá nhân hóa câu trả lời, từ vựng và bài tập dựa trên trình độ, điểm yếu và mục tiêu của người học)`;
  }

  if (appContext) {
    prompt += `\n\n--- DỮ LIỆU THỰC TẾ CỦA NGƯỜI DÙNG TRONG GOALCALENDAR ---`;
    if (appContext.activeGoals && appContext.activeGoals.length > 0) {
      prompt += `\n• Mục tiêu đang theo đuổi:`;
      appContext.activeGoals.forEach((g) => {
        prompt += `\n  - ${g.title}: ${g.currentValue || 0}/${g.targetValue || 100} ${g.unit} (tiến độ: ${g.progress}%)`;
      });
    } else {
      prompt += `\n• Mục tiêu: Người dùng chưa có mục tiêu nào đang thực hiện. Hãy gợi ý họ đặt mục tiêu học tiếng Anh.`;
    }

    if (appContext.weeklyProgress) {
      prompt += `\n• Tiến độ tuần này: Đã hoàn thành ${appContext.weeklyProgress.completedTasks} nhiệm vụ/thói quen, tiến độ mục tiêu trung bình ${appContext.weeklyProgress.avgGoalProgress}%.`;
    }

    prompt += `\n• Số thẻ Flashcard đến hạn ôn hôm nay: ${appContext.dueCardsCount || 0} thẻ.`;

    if (appContext.leechCards && appContext.leechCards.length > 0) {
      prompt += `\n• Từ vựng hay quên (cần ưu tiên củng cố): ${appContext.leechCards
        .map((c) => `${c.word} (${c.meaning})`)
        .join(', ')}.`;
    }
  }

  if (summary && summary.trim()) {
    prompt += `\n\n--- BỐI CẢNH TIN NHẮN TRƯỚC ĐÓ (ROLLING SUMMARY) ---\n${summary.trim()}`;
  }

  return prompt;
};

/**
 * Generates an intelligent mock response for fallback/demo/test mode.
 */
export const generateMockResponseText = (userPrompt, appContext, summary, attachments = []) => {
  const promptLower = (userPrompt || '').toLowerCase();

  // 0. Attachment or Vocab Extraction trigger
  if (attachments.length > 0 || promptLower.includes('trích từ') || promptLower.includes('trích xuất') || promptLower.includes('tạo thẻ')) {
    const fileNotice = attachments.length > 0
      ? `\n> 📎 **Đã phân tích ${attachments.length} tệp đính kèm:** ${attachments.map((a) => `\`${a.name}\``).join(', ')}`
      : '';

    return `### 📄 Phân tích tài liệu & Trích xuất từ vựng thành Flashcard
${fileNotice}

Tôi đã phân tích nội dung và trích xuất các từ vựng học thuật quan trọng (Band B2 - C2) phù hợp để ghi nhớ qua Flashcard:

1. **Perseverance** *(noun)* - /ˌpɜː.sɪˈvɪə.rəns/
   * **Nghĩa:** Sự kiên trì, bền bỉ vượt qua khó khăn.
   * **Ví dụ:** *Language learning requires exceptional perseverance.*

2. **Acquisition** *(noun)* - /ˌæk.wɪˈzɪʃ.ən/
   * **Nghĩa:** Sự tiếp thu, lĩnh hội kiến thức hoặc ngôn ngữ.
   * **Ví dụ:** *Spaced repetition significantly accelerates vocabulary acquisition.*

3. **Fluency** *(noun)* - /ˈfluː.ən.si/
   * **Nghĩa:** Sự lưu loát, trôi chảy trong giao tiếp.
   * **Ví dụ:** *Consistent daily practice is key to reaching conversational fluency.*

4. **Nuance** *(noun)* - /ˈnjuː.ɑːns/
   * **Nghĩa:** Sắc thái tinh tế về ngữ nghĩa hoặc cảm xúc.
   * **Ví dụ:** *Advanced learners should appreciate semantic nuances in idioms.*

5. **Resilience** *(noun)* - /rɪˈzɪl.jəns/
   * **Nghĩa:** Sự kiên cường, khả năng phục hồi nhanh chóng.
   * **Ví dụ:** *Mental resilience enables students to overcome exam anxiety.*

---
💡 *Bạn có thể xem bảng đề xuất bên dưới và chọn các từ muốn thêm trực tiếp vào Bộ thẻ của bạn!*`;
  }

  // 1. Learner Profile update suggestion
  if (shouldUpdateLearnerProfile(userPrompt) && !shouldProposeStudyPlan(userPrompt)) {
    return `### 🎯 Đề xuất Cập nhật Hồ sơ Người học & Mục tiêu mới

Chào bạn! Tôi đã ghi nhận những chia sẻ của bạn về trình độ, mục tiêu và thói quen học tập:
* 🎓 **Trình độ:** Intermediate (B1)
* 🎯 **Mục tiêu kỳ vọng:** IELTS 6.5 trong 6 tháng
* ⏱️ **Thời gian tự học:** 45 phút mỗi ngày
* ⚠️ **Điểm yếu cần khắc phục:** Từ vựng học thuật, Phản xạ nói trôi chảy, Ngữ pháp thì hoàn thành
* 💡 **Sở thích / Lĩnh vực quan tâm:** Công nghệ, Du lịch quốc tế, Kinh doanh

---
💡 *Tôi đã tạo một thẻ đề xuất cập nhật ở bên dưới. Bạn có thể bấm **"Cập nhật hồ sơ"** để tôi lưu lại vào trí nhớ dài hạn và cá nhân hóa lộ trình học cho bạn nhé!*`;
  }

  // 2. Roadmap / Study Plan
  if (shouldProposeStudyPlan(userPrompt)) {
    let contextNote = '';
    if (appContext?.dueCardsCount > 0) {
      contextNote = `\n> 🎯 **Lời khuyên thực tế:** Hôm nay bạn đang có **${appContext.dueCardsCount} thẻ Flashcard** đến hạn ôn trong GoalCalendar. Hãy hoàn thành lượt ôn hôm nay để giữ vững chuỗi học nhé!`;
    }

    return `### 🚀 Lộ trình 6 tháng & Kế hoạch học tiếng Anh toàn diện

Chào bạn! Dưới đây là lộ trình 6 tháng được cá nhân hóa kết hợp cùng phương pháp lặp lại ngắt quãng (Spaced Repetition) trên GoalCalendar:

---

#### 📌 Giai đoạn 1: Xây nền vững chắc (Tháng 1 - Tháng 2)
* **Phát âm chuẩn IPA:** Làm quen với 44 âm trong bảng IPA quốc tế. Mỗi ngày luyện 2-3 âm, chú ý các cặp âm dễ nhầm (ví dụ: /iː/ vs /ɪ/, /s/ vs /ʃ/).
* **500 Từ vựng cốt lõi:** Học qua bộ thẻ **Oxford 3000** cơ bản trong GoalCalendar. Đặt mục tiêu học 15 từ mới/ngày và ôn tập đều đặn.
* **Ngữ pháp nền tảng:** Thì hiện tại đơn, quá khứ đơn, tương lai đơn, cấu trúc câu khẳng định/phủ định/nghi vấn.

---

#### 📌 Giai đoạn 2: Bứt phá giao tiếp (Tháng 3 - Tháng 4)
* **Mở rộng vốn từ lên 1,500 từ:** Tập trung vào các chủ đề quen thuộc (Công việc, Sở thích, Du lịch, Mua sắm).
* **Kỹ thuật Shadowing (Nói nhại):** Nghe podcast hoặc video ngắn (1-2 phút) trên BBC Learning English hoặc VOA, sau đó lặp lại theo ngữ điệu người bản xứ.
* **Ngữ pháp mở rộng:** Thì hiện tại hoàn thành, câu điều kiện loại 1 & 2, động từ khuyết thiếu (*can, could, should, must*).

---

#### 📌 Giai đoạn 3: Phản xạ và Ứng dụng thực tế (Tháng 5 - Tháng 6)
* **Tự tạo ngữ cảnh nói:** Dành 15 phút mỗi ngày tự nói trước gương hoặc trò chuyện bằng tiếng Anh với tôi (AI Assistant).
* **Đọc hiểu thực tế:** Đọc các mẩu tin tức ngắn, bài viết Medium, ghi chú lại các cụm từ (Collocations) hay gặp vào GoalCalendar.
* **Mục tiêu đạt được:** Tự tin trò chuyện hàng ngày, hiểu 70-80% nội dung phim có phụ đề tiếng Anh, đạt trình độ tương đương B1 CEFR.${contextNote}

---
💡 *Bạn có thể xem chi tiết cây lộ trình Mục tiêu & Nhiệm vụ ở thẻ xem trước bên dưới. Nhấn **"Áp dụng vào Lịch & Mục tiêu"** để tự động đồng bộ toàn bộ lộ trình này vào GoalCalendar của bạn!*`;
  }

  // 2. Grammar: Present Perfect vs Past Simple
  if (
    promptLower.includes('present perfect') ||
    promptLower.includes('past simple') ||
    promptLower.includes('hiện tại hoàn thành') ||
    promptLower.includes('quá khứ đơn')
  ) {
    return `### 📚 Phân biệt Thì Hiện Tại Hoàn Thành & Quá Khứ Đơn

Chào bạn! Đây là một trong những điểm ngữ pháp kinh điển nhất trong tiếng Anh. Hãy cùng nắm chắc sự khác biệt nhé:

| Tiêu chí | Thì Quá khứ đơn (Past Simple) | Thì Hiện tại hoàn thành (Present Perfect) |
| :--- | :--- | :--- |
| **Công thức** | \`S + V2/ed + ...\` | \`S + have/has + V3/ed + ...\` |
| **Bản chất thời gian** | Sự việc **đã kết thúc hoàn toàn** tại thời điểm xác định trong quá khứ. | Sự việc xảy ra trong quá khứ nhưng **kết quả hoặc ảnh hưởng còn liên quan tới hiện tại**. |
| **Dấu hiệu nhận biết** | *yesterday, last week, in 2020, 2 days ago, when I was young...* | *already, yet, just, ever, never, since, for, so far, recently...* |

---

#### 💡 Ví dụ so sánh trực quan:

1. **Quá khứ đơn (Past Simple):**
   * *I **lost** my key yesterday.*
   * ➔ Hôm qua tôi mất chìa khóa (nhưng hôm nay có thể tôi đã tìm thấy hoặc làm chìa mới rồi, hành động đã hoàn tất).

2. **Hiện tại hoàn thành (Present Perfect):**
   * *I **have lost** my key.*
   * ➔ Tôi đã làm mất chìa khóa (và hiện tại tôi vẫn chưa tìm thấy, đang phải đứng ngoài cửa!).

---

#### ✍️ Bài tập thực hành nhanh:
Hãy chọn động từ đúng cho câu sau:
> *"She (live) ________ in Hanoi for 3 years, but now she lives in Da Nang."*
*(Đáp án: **lived** - vì hiện tại cô ấy không còn sống ở Hà Nội nữa!)*`;
  }

  // 3. Sửa bài viết / Error correction
  if (
    promptLower.includes('sửa') ||
    promptLower.includes('bài viết') ||
    promptLower.includes('correct') ||
    promptLower.includes('essay')
  ) {
    return `### 📝 Nhận xét & Sửa bài viết tiếng Anh

Chào bạn! Tôi đã phân tích đoạn văn của bạn và đưa ra nhận xét chi tiết dưới đây:

---

#### 1. Các điểm cần lưu ý và sửa đổi:
* **Sự hòa hợp chủ ngữ - động từ:** Lưu ý chia động từ số ít với các danh từ không đếm được hoặc đại từ bất định (*everyone, each*).
* **Sử dụng giới từ:** Tránh dịch word-by-word từ tiếng Việt (ví dụ: *"depend on"* thay vì *"depend with"*, *"interested in"* thay vì *"interested about"*).
* **Độ phong phú từ vựng:** Thay thế một số từ quá thông dụng như *good, bad, very* bằng các tính từ biểu cảm hơn (*exceptional, detrimental, considerably*).

---

#### 2. Bản viết nâng cao gợi ý:
> *"In recent years, continuous self-improvement has become an indispensable factor for career advancement. By setting measurable milestones and reviewing knowledge systematically, learners can achieve substantial progress in language acquisition."*

---

#### 3. Cụm từ hay (Collocations) bạn nên lưu lại vào Flashcard:
* **Indispensable factor** (/ˌɪn.dɪˈspen.sə.bəl ˈfæk.tər/): Yếu tố không thể thiếu.
* **Measurable milestones** (/ˈmeʒ.ər.ə.bəl ˈmaɪl.stəʊnz/): Các cột mốc có thể đo lường được.
* **Substantial progress** (/səbˈstæn.ʃəl ˈprəʊ.ɡres/): Tiến bộ vượt bậc.`;
  }

  // 4. Vocabulary extraction / C1/C2 vocabulary
  if (
    promptLower.includes('trích xuất') ||
    promptLower.includes('từ vựng') ||
    promptLower.includes('c1') ||
    promptLower.includes('c2') ||
    promptLower.includes('vocabulary')
  ) {
    let leechAddon = '';
    if (appContext?.leechCards?.length > 0) {
      leechAddon = `\n> 💡 **Nhắc nhở ôn tập:** Bạn cũng có một số từ vựng cần lưu ý củng cố lại: **${appContext.leechCards.map((c) => c.word).join(', ')}**.`;
    }

    return `### 💎 Danh sách từ vựng cao cấp (Band C1 - C2) hữu ích

Dưới đây là các từ vựng tinh chọn cùng ngữ cảnh sử dụng chuẩn xác:

1. **Perseverance** *(noun)* - /ˌpɜː.sɪˈvɪə.rəns/
   * **Nghĩa:** Sự kiên trì, bền bỉ vượt qua khó khăn.
   * **Ví dụ:** *Language learning requires exceptional perseverance.*

2. **Acquisition** *(noun)* - /ˌæk.wɪˈzɪʃ.ən/
   * **Nghĩa:** Sự tiếp thu, lĩnh hội (kiến thức hoặc ngôn ngữ).
   * **Ví dụ:** *The application of spaced repetition significantly enhances vocabulary acquisition.*

3. **Fluency** *(noun)* - /ˈfluː.ən.si/
   * **Nghĩa:** Sự lưu loát, trôi chảy.
   * **Ví dụ:** *Consistent daily practice is the key to achieving professional fluency.*

4. **Nuance** *(noun)* - /ˈnjuː.ɑːns/
   * **Nghĩa:** Sắc thái tinh tế trong ý nghĩa hoặc cảm xúc.
   * **Ví dụ:** *Advanced learners should pay attention to semantic nuances in English idioms.*${leechAddon}

---
📌 *Bạn có thể thêm trực tiếp các từ này vào bộ thẻ Flashcard của mình trong GoalCalendar chỉ với 1 cú click!*`;
  }

  // 5. Default intelligent assistant response
  let contextMention = '';
  if (appContext?.activeGoals?.length > 0) {
    const g = appContext.activeGoals[0];
    const weekTaskMention = appContext?.weeklyProgress?.completedTasks
      ? ` và bạn đã hoàn thành **${appContext.weeklyProgress.completedTasks} nhiệm vụ/thói quen** trong tuần này!`
      : '!';
    contextMention = `Tôi thấy bạn đang theo đuổi mục tiêu **"${g.title}"** (tiến độ hiện tại: ${g.progress}%)${weekTaskMention} `;
  }

  const baseResponse = `Chào bạn! Tôi là GoalCalendar AI Assistant. ${contextMention}Tôi rất vui được hỗ trợ bạn trong việc học tiếng Anh hôm nay!

Tôi có thể đồng hành cùng bạn trong các nội dung:
* 🎯 **Lập kế hoạch & Lộ trình:** Cá nhân hóa lộ trình học tiếng Anh theo mục tiêu của bạn.
* 📖 **Giải đáp ngữ pháp:** Phân tích cặn kẽ các cấu trúc từ cơ bản đến nâng cao kèm bài tập.
* ✍️ **Sửa bài & Nâng cấp câu:** Chữa bài viết, viết thư hoặc bài luận IELTS/TOEIC.
* 🃏 **Tạo flashcards:** Trích xuất từ vựng mới và đồng bộ vào bộ thẻ GoalCalendar của bạn.

Bạn muốn cùng tôi khám phá hoặc giải đáp câu hỏi nào ngay bây giờ?`;

  const apiKeyNotice = `\n\n---\n> ℹ️ **Hướng dẫn cài đặt API Key:** Bạn có thể kết nối với mô hình Google Gemini trực tiếp bằng cách cấu hình biến \`GEMINI_API_KEY\` trong file \`server/.env\` và khởi động lại server.`;

  return baseResponse + apiKeyNotice;
};

/**
 * Simulates text streaming for mock assistant.
 */
async function* mockStreamResponse(
  userPrompt,
  appContext,
  summary,
  attachments = [],
  onProposeCards = null,
  onProposeStudyPlan = null,
  onUpdateLearnerProfile = null
) {
  const isCardExtraction = shouldProposeCards(userPrompt, attachments);
  const isStudyPlan = shouldProposeStudyPlan(userPrompt);
  const isProfileUpdate = shouldUpdateLearnerProfile(userPrompt);

  // Trigger proposed cards callback if applicable
  if (isCardExtraction && typeof onProposeCards === 'function') {
    onProposeCards(SAMPLE_PROPOSED_CARDS);
  }
  // Trigger proposed study plan callback if applicable
  if (isStudyPlan && typeof onProposeStudyPlan === 'function') {
    onProposeStudyPlan(SAMPLE_STUDY_PLAN);
  }
  // Trigger proposed learner profile update callback if applicable
  if (isProfileUpdate && typeof onUpdateLearnerProfile === 'function') {
    onUpdateLearnerProfile(SAMPLE_PROPOSED_PROFILE_UPDATE);
  }

  const text = generateMockResponseText(userPrompt, appContext, summary, attachments);
  const chunks = text.match(/[\s\S]{1,12}/g) || [text];
  const delayMs = process.env.NODE_ENV === 'test' ? 0 : 25;

  for (const chunk of chunks) {
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    yield chunk;
  }
}

/**
 * Reads attachment data into multimodal Gemini parts.
 */
async function processAttachmentsForGemini(attachments = []) {
  const parts = [];
  for (const att of attachments) {
    if (!att.storagePath) continue;

    try {
      if (!fs.existsSync(att.storagePath)) continue;

      if (att.mime?.startsWith('image/') || att.mime === 'application/pdf') {
        const base64Data = await fs.promises.readFile(att.storagePath, 'base64');
        parts.push({
          inlineData: {
            mimeType: att.mime,
            data: base64Data,
          },
        });
      } else if (att.mime === 'text/plain' || att.mime === 'text/markdown') {
        const textContent = await fs.promises.readFile(att.storagePath, 'utf8');
        parts.push({
          text: `\n\n[Tài liệu đính kèm: ${att.name}]\n${textContent}`,
        });
      } else {
        parts.push({
          text: `\n\n[Tài liệu đính kèm: ${att.name} (${att.mime})]`,
        });
      }
    } catch (err) {
      console.warn(`[GeminiService] Failed to read attachment file ${att.storagePath}:`, err.message);
    }
  }
  return parts;
}

/**
 * Main service method: streams chat completions with Gemini SDK or fallback mock.
 */
export async function* generateChatResponseStream({
  messages,
  appContext,
  summary,
  attachments = [],
  onProposeCards = null,
  onProposeStudyPlan = null,
  onUpdateLearnerProfile = null,
}) {
  const apiKey = env.GEMINI_API_KEY;
  const lastUserMsg = messages[messages.length - 1]?.content || '';
  const isCardExtraction = shouldProposeCards(lastUserMsg, attachments);
  const isStudyPlan = shouldProposeStudyPlan(lastUserMsg);
  const isProfileUpdate = shouldUpdateLearnerProfile(lastUserMsg);

  // If no API key or test/mock environment, run Graceful Fallback immediately
  if (!apiKey || apiKey === 'mock' || apiKey === 'test') {
    yield* mockStreamResponse(
      lastUserMsg,
      appContext,
      summary,
      attachments,
      onProposeCards,
      onProposeStudyPlan,
      onUpdateLearnerProfile
    );
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = buildSystemPrompt(appContext, summary);

    // Prepare contents formatted strictly for Gemini:
    const contents = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || ' ' }],
      }));

    // Ensure conversation starts with a user turn
    while (contents.length > 0 && contents[0].role === 'model') {
      contents.shift();
    }

    if (contents.length === 0 && lastUserMsg) {
      contents.push({
        role: 'user',
        parts: [{ text: lastUserMsg }],
      });
    }

    // Attach multimodal parts to the last user message
    if (contents.length > 0 && attachments.length > 0) {
      const lastItem = contents[contents.length - 1];
      if (lastItem.role === 'user') {
        const attachmentParts = await processAttachmentsForGemini(attachments);
        lastItem.parts.push(...attachmentParts);
      }
    }

    const responseStream = await ai.models.generateContentStream({
      model: env.GEMINI_MODEL || 'gemini-1.5-flash',
      contents,
      config: {
        systemInstruction,
      },
    });

    let accumulatedText = '';
    for await (const chunk of responseStream) {
      if (chunk.text) {
        accumulatedText += chunk.text;
        yield chunk.text;
      }
    }

    // Parse propose_cards JSON block if emitted by model
    const jsonMatch = accumulatedText.match(/```json:propose_cards\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof onProposeCards === 'function') {
          onProposeCards(parsed);
        }
      } catch {
        // ignore json parse error
      }
    } else if (isCardExtraction && typeof onProposeCards === 'function') {
      onProposeCards(SAMPLE_PROPOSED_CARDS);
    }

    // Parse propose_study_plan JSON block if emitted by model
    const planMatch = accumulatedText.match(/```json:propose_study_plan\s*([\s\S]*?)\s*```/);
    if (planMatch) {
      try {
        const parsedPlan = JSON.parse(planMatch[1]);
        if (parsedPlan && typeof onProposeStudyPlan === 'function') {
          onProposeStudyPlan(parsedPlan);
        }
      } catch {
        // ignore json parse error
      }
    } else if (isStudyPlan && typeof onProposeStudyPlan === 'function') {
      onProposeStudyPlan(SAMPLE_STUDY_PLAN);
    }

    // Parse update_learner_profile JSON block if emitted by model
    const profileMatch = accumulatedText.match(/```json:update_learner_profile\s*([\s\S]*?)\s*```/);
    if (profileMatch) {
      try {
        const parsedProfile = JSON.parse(profileMatch[1]);
        if (parsedProfile && typeof onUpdateLearnerProfile === 'function') {
          onUpdateLearnerProfile(parsedProfile);
        }
      } catch {
        // ignore json parse error
      }
    } else if (isProfileUpdate && typeof onUpdateLearnerProfile === 'function') {
      onUpdateLearnerProfile(SAMPLE_PROPOSED_PROFILE_UPDATE);
    }
  } catch (err) {
    console.warn('[GeminiService] Gemini API call error, falling back to smart Mock Assistant:', err.message);
    yield* mockStreamResponse(
      lastUserMsg,
      appContext,
      summary,
      attachments,
      onProposeCards,
      onProposeStudyPlan,
      onUpdateLearnerProfile
    );
  }
}

/**
 * Rolling summary generation: condenses older messages into conversation.summary.
 */
export const generateSummary = async ({ previousSummary, messagesToSummarize }) => {
  if (!messagesToSummarize || messagesToSummarize.length === 0) {
    return previousSummary || '';
  }

  const apiKey = env.GEMINI_API_KEY;

  if (apiKey && apiKey !== 'mock' && apiKey !== 'test') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Bạn là trợ lý tóm tắt hội thoại học tiếng Anh. Hãy tóm tắt ngắn gọn các tin nhắn sau đây, kết hợp với bản tóm tắt trước đó (nếu có).
Bản tóm tắt trước: "${previousSummary || 'Chưa có'}"
Các tin nhắn cần tóm tắt thêm:
${messagesToSummarize.map((m) => `${m.role === 'user' ? 'Người dùng' : 'AI'}: ${m.content}`).join('\n')}

Yêu cầu: Tóm tắt dưới 150 từ, ghi rõ các chủ đề, câu hỏi và kiến thức tiếng Anh chính đã được thảo luận.`;

      const response = await ai.models.generateContent({
        model: env.GEMINI_MODEL || 'gemini-1.5-flash',
        contents: prompt,
      });

      if (response && response.text) {
        return response.text.trim();
      }
    } catch (err) {
      console.warn('[GeminiService] Summary generation via API failed, using fallback summary:', err.message);
    }
  }

  // Graceful local summary generator
  const points = messagesToSummarize.map((m) => {
    const snippet = m.content.slice(0, 50).replace(/\s+/g, ' ').trim();
    return m.role === 'user' ? `Hỏi: "${snippet}..."` : `Giải đáp: "${snippet}..."`;
  });

  let combined = previousSummary ? `${previousSummary.trim()}\n` : '';
  combined += `• Thảo luận các mục: ${points.join('; ')}`;
  if (combined.length > 500) {
    combined = combined.slice(0, 497) + '...';
  }
  return combined;
};

export const geminiService = {
  SAMPLE_PROPOSED_CARDS,
  SAMPLE_STUDY_PLAN,
  SAMPLE_PROPOSED_PROFILE_UPDATE,
  shouldProposeCards,
  shouldProposeStudyPlan,
  shouldUpdateLearnerProfile,
  getUserAppContext,
  buildSystemPrompt,
  generateMockResponseText,
  generateChatResponseStream,
  generateSummary,
};

export default geminiService;
