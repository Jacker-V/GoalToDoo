export type StatsPeriod = 'week' | 'month' | 'year' | 'custom';

export interface StatsSummary {
  period: StatsPeriod;
  startDate: string;
  endDate: string;
  completionRate: number;
  previousCompletionRate: number;
  delta: number;
  completedTasks: number;
  onTimeRate: number;
  currentStreak: number;
  longestStreak: number;
  atRiskCount: number;
  totalGoals: number;
  completedGoals: number;
}

export interface StatsHeatmapDay {
  date: string;
  count: number;
}

export interface StatsHeatmap {
  year: number;
  totalCount: number;
  dailyCounts: Record<string, number>;
  days: StatsHeatmapDay[];
}

export interface StatsTrendLog {
  _id: string;
  date: string;
  value: number;
  delta: number;
  snapshotPercent: number;
  note: string;
  idealPercent: number;
}

export interface StatsTrendPoint {
  date: string;
  actualPercent?: number | null;
  idealPercent?: number | null;
  value?: number;
  label?: string;
  note?: string;
}

export interface StatsTrend {
  goal: {
    _id: string;
    title: string;
    startDate: string;
    endDate: string;
    targetValue: number;
    currentValue: number;
    unit?: string;
    progressMode: string;
    progressCache: number;
    idealProgress: number;
    status: string;
    atRisk?: boolean;
    isOverdue?: boolean;
  };
  logs: StatsTrendLog[];
  idealLine: Array<{ date: string; idealPercent: number }>;
  dataPoints: StatsTrendPoint[];
}

export interface CategoryStatItem {
  categoryId: string | null;
  categoryName: string;
  color: string;
  icon: string;
  totalGoals: number;
  completedGoals: number;
  totalTasks: number;
  completedTasks: number;
  taskShare: number;
  goalShare: number;
}

export interface StatsByCategory {
  categories: CategoryStatItem[];
  totalGoals: number;
  completedGoals: number;
  totalTasks: number;
  completedTasks: number;
}
