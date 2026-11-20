import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Plus,
  GitMerge,
  BookOpen,
  Edit2,
  Trash2,
  Upload,
  Calendar,
  Award,
  Sparkles,
  Play,
  BarChart3,
  Sliders,
} from 'lucide-react';
import { learnService } from '../services/learn.service';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { DeckModal } from '../components/DeckModal';
import { MergeDeckModal } from '../components/MergeDeckModal';
import { CardModal } from '../components/CardModal';
import { BulkImportModal } from '../components/BulkImportModal';
import { LearnStatsModal } from '../components/LearnStatsModal';
import { LearnSettingsModal } from '../components/LearnSettingsModal';
import { useI18n } from '../../../i18n';
import { toast } from '../../../store/useToastStore';
import type { Deck } from '../types/learn';

export const LearnDecksPage: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Queries
  const { data: decks = [], isLoading } = useQuery({
    queryKey: ['learn', 'decks'],
    queryFn: () => learnService.getDecks(),
  });

  // Modals state
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);

  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeSourceDeckId, setMergeSourceDeckId] = useState<string | undefined>(undefined);

  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [selectedDeckForCard, setSelectedDeckForCard] = useState<string | undefined>(undefined);

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedDeckForBulk, setSelectedDeckForBulk] = useState<string | undefined>(undefined);

  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [deletingDeck, setDeletingDeck] = useState<Deck | null>(null);

  // Delete Deck mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => learnService.deleteDeck(id, true),
    onSuccess: (data) => {
      toast.success(t('learn.deckDeletedSuccess', { count: data.deletedCardsCount }));
      queryClient.invalidateQueries({ queryKey: ['learn', 'decks'] });
      queryClient.invalidateQueries({ queryKey: ['learn', 'cards'] });
      setDeletingDeck(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || t('common.error');
      toast.error(msg);
    },
  });

  const totalCardsAcrossAll = decks.reduce((sum, d) => sum + (d.totalCards || 0), 0);
  const totalDueAcrossAll = decks.reduce((sum, d) => sum + (d.dueCards || 0), 0);
  const totalMasteredAcrossAll = decks.reduce((sum, d) => sum + (d.masteredCards || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            <span>{t('learn.moduleTitle')}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('learn.decksPageTitle')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('learn.decksPageSubtitle')}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Review All Button */}
          <Button
            size="sm"
            onClick={() => navigate('/learn/review')}
            className={`font-semibold ${
              totalDueAcrossAll > 0
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-md shadow-indigo-500/20'
                : ''
            }`}
          >
            <Play className="w-4 h-4 mr-1.5 fill-current" />
            <span>{t('learn.startReviewAllBtn')}</span>
            {totalDueAcrossAll > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[11px] bg-rose-500 text-white font-extrabold animate-pulse">
                {totalDueAcrossAll}
              </span>
            )}
          </Button>

          {/* AI Chat Assistant */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/learn/chat')}
            className="border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
          >
            <Sparkles className="w-4 h-4 mr-1.5 text-indigo-500" />
            <span>{t('learn.aiChatBtn')}</span>
          </Button>

          {/* Stats Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStatsModalOpen(true)}
            title={t('learn.statsModalTitle')}
          >
            <BarChart3 className="w-4 h-4 mr-1.5 text-indigo-600 dark:text-indigo-400" />
            <span>{t('learn.statsBtn')}</span>
          </Button>

          {/* Settings Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsModalOpen(true)}
            title={t('learn.studySettingsTitle')}
          >
            <Sliders className="w-4 h-4 mr-1.5 text-slate-600 dark:text-slate-400" />
            <span>{t('learn.settingsBtn')}</span>
          </Button>

          {/* Manage All Cards */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/learn/cards')}
          >
            <Layers className="w-4 h-4 mr-1.5" />
            {t('learn.manageAllCardsBtn')}
          </Button>

          {decks.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMergeSourceDeckId(undefined);
                setIsMergeModalOpen(true);
              }}
            >
              <GitMerge className="w-4 h-4 mr-1.5" />
              {t('learn.mergeDecksBtn')}
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => {
              setEditingDeck(null);
              setIsDeckModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {t('learn.createDeckBtn')}
          </Button>
        </div>
      </div>

      {/* Global Stat Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center space-x-4 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t('learn.totalDecksAndCards')}
            </p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {decks.length} {t('learn.decksUnit')} • {totalCardsAcrossAll} {t('learn.cardsUnit')}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center space-x-4 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t('learn.cardsDueForReview')}
            </p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {totalDueAcrossAll} {t('learn.cardsUnit')}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center space-x-4 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t('learn.masteredCards')}
            </p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {totalMasteredAcrossAll} {t('learn.cardsUnit')}
            </p>
          </div>
        </div>
      </div>

      {/* Decks Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200 dark:border-slate-800"
            />
          ))}
        </div>
      ) : decks.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={t('learn.noDecksTitle')}
          description={t('learn.noDecksDesc')}
          actionLabel={t('learn.createFirstDeckBtn')}
          onAction={() => {
            setEditingDeck(null);
            setIsDeckModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {decks.map((deck) => {
            const dueCount = deck.dueCards || 0;
            const totalCount = deck.totalCards || 0;
            const masteredCount = deck.masteredCards || 0;

            return (
              <div
                key={deck._id}
                className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all overflow-hidden"
              >
                {/* Decorative top color bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: deck.color || '#6366f1' }}
                />

                {/* Deck Card Header */}
                <div className="pt-1">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="cursor-pointer flex-1"
                      onClick={() => navigate(`/learn/cards?deckId=${deck._id}`)}
                    >
                      <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {deck.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 min-h-[2rem]">
                        {deck.description || t('learn.noDescription')}
                      </p>
                    </div>

                    {/* Edit / Delete deck actions */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setEditingDeck(deck);
                          setIsDeckModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title={t('common.edit')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingDeck(deck)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Stats Badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <Badge variant="default" size="sm">
                      {totalCount} {t('learn.cardsUnit')}
                    </Badge>
                    {dueCount > 0 ? (
                      <Badge variant="warning" size="sm">
                        <Sparkles className="w-3 h-3 mr-1" />
                        {dueCount} {t('learn.dueUnit')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" size="sm">
                        {t('learn.allUpToDate')}
                      </Badge>
                    )}
                    {masteredCount > 0 && (
                      <Badge variant="success" size="sm">
                        <Award className="w-3 h-3 mr-1" />
                        {masteredCount} {t('learn.masteredUnit')}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Footer Quick Action Buttons */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDeckForCard(deck._id);
                        setIsCardModalOpen(true);
                      }}
                      title={t('learn.addCardToDeck')}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      {t('learn.addWordBtn')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDeckForBulk(deck._id);
                        setIsBulkModalOpen(true);
                      }}
                      title={t('learn.bulkImportBtn')}
                    >
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      {t('learn.importBtn')}
                    </Button>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* "Ôn tập ngay" Button with Due Badge */}
                    <Button
                      size="sm"
                      variant={dueCount > 0 ? 'primary' : 'outline'}
                      onClick={() => navigate(`/learn/review/${deck._id}`)}
                      className={
                        dueCount > 0
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold'
                          : ''
                      }
                      title={t('learn.reviewNowBtn')}
                    >
                      <Play className="w-3.5 h-3.5 mr-1 fill-current" />
                      <span>{t('learn.reviewNowBtn')}</span>
                      {dueCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-extrabold">
                          {dueCount}
                        </span>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/learn/cards?deckId=${deck._id}`)}
                      title={t('learn.viewCardsBtn')}
                    >
                      {t('learn.viewCardsBtn')}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <DeckModal
        isOpen={isDeckModalOpen}
        onClose={() => setIsDeckModalOpen(false)}
        deck={editingDeck}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['learn', 'decks'] });
        }}
      />

      <MergeDeckModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        decks={decks}
        defaultSourceDeckId={mergeSourceDeckId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['learn', 'decks'] });
          queryClient.invalidateQueries({ queryKey: ['learn', 'cards'] });
        }}
      />

      <CardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        card={null}
        decks={decks}
        defaultDeckId={selectedDeckForCard}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['learn', 'decks'] });
          queryClient.invalidateQueries({ queryKey: ['learn', 'cards'] });
        }}
      />

      <BulkImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        decks={decks}
        defaultDeckId={selectedDeckForBulk}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['learn', 'decks'] });
          queryClient.invalidateQueries({ queryKey: ['learn', 'cards'] });
        }}
      />

      <LearnStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
      />

      <LearnSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <ConfirmModal
        isOpen={!!deletingDeck}
        onClose={() => setDeletingDeck(null)}
        onConfirm={() => {
          if (deletingDeck) {
            deleteMutation.mutate(deletingDeck._id);
          }
        }}
        title={t('learn.confirmDeleteDeckTitle')}
        message={t('learn.confirmDeleteDeckDesc', {
          name: deletingDeck?.name || '',
          count: deletingDeck?.totalCards || 0,
        })}
        confirmLabel={t('common.delete')}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
