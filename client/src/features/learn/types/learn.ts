export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'idiom'
  | 'phrase'
  | 'other';

export type CardStatus = 'new' | 'learning' | 'review' | 'suspended';

export interface SrsData {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueDate: string;
  lastReviewedAt: string | null;
  status: CardStatus;
}

export interface Deck {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  color: string;
  totalCards?: number;
  dueCards?: number;
  masteredCards?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  _id: string;
  userId: string;
  deckId: string | { _id: string; name: string; color: string } | null;
  word: string;
  meaning: string;
  partOfSpeech: PartOfSpeech;
  example: string;
  note: string;
  source: string;
  tags: string[];
  imageUrl: string;
  srs: SrsData;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeckInput {
  name: string;
  color?: string;
  description?: string;
}

export interface UpdateDeckInput {
  name?: string;
  color?: string;
  description?: string;
}

export interface MergeDeckInput {
  sourceDeckId: string;
  targetDeckId: string;
}

export interface CreateCardInput {
  deckId: string;
  word: string;
  meaning: string;
  partOfSpeech?: PartOfSpeech;
  example?: string;
  note?: string;
  source?: string;
  tags?: string[];
  imageUrl?: string;
  allowDuplicate?: boolean;
}

export interface UpdateCardInput {
  deckId?: string;
  word?: string;
  meaning?: string;
  partOfSpeech?: PartOfSpeech;
  example?: string;
  note?: string;
  source?: string;
  tags?: string[];
  imageUrl?: string;
  srs?: Partial<SrsData>;
}

export interface CardQueryParams {
  deckId?: string;
  status?: CardStatus | '';
  tag?: string;
  source?: string;
  search?: string;
  dueOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BulkImportCardItem {
  word: string;
  meaning: string;
  partOfSpeech?: PartOfSpeech;
  example?: string;
  note?: string;
  source?: string;
  tags?: string[];
  isDuplicate?: boolean;
  duplicateReason?: string | null;
  existingCardId?: string | null;
}

export interface BulkImportInput {
  deckId: string;
  rawText?: string;
  cards?: BulkImportCardItem[];
  preview?: boolean;
  skipDuplicates?: boolean;
  updateDuplicates?: boolean;
  source?: string;
  tags?: string[];
}

export interface BulkImportPreviewResponse {
  preview: boolean;
  total: number;
  duplicatesCount: number;
  cards: BulkImportCardItem[];
}

export interface BulkImportCommitResponse {
  message: string;
  totalProcessed: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  cards: Card[];
}

// --- SRS & Review Types ---
export type RatingValue = 1 | 2 | 3 | 4;

export interface NextReviewIntervalPreview {
  intervalDays: number;
  dueDate: string;
  repetitions: number;
  easeFactor: number;
  status: CardStatus;
}

export interface ReviewCardItem extends Card {
  nextReviews?: Record<RatingValue, NextReviewIntervalPreview>;
}

export interface DailyReviewStats {
  newReviewedToday: number;
  reviewReviewedToday: number;
  maxNewCardsPerDay: number;
  maxReviewCardsPerDay: number;
  remainingNewQuota: number;
  remainingReviewQuota: number;
}

export interface ReviewQueueResponse {
  queue: ReviewCardItem[];
  dueCount: number;
  newCount: number;
  totalInQueue: number;
  dailyStats: DailyReviewStats;
}

export interface AnswerCardInput {
  cardId: string;
  rating: RatingValue;
  durationMs?: number;
}

export interface AnswerCardResponse {
  card: ReviewCardItem;
  nextReview: {
    intervalDays: number;
    dueDate: string;
    status: CardStatus;
    easeFactor: number;
    repetitions: number;
    lapses: number;
  };
  logId: string;
}

export interface LearnSettings {
  maxNewCardsPerDay: number;
  maxReviewCardsPerDay: number;
  defaultDirection: 'en_to_vi' | 'vi_to_en';
  enableTypingMode: boolean;
}

export interface ForecastDayItem {
  date: string;
  dayOfWeek: number;
  labelVi: string;
  labelEn: string;
  dueCount: number;
}

export interface LearnStatsResponse {
  totalCards: number;
  byStatus: {
    new: number;
    learning: number;
    review: number;
    suspended: number;
  };
  retentionRate: number;
  totalReviews: number;
  successfulReviews: number;
  ratingsBreakdown: Record<RatingValue, number>;
  leechCards: Card[];
  forecast: ForecastDayItem[];
  bySource: {
    source: string;
    count: number;
  }[];
}

export interface Conversation {
  _id: string;
  userId: string;
  title: string;
  pinned: boolean;
  summary: string;
  summaryUpToMessageId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatAttachment {
  fileId: string;
  name: string;
  mime: string;
  size: number;
  url?: string;
}

export interface ProposedCard {
  word: string;
  meaning: string;
  partOfSpeech?: PartOfSpeech;
  example?: string;
  note?: string;
  source?: string;
}

export interface ChatMessage {
  _id: string;
  conversationId: string;
  userId: string;
  role: MessageRole;
  content: string;
  attachments?: ChatAttachment[];
  toolCalls?: {
    name: string;
    args: {
      cards?: ProposedCard[];
      plan?: StudyPlanData;
      profile?: Partial<LearnerProfile>;
      [key: string]: any;
    };
  }[];
  tokenUsage?: {
    input?: number;
    output?: number;
  };
  feedback?: 'thumbs_up' | 'thumbs_down' | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiUsageData {
  limit: number;
  used: number;
  remaining: number;
  date: string;
  inputTokens?: number;
  outputTokens?: number;
}

// ====================================================================
// GIAI ĐOẠN 13: LEARNER PROFILE & STUDY PLAN STRATEGY
// ====================================================================

export interface LearnerProfile {
  _id?: string;
  userId?: string;
  level: string;
  targetGoal: string;
  targetDate: string | null;
  dailyMinutes: number;
  weaknesses: string[];
  interests: string[];
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudyPlanSubtask {
  title: string;
  done?: boolean;
}

export interface StudyPlanTask {
  title: string;
  notes?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: 'low' | 'medium' | 'high';
  weekGoalIndex?: number;
  subtasks?: (StudyPlanSubtask | string)[];
}

export interface StudyPlanWeekGoal {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  priority?: 'low' | 'medium' | 'high';
  monthGoalIndex?: number;
  weight?: number;
}

export interface StudyPlanMonthGoal {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  priority?: 'low' | 'medium' | 'high';
  color?: string;
  weight?: number;
}

export interface StudyPlanYearGoal {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  priority?: 'low' | 'medium' | 'high';
  color?: string;
}

export interface StudyPlanData {
  yearGoal?: StudyPlanYearGoal;
  monthGoals?: StudyPlanMonthGoal[];
  weekGoals?: StudyPlanWeekGoal[];
  tasks?: StudyPlanTask[];
}

export interface ApplyPlanResponse {
  createdGoalsCount: number;
  createdTasksCount: number;
  rootGoalId: string | null;
}


