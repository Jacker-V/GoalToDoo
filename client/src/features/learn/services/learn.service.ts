import { api } from '../../../services/api';
import type { ApiResponse } from '../../../types/auth';
import type {
  Deck,
  Card,
  CreateDeckInput,
  UpdateDeckInput,
  MergeDeckInput,
  CreateCardInput,
  UpdateCardInput,
  CardQueryParams,
  BulkImportInput,
  BulkImportPreviewResponse,
  BulkImportCommitResponse,
  LearnSettings,
  ReviewQueueResponse,
  AnswerCardInput,
  AnswerCardResponse,
  LearnStatsResponse,
} from '../types/learn';

export interface PaginatedCardsResponse {
  data: Card[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const learnService = {
  // --- Decks ---
  getDecks: async (): Promise<Deck[]> => {
    const { data } = await api.get<ApiResponse<Deck[]>>('/learn/decks');
    return data.data;
  },

  createDeck: async (payload: CreateDeckInput): Promise<Deck> => {
    const { data } = await api.post<ApiResponse<Deck>>('/learn/decks', payload);
    return data.data;
  },

  updateDeck: async (id: string, payload: UpdateDeckInput): Promise<Deck> => {
    const { data } = await api.patch<ApiResponse<Deck>>(`/learn/decks/${id}`, payload);
    return data.data;
  },

  deleteDeck: async (id: string, cascade = true): Promise<{ message: string; deletedCardsCount: number; releasedCardsCount?: number }> => {
    const { data } = await api.delete<ApiResponse<{ message: string; deletedCardsCount: number; releasedCardsCount?: number }>>(
      `/learn/decks/${id}`,
      { params: { cascade } }
    );
    return data.data;
  },

  mergeDecks: async (payload: MergeDeckInput): Promise<{ message: string; movedCardsCount: number; targetDeckId: string }> => {
    const { data } = await api.post<ApiResponse<{ message: string; movedCardsCount: number; targetDeckId: string }>>(
      '/learn/decks/merge',
      payload
    );
    return data.data;
  },

  // --- Cards ---
  getCards: async (params?: CardQueryParams): Promise<PaginatedCardsResponse> => {
    const { data } = await api.get<ApiResponse<Card[]> & { meta: PaginatedCardsResponse['meta'] }>(
      '/learn/cards',
      { params }
    );
    return {
      data: data.data,
      meta: (data as any).meta || { page: 1, limit: 20, total: data.data.length, totalPages: 1 },
    };
  },

  getCardById: async (id: string): Promise<Card> => {
    const { data } = await api.get<ApiResponse<Card>>(`/learn/cards/${id}`);
    return data.data;
  },

  createCard: async (payload: CreateCardInput): Promise<Card> => {
    const { data } = await api.post<ApiResponse<Card>>('/learn/cards', payload);
    return data.data;
  },

  updateCard: async (id: string, payload: UpdateCardInput): Promise<Card> => {
    const { data } = await api.patch<ApiResponse<Card>>(`/learn/cards/${id}`, payload);
    return data.data;
  },

  deleteCard: async (id: string): Promise<void> => {
    await api.delete<ApiResponse<{ message: string }>>(`/learn/cards/${id}`);
  },

  suspendCard: async (id: string): Promise<Card> => {
    const { data } = await api.patch<ApiResponse<Card>>(`/learn/cards/${id}/suspend`);
    return data.data;
  },

  // --- Bulk Import ---
  previewBulkImport: async (payload: BulkImportInput): Promise<BulkImportPreviewResponse> => {
    const { data } = await api.post<ApiResponse<BulkImportPreviewResponse>>('/learn/cards/bulk', {
      ...payload,
      preview: true,
    });
    return data.data;
  },

  commitBulkImport: async (payload: BulkImportInput): Promise<BulkImportCommitResponse> => {
    const { data } = await api.post<ApiResponse<BulkImportCommitResponse>>('/learn/cards/bulk', {
      ...payload,
      preview: false,
    });
    return data.data;
  },

  // --- Settings ---
  getSettings: async (): Promise<LearnSettings> => {
    const { data } = await api.get<ApiResponse<LearnSettings>>('/learn/settings');
    return data.data;
  },

  updateSettings: async (payload: Partial<LearnSettings>): Promise<LearnSettings> => {
    const { data } = await api.patch<ApiResponse<LearnSettings>>('/learn/settings', payload);
    return data.data;
  },

  // --- Review Session ---
  getReviewQueue: async (params?: { deckId?: string; limit?: number }): Promise<ReviewQueueResponse> => {
    const { data } = await api.get<ApiResponse<ReviewQueueResponse>>('/learn/review/queue', { params });
    return data.data;
  },

  answerCard: async (payload: AnswerCardInput): Promise<AnswerCardResponse> => {
    const { data } = await api.post<ApiResponse<AnswerCardResponse>>('/learn/review/answer', payload);
    return data.data;
  },

  // --- Stats ---
  getStats: async (): Promise<LearnStatsResponse> => {
    const { data } = await api.get<ApiResponse<LearnStatsResponse>>('/learn/stats');
    return data.data;
  },
};
