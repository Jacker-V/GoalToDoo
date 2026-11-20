import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Upload,
  ArrowLeft,
  Filter,
  RotateCcw,
  Edit2,
  Trash2,
  PauseCircle,
  PlayCircle,
  Clock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { learnService } from '../services/learn.service';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { CardModal } from '../components/CardModal';
import { BulkImportModal } from '../components/BulkImportModal';
import { useI18n } from '../../../i18n';
import { toast } from '../../../store/useToastStore';
import type { Card, CardStatus, PartOfSpeech } from '../types/learn';

export const LearnCardsPage: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Query params state
  const deckIdParam = searchParams.get('deckId') || '';
  const [selectedDeckId, setSelectedDeckId] = useState(deckIdParam);
  const [selectedStatus, setSelectedStatus] = useState<CardStatus | ''>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Sync deckId when url changes
  useEffect(() => {
    setSelectedDeckId(deckIdParam);
    setPage(1);
  }, [deckIdParam]);

  // Fetch Decks for dropdown filter
  const { data: decks = [] } = useQuery({
    queryKey: ['learn', 'decks'],
    queryFn: () => learnService.getDecks(),
  });

  // Fetch Cards with filters
  const {
    data: cardsData,
    isLoading: isCardsLoading,
  } = useQuery({
    queryKey: [
      'learn',
      'cards',
      selectedDeckId,
      selectedStatus,
      searchKeyword,
      selectedTag,
      selectedSource,
      page,
    ],
    queryFn: () =>
      learnService.getCards({
        deckId: selectedDeckId || undefined,
        status: selectedStatus || undefined,
        search: searchKeyword.trim() || undefined,
        tag: selectedTag.trim() || undefined,
        source: selectedSource.trim() || undefined,
        page,
        limit,
      }),
  });

  const cards = cardsData?.data || [];
  const meta = cardsData?.meta || { page: 1, limit: 20, total: 0, totalPages: 1 };

  // Modals state
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [deletingCard, setDeletingCard] = useState<Card | null>(null);

  // Toggle Suspend Mutation
  const suspendMutation = useMutation({
    mutationFn: (id: string) => learnService.suspendCard(id),
    onSuccess: (updatedCard) => {
      const isSuspended = updatedCard.srs.status === 'suspended';
      toast.success(
        isSuspended ? t('learn.cardSuspendedSuccess') : t('learn.cardResumedSuccess')
      );
      queryClient.invalidateQueries({ queryKey: ['learn', 'cards'] });
      queryClient.invalidateQueries({ queryKey: ['learn', 'decks'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || t('common.error');
      toast.error(msg);
    },
  });

  // Delete Card Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => learnService.deleteCard(id),
    onSuccess: () => {
      toast.success(t('learn.cardDeletedSuccess'));
      queryClient.invalidateQueries({ queryKey: ['learn', 'cards'] });
      queryClient.invalidateQueries({ queryKey: ['learn', 'decks'] });
      setDeletingCard(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || t('common.error');
      toast.error(msg);
    },
  });

  const resetFilters = () => {
    setSelectedDeckId('');
    setSelectedStatus('');
    setSearchKeyword('');
    setSelectedTag('');
    setSelectedSource('');
    setPage(1);
    setSearchParams({});
  };

  const getPosBadgeVariant = (pos: PartOfSpeech): 'default' | 'info' | 'purple' | 'success' | 'warning' | 'secondary' => {
    switch (pos) {
      case 'noun':
        return 'info';
      case 'verb':
        return 'purple';
      case 'adjective':
        return 'success';
      case 'adverb':
        return 'warning';
      case 'idiom':
      case 'phrase':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusBadge = (status: CardStatus) => {
    switch (status) {
      case 'new':
        return <Badge variant="info">{t('learn.statusNew')}</Badge>;
      case 'learning':
        return <Badge variant="warning">{t('learn.statusLearning')}</Badge>;
      case 'review':
        return <Badge variant="purple">{t('learn.statusReview')}</Badge>;
      case 'suspended':
        return <Badge variant="secondary">{t('learn.statusSuspended')}</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/learn/decks')}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            title={t('learn.backToDecksBtn')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-0.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t('learn.moduleTitle')}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t('learn.cardsPageTitle')}
            </h1>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/learn/chat')}
            className="border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
          >
            <Sparkles className="w-4 h-4 mr-1.5 text-indigo-500" />
            <span>{t('learn.aiChatBtn')}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBulkModalOpen(true)}
          >
            <Upload className="w-4 h-4 mr-1.5" />
            {t('learn.bulkImportBtn')}
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setEditingCard(null);
              setIsCardModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {t('learn.addWordBtn')}
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Keyword Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setPage(1);
              }}
              placeholder={t('learn.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Deck Filter */}
          <div>
            <select
              value={selectedDeckId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDeckId(val);
                setPage(1);
                if (val) {
                  setSearchParams({ deckId: val });
                } else {
                  setSearchParams({});
                }
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">{t('learn.allDecksFilter')}</option>
              {decks.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as CardStatus | '');
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">{t('learn.allStatusesFilter')}</option>
              <option value="new">{t('learn.statusNew')}</option>
              <option value="learning">{t('learn.statusLearning')}</option>
              <option value="review">{t('learn.statusReview')}</option>
              <option value="suspended">{t('learn.statusSuspended')}</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="w-full sm:w-auto text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              {t('learn.resetFiltersBtn')}
            </Button>
          </div>
        </div>

        {/* Secondary Filters (Tag & Source) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <span className="text-slate-400 font-medium flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1" />
            {t('common.filter')}:
          </span>
          <div className="flex items-center space-x-1.5">
            <input
              type="text"
              value={selectedTag}
              onChange={(e) => {
                setSelectedTag(e.target.value);
                setPage(1);
              }}
              placeholder={t('learn.filterByTagPlaceholder')}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center space-x-1.5">
            <input
              type="text"
              value={selectedSource}
              onChange={(e) => {
                setSelectedSource(e.target.value);
                setPage(1);
              }}
              placeholder={t('learn.filterBySourcePlaceholder')}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <span className="ml-auto text-slate-400 font-medium">
            {t('learn.foundCount', { count: meta.total })}
          </span>
        </div>
      </div>

      {/* Cards Table Container */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
        {isCardsLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              icon={BookOpen}
              title={t('learn.noCardsFoundTitle')}
              description={t('learn.noCardsFoundDesc')}
              actionLabel={t('learn.addWordBtn')}
              onAction={() => {
                setEditingCard(null);
                setIsCardModalOpen(true);
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 uppercase font-bold tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-44">{t('learn.word')}</th>
                  <th className="py-3 px-4">{t('learn.meaning')}</th>
                  <th className="py-3 px-4 w-36">{t('learn.deck')}</th>
                  <th className="py-3 px-4 w-36">{t('learn.sourceAndTags')}</th>
                  <th className="py-3 px-4 w-28 text-center">{t('common.status')}</th>
                  <th className="py-3 px-4 w-28 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {cards.map((card) => {
                  const deckObj = typeof card.deckId === 'object' ? card.deckId : null;
                  const isSuspended = card.srs?.status === 'suspended';

                  return (
                    <tr
                      key={card._id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSuspended ? 'opacity-60 bg-slate-50/40 dark:bg-slate-900/40' : ''
                      }`}
                    >
                      {/* Word & POS */}
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex flex-col space-y-1">
                          <span className="text-sm font-bold tracking-tight">{card.word}</span>
                          <div>
                            <Badge
                              variant={getPosBadgeVariant(card.partOfSpeech)}
                              size="sm"
                              className="capitalize"
                            >
                              {card.partOfSpeech}
                            </Badge>
                          </div>
                        </div>
                      </td>

                      {/* Meaning & Example */}
                      <td className="py-3 px-4">
                        <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                          {card.meaning}
                        </p>
                        {card.example && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
                            "{card.example}"
                          </p>
                        )}
                        {card.note && (
                          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                            📌 {card.note}
                          </p>
                        )}
                      </td>

                      {/* Deck */}
                      <td className="py-3 px-4">
                        {deckObj ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            <span
                              className="w-2 h-2 rounded-full mr-1.5 flex-shrink-0"
                              style={{ backgroundColor: deckObj.color || '#6366f1' }}
                            />
                            <span className="truncate max-w-[100px]">{deckObj.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Source & Tags */}
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {card.source && (
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                            {card.source}
                          </p>
                        )}
                        {card.tags && card.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {card.tags.slice(0, 2).map((t, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              >
                                #{t}
                              </span>
                            ))}
                            {card.tags.length > 2 && (
                              <span className="text-[10px] text-slate-400">
                                +{card.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center space-y-1">
                          {getStatusBadge(card.srs?.status || 'new')}
                          {card.srs?.dueDate && card.srs?.status !== 'suspended' && (
                            <span
                              className="text-[10px] text-slate-400"
                              title={new Date(card.srs.dueDate).toLocaleString()}
                            >
                              {new Date(card.srs.dueDate) <= new Date() ? (
                                <span className="text-amber-500 font-semibold flex items-center">
                                  <Clock className="w-2.5 h-2.5 mr-0.5" />
                                  {t('learn.dueToday')}
                                </span>
                              ) : (
                                new Date(card.srs.dueDate).toLocaleDateString()
                              )}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => suspendMutation.mutate(card._id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isSuspended
                                ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={isSuspended ? t('learn.resumeCard') : t('learn.suspendCard')}
                          >
                            {isSuspended ? (
                              <PlayCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <PauseCircle className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setEditingCard(card);
                              setIsCardModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title={t('common.edit')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeletingCard(card)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta.totalPages > 1 && (
          <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div>
              {t('learn.pageIndicator', { page: meta.page, totalPages: meta.totalPages })}
            </div>
            <div className="flex items-center space-x-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                {t('learn.prevPage')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
              >
                {t('learn.nextPage')}
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        card={editingCard}
        decks={decks}
        defaultDeckId={selectedDeckId || decks[0]?._id}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['learn', 'cards'] });
          queryClient.invalidateQueries({ queryKey: ['learn', 'decks'] });
        }}
      />

      <BulkImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        decks={decks}
        defaultDeckId={selectedDeckId || decks[0]?._id}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['learn', 'cards'] });
          queryClient.invalidateQueries({ queryKey: ['learn', 'decks'] });
        }}
      />

      <ConfirmModal
        isOpen={!!deletingCard}
        onClose={() => setDeletingCard(null)}
        onConfirm={() => {
          if (deletingCard) {
            deleteMutation.mutate(deletingCard._id);
          }
        }}
        title={t('learn.confirmDeleteCardTitle')}
        message={t('learn.confirmDeleteCardDesc', { word: deletingCard?.word || '' })}
        confirmLabel={t('common.delete')}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
