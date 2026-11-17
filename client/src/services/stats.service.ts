import { api } from './api';
import type { ApiResponse } from '../types/auth';
import type {
  StatsPeriod,
  StatsSummary,
  StatsHeatmap,
  StatsTrend,
  StatsByCategory,
} from '../types/stats';

export const statsService = {
  getSummary: async (
    period: StatsPeriod = 'month',
    refDate?: string,
    startDate?: string,
    endDate?: string
  ): Promise<StatsSummary> => {
    const params: Record<string, string> = { period };
    if (refDate) params.refDate = refDate;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const { data } = await api.get<ApiResponse<StatsSummary>>('/stats/summary', { params });
    return data.data;
  },

  getHeatmap: async (year?: number | string): Promise<StatsHeatmap> => {
    const params: Record<string, string> = {};
    if (year) params.year = String(year);
    const { data } = await api.get<ApiResponse<StatsHeatmap>>('/stats/heatmap', { params });
    return data.data;
  },

  getTrend: async (goalId: string): Promise<StatsTrend> => {
    const { data } = await api.get<ApiResponse<StatsTrend>>('/stats/trend', {
      params: { goalId },
    });
    return data.data;
  },

  getByCategory: async (): Promise<StatsByCategory> => {
    const { data } = await api.get<ApiResponse<StatsByCategory>>('/stats/by-category');
    return data.data;
  },
};
