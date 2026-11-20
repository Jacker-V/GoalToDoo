import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Plus,
  Search,
  Pin,
  PinOff,
  Edit2,
  Trash2,
  Send,
  Square,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  RotateCcw,
  Bot,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  AlertCircle,
  MessageSquare,
  Flame,
  Zap,
  Paperclip,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Loader2,
  Download,
  GraduationCap,
} from 'lucide-react';
import { chatService } from '../services/chat.service';
import { ProposedCardsWidget } from '../components/ProposedCardsWidget';
import { ProposedProfileUpdateWidget } from '../components/ProposedProfileUpdateWidget';
import { StudyPlanPreviewCard } from '../components/StudyPlanPreviewCard';
import { LearnerProfileModal } from '../components/LearnerProfileModal';
import { Button } from '../../../components/ui/Button';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { useI18n } from '../../../i18n';
import { toast } from '../../../store/useToastStore';
import type {
  Conversation,
  ChatMessage,
  ChatAttachment,
  ProposedCard,
  LearnerProfile,
  StudyPlanData,
} from '../types/learn';

export const LearnChatPage: React.FC = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  // State
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [inputText, setInputText] = useState('');
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Attachments State
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [activeImagePreviewUrl, setActiveImagePreviewUrl] = useState<string | null>(null);

  // Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingProposedCards, setStreamingProposedCards] = useState<ProposedCard[]>([]);
  const [streamingProposedStudyPlan, setStreamingProposedStudyPlan] = useState<StudyPlanData | null>(null);
  const [streamingProposedProfileUpdate, setStreamingProposedProfileUpdate] = useState<Partial<LearnerProfile> | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Inline edit state
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Delete modal state
  const [deletingConv, setDeletingConv] = useState<Conversation | null>(null);

  // Copied message state
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // DOM Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ['chat', 'conversations', searchKeyword],
    queryFn: () => chatService.getConversations(searchKeyword),
  });

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['chat', 'messages', selectedConvId],
    queryFn: () => chatService.getMessages(selectedConvId!),
    enabled: Boolean(selectedConvId),
  });

  const { data: usage } = useQuery({
    queryKey: ['chat', 'usage'],
    queryFn: () => chatService.getUsage(),
  });

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!selectedConvId && conversations.length > 0) {
      setSelectedConvId(conversations[0]._id);
    }
  }, [conversations, selectedConvId]);

  // Scroll to bottom on new messages or streaming chunks
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, streamingProposedCards]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  // Active conversation object
  const activeConversation = conversations.find((c) => c._id === selectedConvId);

  // Categorize conversations
  const pinnedConversations = conversations.filter((c) => c.pinned);
  const recentConversations = conversations.filter((c) => !c.pinned);

  // Mutations
  const createConvMutation = useMutation({
    mutationFn: (title?: string) => chatService.createConversation(title),
    onSuccess: (newConv) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      setSelectedConvId(newConv._id);
      setIsSidebarOpenMobile(false);
      if (textareaRef.current) textareaRef.current.focus();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('common.error'));
    },
  });

  const updateConvMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { title?: string; pinned?: boolean } }) =>
      chatService.updateConversation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      setEditingConvId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('common.error'));
    },
  });

  const deleteConvMutation = useMutation({
    mutationFn: (id: string) => chatService.deleteConversation(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      if (selectedConvId === data.deletedConversationId) {
        const remaining = conversations.filter((c) => c._id !== data.deletedConversationId);
        setSelectedConvId(remaining.length > 0 ? remaining[0]._id : null);
      }
      setDeletingConv(null);
      toast.success(t('common.success'));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('common.error'));
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ messageId, feedback }: { messageId: string; feedback: 'thumbs_up' | 'thumbs_down' | null }) =>
      chatService.updateMessageFeedback(messageId, feedback),
    onSuccess: (updatedMsg) => {
      queryClient.setQueryData(['chat', 'messages', selectedConvId], (old: ChatMessage[] = []) =>
        old.map((m) => (m._id === updatedMsg._id ? updatedMsg : m))
      );
    },
  });

  // Handle files selected via file dialog, drag & drop, or clipboard paste
  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const incomingFiles = Array.from(fileList);
    if (incomingFiles.length === 0) return;

    if (pendingAttachments.length + incomingFiles.length > 5) {
      toast.error(t('chat.maxFilesLimit'));
      return;
    }

    // Size limit check: 10MB
    for (const f of incomingFiles) {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(t('chat.fileTooLarge'));
        return;
      }
    }

    setIsUploadingAttachments(true);
    try {
      const uploaded = await chatService.uploadFiles(incomingFiles);
      setPendingAttachments((prev) => [...prev, ...uploaded]);
    } catch (err: any) {
      toast.error(
        err.response?.data?.error?.message ||
          err.message ||
          t('chat.fileUploadError')
      );
    } finally {
      setIsUploadingAttachments(false);
    }
  };

  const handleRemovePendingAttachment = async (fileId: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.fileId !== fileId));
    try {
      await chatService.deleteFile(fileId);
    } catch {
      // ignore
    }
  };

  // Clipboard paste listener for images
  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      handleFilesSelected(e.clipboardData.files);
    }
  };

  // Action: Send message and initiate SSE stream
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputText).trim();
    const attachmentsToSend = [...pendingAttachments];

    if ((!textToSend && attachmentsToSend.length === 0) || isStreaming || isUploadingAttachments) return;

    let targetConvId = selectedConvId;

    // Create conversation on the fly if none exists
    if (!targetConvId) {
      try {
        const created = await chatService.createConversation();
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
        targetConvId = created._id;
        setSelectedConvId(created._id);
      } catch (err: any) {
        toast.error(err.message || t('common.error'));
        return;
      }
    }

    setInputText('');
    setPendingAttachments([]);
    setIsStreaming(true);
    setStreamingText('');
    setStreamingProposedCards([]);
    setStreamingProposedStudyPlan(null);
    setStreamingProposedProfileUpdate(null);

    // Optimistically show user message
    const tempUserMsg: ChatMessage = {
      _id: `temp_${Date.now()}`,
      conversationId: targetConvId,
      userId: '',
      role: 'user',
      content: textToSend || t('chat.attachedFilesSummary', { count: attachmentsToSend.length, names: attachmentsToSend.map((a) => a.name).join(', ') }),
      attachments: attachmentsToSend,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    queryClient.setQueryData(['chat', 'messages', targetConvId], (old: ChatMessage[] = []) => [
      ...old,
      tempUserMsg,
    ]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await chatService.sendMessageStream(
        targetConvId,
        {
          content: textToSend,
          attachments: attachmentsToSend,
        },
        {
          onChunk: (chunk: string) => {
            setStreamingText((prev) => prev + chunk);
          },
          onProposeCards: (cards: ProposedCard[]) => {
            setStreamingProposedCards(cards);
          },
          onProposeStudyPlan: (plan: StudyPlanData) => {
            setStreamingProposedStudyPlan(plan);
          },
          onUpdateLearnerProfile: (profile: Partial<LearnerProfile>) => {
            setStreamingProposedProfileUpdate(profile);
          },
          onDone: () => {
            setIsStreaming(false);
            setStreamingText('');
            setStreamingProposedCards([]);
            setStreamingProposedStudyPlan(null);
            setStreamingProposedProfileUpdate(null);
            queryClient.invalidateQueries({ queryKey: ['chat', 'messages', targetConvId] });
            queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
            queryClient.invalidateQueries({ queryKey: ['chat', 'usage'] });
          },
          onError: (err: any) => {
            setIsStreaming(false);
            setStreamingText('');
            setStreamingProposedCards([]);
            setStreamingProposedStudyPlan(null);
            setStreamingProposedProfileUpdate(null);
            if (!customPrompt) {
              setInputText(textToSend);
              setPendingAttachments(attachmentsToSend);
            }
            toast.error(err.message || t('chat.errorStreaming'));
            queryClient.invalidateQueries({ queryKey: ['chat', 'messages', targetConvId] });
          },
        },
        controller.signal
      );
    } catch (err: any) {
      setIsStreaming(false);
      setStreamingText('');
      setStreamingProposedCards([]);
      setStreamingProposedStudyPlan(null);
      setStreamingProposedProfileUpdate(null);
      if (!customPrompt) {
        setInputText(textToSend);
        setPendingAttachments(attachmentsToSend);
      }
      toast.error(err.message || t('chat.errorStreaming'));
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', targetConvId] });
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setStreamingText('');
      setStreamingProposedCards([]);
      setStreamingProposedStudyPlan(null);
      setStreamingProposedProfileUpdate(null);
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', selectedConvId] });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    toast.success(t('chat.copiedToast'));
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleRegenerate = () => {
    if (messages.length === 0 || isStreaming) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      handleSendMessage(lastUser.content);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Quick Starter Prompts
  const quickPrompts = [
    { key: 'promptRoadmap', text: t('chat.promptRoadmap'), icon: Flame },
    { key: 'promptGrammar', text: t('chat.promptGrammar'), icon: Zap },
    { key: 'promptWriting', text: t('chat.promptWriting'), icon: Edit2 },
    { key: 'promptVocab', text: t('chat.promptVocab'), icon: Sparkles },
  ];

  return (
    <div
      onPaste={handlePaste}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDraggingOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFilesSelected(e.dataTransfer.files);
        }
      }}
      className="flex flex-1 h-full w-full max-w-7xl mx-auto gap-3 relative select-none min-h-0"
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.md,.docx,image/jpeg,image/png,image/webp,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFilesSelected(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-indigo-600/20 backdrop-blur-xs border-2 border-dashed border-indigo-500 rounded-3xl flex flex-col items-center justify-center pointer-events-none">
          <UploadCloud className="w-16 h-16 text-indigo-600 dark:text-indigo-400 animate-bounce mb-3" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {t('chat.dragDropHint')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('chat.dragDropFormats')}
          </p>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. LEFT SIDEBAR: CONVERSATION LIST                       */}
      {/* ======================================================== */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col ${
          isSidebarOpenMobile ? 'translate-x-0 w-80 max-w-[85vw] p-3' : '-translate-x-full md:translate-x-0'
        } ${isSidebarCollapsed ? 'md:w-16 md:p-2' : 'md:w-72 md:p-3'}`}
      >
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 md:hidden">
          <span className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            {t('chat.title')}
          </span>
          <button
            onClick={() => setIsSidebarOpenMobile(false)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Header / New Chat */}
        <div className="space-y-2 mt-2 md:mt-0">
          {!isSidebarCollapsed ? (
            <Button
              className="w-full justify-center bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold shadow-md shadow-indigo-500/20 rounded-xl"
              onClick={() => createConvMutation.mutate(undefined)}
              disabled={createConvMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>{t('chat.newChatBtn')}</span>
            </Button>
          ) : (
            <button
              onClick={() => createConvMutation.mutate(undefined)}
              className="w-full p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-500/20"
              title={t('chat.newChatBtn')}
            >
              <Plus className="w-5 h-5" />
            </button>
          )}

          {/* Search box (when not collapsed) */}
          {!isSidebarCollapsed && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder={t('chat.searchPlaceholder')}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto mt-3 space-y-4 pr-1">
          {isLoadingConversations ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>{searchKeyword ? t('chat.noSearchResults') : t('chat.noConversations')}</p>
            </div>
          ) : (
            <>
              {/* Pinned Section */}
              {pinnedConversations.length > 0 && (
                <div className="space-y-1">
                  {!isSidebarCollapsed && (
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1">
                      <Pin className="w-3 h-3 text-indigo-500" />
                      <span>{t('chat.pinnedSection')}</span>
                    </div>
                  )}
                  {pinnedConversations.map(renderConversationItem)}
                </div>
              )}

              {/* Recent Section */}
              {recentConversations.length > 0 && (
                <div className="space-y-1">
                  {!isSidebarCollapsed && pinnedConversations.length > 0 && (
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mt-2">
                      {t('chat.recentSection')}
                    </div>
                  )}
                  {recentConversations.map(renderConversationItem)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar Footer: AI Quota & Collapse Button */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          {!isSidebarCollapsed && usage && (
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('chat.todayQuota')}</span>
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {t('chat.quotaBadge', { used: usage.used, limit: usage.limit })}
              </span>
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex w-full items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors"
            title={isSidebarCollapsed ? t('chat.openSidebarTooltip') : t('chat.closeSidebarTooltip')}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {isSidebarOpenMobile && (
        <div
          onClick={() => setIsSidebarOpenMobile(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* ======================================================== */}
      {/* 2. MAIN CHAT AREA                                        */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Chat Top Bar */}
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs z-10">
          <div className="flex items-center space-x-2.5 truncate">
            {/* Mobile Sidebar Toggle */}
            <button
              onClick={() => setIsSidebarOpenMobile(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Bot className="w-4 h-4" />
            </div>

            <div className="truncate">
              <h2 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {activeConversation?.title || t('chat.title')}
              </h2>
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{t('chat.modelBadge')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Learner Profile Button */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800 transition-colors shadow-2xs"
              title={t('chat.profileModalTitle')}
            >
              <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">{t('chat.profileBtn')}</span>
            </button>

            {activeConversation && (
              <button
                onClick={() =>
                  updateConvMutation.mutate({
                    id: activeConversation._id,
                    payload: { pinned: !activeConversation.pinned },
                  })
                }
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  activeConversation.pinned
                    ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={activeConversation.pinned ? t('chat.unpinTooltip') : t('chat.pinTooltip')}
              >
                <Pin className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Message Stream Display Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {isLoadingMessages ? (
            <div className="space-y-4 max-w-2xl mx-auto py-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 items-start animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800" />
                  <div className="flex-1 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 && !isStreaming ? (
            /* Empty State: Starter Prompts */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-10 px-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">
                {t('chat.emptyConversationTitle')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                {t('chat.emptyConversationSubtitle')}
              </p>

              {/* Quick Prompts Grid */}
              <div className="w-full text-left space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {t('chat.quickPromptsTitle')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {quickPrompts.map((qp) => {
                    const Icon = qp.icon;
                    return (
                      <button
                        key={qp.key}
                        onClick={() => handleSendMessage(qp.text)}
                        className="flex items-start p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all text-xs text-left group shadow-xs"
                      >
                        <Icon className="w-4 h-4 text-indigo-500 mr-2 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="line-clamp-2">{qp.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Message List */
            <>
              {messages.map((msg, index) => renderMessageBubble(msg, index === messages.length - 1))}

              {/* Active Streaming Message Bubble */}
              {isStreaming && (
                <div className="flex items-start space-x-3 max-w-3xl">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex-1 bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl rounded-tl-xs p-4 shadow-sm text-sm">
                    {streamingText ? (
                      <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm">
                        {renderMarkdownContent(streamingText)}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1.5 text-xs text-slate-400 py-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                        <span>{t('chat.aiThinking')}</span>
                      </div>
                    )}

                    {/* Streamed Proposed Cards Widget */}
                    {streamingProposedCards.length > 0 && (
                      <ProposedCardsWidget cards={streamingProposedCards} isStreaming={true} />
                    )}

                    {/* Streamed Proposed Profile Update Widget */}
                    {streamingProposedProfileUpdate && (
                      <ProposedProfileUpdateWidget profile={streamingProposedProfileUpdate} isStreaming={true} />
                    )}

                    {/* Streamed Proposed Study Plan Preview Card */}
                    {streamingProposedStudyPlan && (
                      <StudyPlanPreviewCard plan={streamingProposedStudyPlan} isStreaming={true} />
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Actions */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 select-none">
          <div className="max-w-4xl mx-auto space-y-2">
            {/* Attachment Preview Chips Bar */}
            {pendingAttachments.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-xs animate-fadeIn">
                {pendingAttachments.map((att) => {
                  const isImg = att.mime?.startsWith('image/');
                  return (
                    <div
                      key={att.fileId}
                      className="group flex items-center space-x-2 pl-2 pr-1.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/70 border border-slate-200/80 dark:border-slate-600 text-xs text-slate-700 dark:text-slate-300"
                    >
                      {isImg ? (
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      )}
                      <span className="max-w-[140px] truncate font-medium text-[11px]">{att.name}</span>
                      <span className="text-[10px] text-slate-400">({formatFileSize(att.size)})</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePendingAttachment(att.fileId)}
                        className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-rose-500 transition-colors"
                        title={t('chat.deleteFileTooltip')}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Input Box */}
            <div className="relative flex items-end rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 shadow-xs focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all overflow-hidden p-1.5 sm:p-2">
              {/* Attachment Button 📎 */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || isUploadingAttachments}
                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0 self-end mb-0.5"
                title={t('chat.attachFileTooltip')}
              >
                {isUploadingAttachments ? (
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </button>

              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.inputPlaceholder')}
                rows={1}
                disabled={isStreaming}
                className="w-full resize-none max-h-40 px-3 py-1.5 text-xs sm:text-sm bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              />

              <div className="flex items-center space-x-1.5 flex-shrink-0 self-end pb-0.5">
                {isStreaming ? (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={handleStopStreaming}
                    className="rounded-xl px-3 py-1.5 text-xs font-semibold shadow-xs"
                    title={t('chat.stopBtn')}
                  >
                    <Square className="w-3.5 h-3.5 mr-1 fill-current" />
                    <span>{t('chat.stopBtn')}</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleSendMessage()}
                    disabled={(!inputText.trim() && pendingAttachments.length === 0) || isUploadingAttachments}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      inputText.trim() || pendingAttachments.length > 0
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    <span>{t('chat.sendBtn')}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Disclaimer Footer */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <div className="flex items-center space-x-1">
                <AlertCircle className="w-3 h-3 text-slate-400" />
                <span>{t('chat.disclaimer')}</span>
              </div>
              <span className="hidden sm:inline">{t('chat.inputHint')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Learner Profile Modal (Giai đoạn 13) */}
      <LearnerProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Delete Conversation Confirmation Modal */}
      {deletingConv && (
        <ConfirmModal
          isOpen={Boolean(deletingConv)}
          onClose={() => setDeletingConv(null)}
          onConfirm={() => deleteConvMutation.mutate(deletingConv._id)}
          title={t('chat.confirmDeleteTitle')}
          description={t('chat.confirmDeleteDesc')}
          confirmText={t('common.delete')}
          variant="danger"
          isLoading={deleteConvMutation.isPending}
        />
      )}

      {/* Enlarged Image Lightbox Modal */}
      {activeImagePreviewUrl && (
        <div
          onClick={() => setActiveImagePreviewUrl(null)}
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setActiveImagePreviewUrl(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={activeImagePreviewUrl}
              alt="Enlarged attachment"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );

  // Helper: Render conversation list item in sidebar
  function renderConversationItem(conv: Conversation) {
    const isSelected = conv._id === selectedConvId;
    const isEditing = editingConvId === conv._id;

    if (isSidebarCollapsed) {
      return (
        <button
          key={conv._id}
          onClick={() => setSelectedConvId(conv._id)}
          className={`w-full flex items-center justify-center p-2 rounded-xl transition-all ${
            isSelected
              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={conv.title}
        >
          {conv.pinned ? <Pin className="w-4 h-4 text-indigo-500" /> : <MessageSquare className="w-4 h-4" />}
        </button>
      );
    }

    return (
      <div
        key={conv._id}
        onClick={() => {
          if (!isEditing) {
            setSelectedConvId(conv._id);
            setIsSidebarOpenMobile(false);
          }
        }}
        className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-all ${
          isSelected
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
        }`}
      >
        <div className="flex items-center space-x-2 truncate flex-1 mr-1">
          {conv.pinned ? (
            <Pin className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
          ) : (
            <MessageSquare className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 group-hover:text-indigo-500 transition-colors" />
          )}

          {isEditing ? (
            <input
              type="text"
              autoFocus
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateConvMutation.mutate({ id: conv._id, payload: { title: editingTitle } });
                } else if (e.key === 'Escape') {
                  setEditingConvId(null);
                }
              }}
              onBlur={() => {
                if (editingTitle.trim()) {
                  updateConvMutation.mutate({ id: conv._id, payload: { title: editingTitle } });
                } else {
                  setEditingConvId(null);
                }
              }}
              className="w-full px-1.5 py-0.5 rounded border border-indigo-400 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          ) : (
            <span className="truncate">{conv.title}</span>
          )}
        </div>

        {/* Action icons on hover */}
        {!isEditing && (
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateConvMutation.mutate({ id: conv._id, payload: { pinned: !conv.pinned } });
              }}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-500"
              title={conv.pinned ? t('chat.unpinTooltip') : t('chat.pinTooltip')}
            >
              {conv.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingConvId(conv._id);
                setEditingTitle(conv.title);
              }}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              title={t('chat.renameTooltip')}
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeletingConv(conv);
              }}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500"
              title={t('chat.deleteTooltip')}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Helper: Render individual message bubble
  function renderMessageBubble(msg: ChatMessage, isLastMessage: boolean) {
    const isUser = msg.role === 'user';
    const hasAttachments = msg.attachments && msg.attachments.length > 0;

    return (
      <div
        key={msg._id}
        className={`flex items-start space-x-3 max-w-3xl ${
          isUser ? 'ml-auto flex-row-reverse space-x-reverse' : 'mr-auto'
        }`}
      >
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs ${
            isUser
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400'
          }`}
        >
          {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        {/* Bubble */}
        <div
          className={`flex-1 rounded-2xl p-4 shadow-xs text-xs sm:text-sm leading-relaxed ${
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-xs font-normal shadow-sm'
              : 'bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 rounded-tl-xs shadow-xs text-slate-800 dark:text-slate-200'
          }`}
        >
          {/* User Attachments Display */}
          {hasAttachments && (
            <div className="mb-3 space-y-2">
              {/* Image Grid */}
              {msg.attachments!.filter((a) => a.mime?.startsWith('image/')).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {msg.attachments!.filter((a) => a.mime?.startsWith('image/')).map((att) => (
                    <div
                      key={att.fileId}
                      onClick={() => setActiveImagePreviewUrl(chatService.getFileUrl(att.fileId))}
                      className="cursor-pointer overflow-hidden rounded-xl border border-white/20 dark:border-slate-700 shadow-xs hover:opacity-95 transition-opacity max-w-xs"
                    >
                      <img
                        src={chatService.getFileUrl(att.fileId)}
                        alt={att.name}
                        className="max-h-52 w-auto object-cover rounded-xl"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Document Attachment Chips */}
              {msg.attachments!.filter((a) => !a.mime?.startsWith('image/')).length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {msg.attachments!.filter((a) => !a.mime?.startsWith('image/')).map((att) => (
                    <a
                      key={att.fileId}
                      href={chatService.getFileUrl(att.fileId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={att.name}
                      className={`flex items-center space-x-2.5 p-2 rounded-xl text-xs transition-colors ${
                        isUser
                          ? 'bg-indigo-700/60 hover:bg-indigo-700 text-white border border-indigo-400/40'
                          : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <FileText className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                      <div className="flex-1 truncate">
                        <div className="font-semibold truncate">{att.name}</div>
                        <div className="text-[10px] opacity-75">{formatFileSize(att.size)}</div>
                      </div>
                      <Download className="w-3.5 h-3.5 opacity-70 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <>
              {renderMarkdownContent(msg.content)}

              {/* Render Propose Cards Widget from persisted toolCalls */}
              {msg.toolCalls &&
                msg.toolCalls
                  .filter((tc: any) => tc.name === 'propose_cards' && tc.args?.cards?.length > 0)
                  .map((tc: any, tcIdx: number) => (
                    <ProposedCardsWidget
                      key={`${msg._id}_cards_${tcIdx}`}
                      cards={tc.args.cards}
                      messageId={msg._id}
                    />
                  ))}

              {/* Render Proposed Profile Update Widget from persisted toolCalls */}
              {msg.toolCalls &&
                msg.toolCalls
                  .filter((tc: any) => tc.name === 'update_learner_profile' && tc.args?.profile)
                  .map((tc: any, tcIdx: number) => (
                    <ProposedProfileUpdateWidget
                      key={`${msg._id}_profile_${tcIdx}`}
                      profile={tc.args.profile}
                      messageId={msg._id}
                    />
                  ))}

              {/* Render Study Plan Preview Card from persisted toolCalls */}
              {msg.toolCalls &&
                msg.toolCalls
                  .filter((tc: any) => tc.name === 'propose_study_plan' && tc.args?.plan)
                  .map((tc: any, tcIdx: number) => (
                    <StudyPlanPreviewCard
                      key={`${msg._id}_plan_${tcIdx}`}
                      plan={tc.args.plan}
                      messageId={msg._id}
                    />
                  ))}

              {/* Utility action toolbar on Assistant messages */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-400 select-none">
                <div className="flex items-center space-x-2">
                  {/* Thumbs Up */}
                  <button
                    onClick={() =>
                      feedbackMutation.mutate({
                        messageId: msg._id,
                        feedback: msg.feedback === 'thumbs_up' ? null : 'thumbs_up',
                      })
                    }
                    className={`p-1.5 rounded-lg transition-colors ${
                      msg.feedback === 'thumbs_up'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400'
                    }`}
                    title={t('chat.thumbsUpTooltip')}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Thumbs Down */}
                  <button
                    onClick={() =>
                      feedbackMutation.mutate({
                        messageId: msg._id,
                        feedback: msg.feedback === 'thumbs_down' ? null : 'thumbs_down',
                      })
                    }
                    className={`p-1.5 rounded-lg transition-colors ${
                      msg.feedback === 'thumbs_down'
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400'
                    }`}
                    title={t('chat.thumbsDownTooltip')}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopy(msg.content, msg._id)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                    title={t('chat.copyBtn')}
                  >
                    {copiedMessageId === msg._id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Regenerate if this is the last message */}
                  {isLastMessage && !isStreaming && (
                    <button
                      onClick={handleRegenerate}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                      title={t('chat.regenerateBtn')}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Token Usage Badge if available */}
                {msg.tokenUsage && (msg.tokenUsage.input || msg.tokenUsage.output) && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    ~{(msg.tokenUsage.input || 0) + (msg.tokenUsage.output || 0)} tokens
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Helper: Custom Markdown Renderer with full GFM support
  function renderMarkdownContent(content: string) {
    // Strip propose_cards JSON code block so users see clean conversational text
    const cleanContent = (content || '')
      .replace(/```json:propose_cards[\s\S]*?(?:```|$)/g, '')
      .trim();

    if (!cleanContent) return null;

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-base sm:text-lg font-bold mt-3 mb-2 text-slate-900 dark:text-white" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-sm sm:text-base font-bold mt-3 mb-1.5 text-slate-900 dark:text-white" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xs sm:text-sm font-bold mt-2.5 mb-1 text-slate-900 dark:text-white" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-xs font-bold mt-2 mb-1 text-slate-900 dark:text-white" {...props} />
          ),
          p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2.5 space-y-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2.5 space-y-1" {...props} />,
          li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-indigo-500 pl-3.5 py-1.5 my-2.5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-r-lg text-slate-700 dark:text-slate-300 text-xs italic"
              {...props}
            />
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded text-xs font-mono bg-slate-100 dark:bg-slate-700/80 text-indigo-600 dark:text-indigo-400 font-semibold"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="p-3 my-2.5 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto shadow-inner">
                <code {...props}>{children}</code>
              </pre>
            );
          },
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-3 border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-xs text-left border-collapse" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th
              className="bg-slate-100 dark:bg-slate-800 p-2.5 font-bold border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td
              className="p-2.5 border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              {...props}
            />
          ),
          hr: () => <hr className="my-3 border-slate-200 dark:border-slate-700" />,
        }}
      >
        {content}
      </ReactMarkdown>
    );
  }
};

export default LearnChatPage;
