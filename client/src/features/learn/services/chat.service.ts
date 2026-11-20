import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/useAuthStore';
import type { ApiResponse } from '../../../types/auth';
import type {
  Conversation,
  ChatMessage,
  AiUsageData,
  ChatAttachment,
  ProposedCard,
  LearnerProfile,
  StudyPlanData,
  ApplyPlanResponse,
} from '../types/learn';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const chatService = {
  getConversations: async (search?: string): Promise<Conversation[]> => {
    const { data } = await api.get<ApiResponse<Conversation[]>>('/chat/conversations', {
      params: search ? { search } : undefined,
    });
    return data.data;
  },

  createConversation: async (title?: string): Promise<Conversation> => {
    const { data } = await api.post<ApiResponse<Conversation>>('/chat/conversations', {
      title,
    });
    return data.data;
  },

  updateConversation: async (
    id: string,
    payload: { title?: string; pinned?: boolean }
  ): Promise<Conversation> => {
    const { data } = await api.patch<ApiResponse<Conversation>>(`/chat/conversations/${id}`, payload);
    return data.data;
  },

  deleteConversation: async (id: string): Promise<{ deletedConversationId: string }> => {
    const { data } = await api.delete<ApiResponse<{ deletedConversationId: string }>>(
      `/chat/conversations/${id}`
    );
    return data.data;
  },

  getMessages: async (conversationId: string): Promise<ChatMessage[]> => {
    const { data } = await api.get<ApiResponse<ChatMessage[]>>(
      `/chat/conversations/${conversationId}/messages`
    );
    return data.data;
  },

  updateMessageFeedback: async (
    messageId: string,
    feedback: 'thumbs_up' | 'thumbs_down' | null
  ): Promise<ChatMessage> => {
    const { data } = await api.post<ApiResponse<ChatMessage>>(
      `/chat/messages/${messageId}/feedback`,
      { feedback }
    );
    return data.data;
  },

  getUsage: async (): Promise<AiUsageData> => {
    const { data } = await api.get<ApiResponse<AiUsageData>>('/chat/usage');
    return data.data;
  },

  // ====================================================================
  // GIAI ĐOẠN 12: ATTACHMENTS & CARD ACTIONS
  // ====================================================================

  /**
   * Upload one or more files to the chat attachments system.
   */
  uploadFiles: async (files: File[]): Promise<ChatAttachment[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const { data } = await api.post<ApiResponse<ChatAttachment[]>>('/chat/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  /**
   * Delete an uploaded file attachment by ID.
   */
  deleteFile: async (fileId: string): Promise<{ deletedFileId: string }> => {
    const { data } = await api.delete<ApiResponse<{ deletedFileId: string }>>(`/chat/files/${fileId}`);
    return data.data;
  },

  /**
   * Constructs fully authenticated URL for viewing or downloading file attachments.
   */
  getFileUrl: (fileId: string): string => {
    const accessToken = useAuthStore.getState().accessToken;
    const baseUrl = `${API_BASE_URL}/chat/files/${fileId}`;
    return accessToken ? `${baseUrl}?token=${encodeURIComponent(accessToken)}` : baseUrl;
  },

  /**
   * Add proposed cards directly into the destination deck.
   */
  addCardsAction: async (
    deckId: string,
    cards: ProposedCard[]
  ): Promise<{ addedCount: number; cards: any[] }> => {
    const { data } = await api.post<ApiResponse<{ addedCount: number; cards: any[] }>>(
      '/chat/actions/add-cards',
      { deckId, cards }
    );
    return data.data;
  },

  // ====================================================================
  // GIAI ĐOẠN 13: LEARNER PROFILE & STUDY PLAN ACTIONS
  // ====================================================================

  /**
   * Get learner profile (auto-creates default profile if user has none).
   */
  getLearnerProfile: async (): Promise<LearnerProfile> => {
    const { data } = await api.get<ApiResponse<LearnerProfile>>('/chat/profile');
    return data.data;
  },

  /**
   * Update learner profile fields.
   */
  updateLearnerProfile: async (payload: Partial<LearnerProfile>): Promise<LearnerProfile> => {
    const { data } = await api.patch<ApiResponse<LearnerProfile>>('/chat/profile', payload);
    return data.data;
  },

  /**
   * Reset learner profile to defaults ("Forget all").
   */
  resetLearnerProfile: async (): Promise<LearnerProfile> => {
    const { data } = await api.delete<ApiResponse<LearnerProfile>>('/chat/profile');
    return data.data;
  },

  /**
   * Apply a proposed hierarchical study plan to Goals & Tasks.
   */
  applyStudyPlan: async (plan: StudyPlanData): Promise<ApplyPlanResponse> => {
    const { data } = await api.post<ApiResponse<ApplyPlanResponse>>(
      '/chat/actions/apply-plan',
      plan
    );
    return data.data;
  },

  /**
   * Stream chat message response with support for attachments and propose_cards SSE events.
   */
  sendMessageStream: async (
    conversationId: string,
    payload: { content: string; attachments?: ChatAttachment[] } | string,
    callbacks: {
      onChunk: (text: string) => void;
      onProposeCards?: (cards: ProposedCard[]) => void;
      onProposeStudyPlan?: (plan: StudyPlanData) => void;
      onUpdateLearnerProfile?: (profile: Partial<LearnerProfile>) => void;
      onDone: (data: { messageId: string; content: string; toolCalls?: any[]; usage: any }) => void;
      onError: (err: any) => void;
    },
    signal?: AbortSignal
  ): Promise<void> => {
    let accessToken = useAuthStore.getState().accessToken;
    const url = `${API_BASE_URL}/chat/conversations/${conversationId}/messages`;

    const requestBody = typeof payload === 'string'
      ? { content: payload, attachments: [] }
      : { content: payload.content, attachments: payload.attachments || [] };

    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(requestBody),
      signal,
    });

    // Handle token refresh if 401 Unauthorized occurs
    if (response.status === 401) {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const newAccess = refreshData?.data?.accessToken;
            const newRefresh = refreshData?.data?.refreshToken;
            if (newAccess) {
              useAuthStore.getState().setTokens(newAccess, newRefresh || refreshToken);
              accessToken = newAccess;
              response = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${newAccess}`,
                },
                body: JSON.stringify(requestBody),
                signal,
              });
            }
          }
        } catch {
          // Fall through to standard error handling
        }
      }
    }

    if (!response.ok) {
      let errorMsg = `Request failed: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.error?.message) {
          errorMsg = errorData.error.message;
        }
      } catch {
        // ignore json parse error
      }
      throw new Error(errorMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response stream not readable');
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    const processSseBlock = (rawBlock: string) => {
      const trimmed = rawBlock.trim();
      if (!trimmed) return;

      let event = 'message';
      let dataStr = '';

      const lines = trimmed.split('\n');
      for (const line of lines) {
        if (line.startsWith('event:')) {
          event = line.replace('event:', '').trim();
        } else if (line.startsWith('data:')) {
          dataStr = line.replace('data:', '').trim();
        }
      }

      if (!dataStr) return;

      try {
        const parsed = JSON.parse(dataStr);
        if (event === 'chunk') {
          callbacks.onChunk(parsed.text);
        } else if (event === 'propose_cards') {
          callbacks.onProposeCards?.(parsed.cards);
        } else if (event === 'propose_study_plan') {
          callbacks.onProposeStudyPlan?.(parsed.plan);
        } else if (event === 'update_learner_profile') {
          callbacks.onUpdateLearnerProfile?.(parsed.profile);
        } else if (event === 'done') {
          callbacks.onDone(parsed);
        } else if (event === 'error') {
          callbacks.onError(new Error(parsed.message || 'Stream error'));
        }
      } catch {
        // ignore JSON parse errors in transit
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          processSseBlock(part);
        }
      }

      // Process any residual chunk in buffer
      if (buffer.trim()) {
        processSseBlock(buffer);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Client intentionally aborted stream
        return;
      }
      throw err;
    }
  },
};
