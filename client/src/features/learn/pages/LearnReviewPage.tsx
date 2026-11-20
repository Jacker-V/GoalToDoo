import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  RotateCw,
  Volume2,
  Check,
  X,
  Keyboard,
  Sparkles,
  PartyPopper,
  Repeat,
  Layers,
} from 'lucide-react';
import { learnService } from '../services/learn.service';
import { taskService } from '../../../services/task.service';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useI18n } from '../../../i18n';
import { toast } from '../../../store/useToastStore';
import type { ReviewCardItem, RatingValue, LearnSettings } from '../types/learn';

export const LearnReviewPage: React.FC = () => {
  const { deckId } = useParams<{ deckId?: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  // Load Settings
  const { data: settings } = useQuery<LearnSettings>({
    queryKey: ['learn', 'settings'],
    queryFn: () => learnService.getSettings(),
  });

  // Load Decks (for title / selector)
  const { data: decks = [] } = useQuery({
    queryKey: ['learn', 'decks'],
    queryFn: () => learnService.getDecks(),
  });

  // Load Queue
  const {
    data: queueData,
    isLoading: isQueueLoading,
    isRefetching,
    refetch: refetchQueue,
  } = useQuery({
    queryKey: ['learn', 'review', 'queue', deckId || 'all'],
    queryFn: () => learnService.getReviewQueue({ deckId }),
  });

  // Load Tasks (for daily learn goal completion tracking)
  const { data: todayTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskService.getTasks(),
  });

  const todayStr = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  const learnSystemTask =
    todayTasks.find(
      (t) => t.source === 'system' && t.linkedModule === 'learn' && t.metadata?.date === todayStr
    ) ||
    todayTasks.find((t) => t.source === 'system' && t.linkedModule === 'learn');
  const isDailyGoalCompleted = learnSystemTask?.isCompleted;

  const currentDeck = decks.find((d) => d._id === deckId);

  // Session state
  const [sessionCards, setSessionCards] = useState<ReviewCardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [typedInput, setTypedInput] = useState('');
  const [typingChecked, setTypingChecked] = useState(false);
  const [enableTyping, setEnableTyping] = useState(false);
  const [direction, setDirection] = useState<'en_to_vi' | 'vi_to_en'>('en_to_vi');
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now());

  // Session Completed Stats
  const [sessionStats, setSessionStats] = useState({
    reviewedCount: 0,
    goodOrEasyCount: 0,
    totalDurationMs: 0,
  });

  // Sync settings once loaded
  useEffect(() => {
    if (settings) {
      setEnableTyping(!!settings.enableTypingMode);
      setDirection(settings.defaultDirection || 'en_to_vi');
    }
  }, [settings]);

  // Populate session cards from queue
  useEffect(() => {
    if (queueData?.queue) {
      setSessionCards(queueData.queue);
      setCurrentIndex(0);
      setIsFlipped(false);
      setTypedInput('');
      setTypingChecked(false);
      setCardStartTime(Date.now());
    }
  }, [queueData]);

  const currentCard = sessionCards[currentIndex];
  const isFinished = sessionCards.length > 0 && currentIndex >= sessionCards.length;
  const isQueueEmpty = !isQueueLoading && sessionCards.length === 0;

  // Answer Card Mutation
  const answerMutation = useMutation({
    mutationFn: (payload: { cardId: string; rating: RatingValue; durationMs: number }) =>
      learnService.answerCard(payload),
    onSuccess: (_res, vars) => {
      // Update session statistics
      setSessionStats((prev) => ({
        reviewedCount: prev.reviewedCount + 1,
        goodOrEasyCount: prev.goodOrEasyCount + (vars.rating >= 3 ? 1 : 0),
        totalDurationMs: prev.totalDurationMs + vars.durationMs,
      }));

      // Invalidate relevant queries in background
      queryClient.invalidateQueries({ queryKey: ['learn', 'decks'] });
      queryClient.invalidateQueries({ queryKey: ['learn', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goalTree'] });
      queryClient.invalidateQueries({ queryKey: ['statsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['statsHeatmap'] });

      // Advance to next card
      setIsFlipped(false);
      setTypedInput('');
      setTypingChecked(false);
      setCurrentIndex((prev) => prev + 1);
      setCardStartTime(Date.now());
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || t('common.error');
      toast.error(msg);
    },
  });

  // Speak pronunciation
  const speakWord = useCallback((textToSpeak: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Answer handler
  const handleAnswer = useCallback(
    (rating: RatingValue) => {
      if (!currentCard || answerMutation.isPending) return;
      const durationMs = Math.max(500, Date.now() - cardStartTime);
      answerMutation.mutate({
        cardId: currentCard._id,
        rating,
        durationMs,
      });
    },
    [currentCard, answerMutation, cardStartTime]
  );

  // Check typing & flip card handler
  const handleCheckTyping = useCallback(() => {
    setTypingChecked(true);
    setIsFlipped(true);
    (document.activeElement as HTMLElement)?.blur();
  }, []);

  // Auto-focus typing input on card change
  useEffect(() => {
    if (enableTyping && !isFlipped && !isFinished && !isQueueEmpty) {
      inputRef.current?.focus();
    }
  }, [currentIndex, enableTyping, isFlipped, isFinished, isQueueEmpty]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished || isQueueEmpty) return;

      // Ignore if user is currently typing inside an input element and has not submitted yet
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (!typingChecked && enableTyping) {
            handleCheckTyping();
          } else {
            setIsFlipped((prev) => !prev);
            (document.activeElement as HTMLElement)?.blur();
          }
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
        return;
      }

      if (isFlipped && !answerMutation.isPending) {
        if (e.key === '1') {
          e.preventDefault();
          handleAnswer(1);
        } else if (e.key === '2') {
          e.preventDefault();
          handleAnswer(2);
        } else if (e.key === '3') {
          e.preventDefault();
          handleAnswer(3);
        } else if (e.key === '4') {
          e.preventDefault();
          handleAnswer(4);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, typingChecked, enableTyping, handleAnswer, handleCheckTyping, answerMutation.isPending, isFinished, isQueueEmpty]);

  // Format interval label helper
  const getIntervalLabel = (rating: RatingValue) => {
    const preview = currentCard?.nextReviews?.[rating];
    if (!preview) {
      return rating === 1 ? '1d' : rating === 2 ? '3d' : rating === 3 ? '6d' : '10d';
    }
    const days = preview.intervalDays;
    if (days <= 1) return t('learn.oneDay');
    if (days < 30) return t('learn.daysCount', { count: days });
    const months = Math.round(days / 30);
    return t('learn.monthsCount', { count: months });
  };

  // Compare typing helper with letter-by-letter diff (Always tests English spelling)
  const renderTypingDiff = () => {
    if (!currentCard || !typingChecked) return null;
    const target = (currentCard.word || '').trim().toLowerCase();
    const typed = typedInput.trim().toLowerCase();
    const isExactMatch = target === typed;

    return (
      <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2 text-xs font-semibold mb-1.5">
          {isExactMatch ? (
            <span className="flex items-center text-emerald-600 dark:text-emerald-400">
              <Check className="w-4 h-4 mr-1" />
              {t('learn.typingCorrect')}
            </span>
          ) : (
            <span className="flex items-center text-rose-600 dark:text-rose-400">
              <X className="w-4 h-4 mr-1" />
              {t('learn.typingIncorrect')}
            </span>
          )}
        </div>
        <div className="font-mono text-sm tracking-wide">
          {Array.from(target).map((char, idx) => {
            const typedChar = typed[idx];
            const isMatch = typedChar === char;
            return (
              <span
                key={idx}
                className={
                  isMatch
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-rose-600 dark:text-rose-400 underline decoration-2'
                }
              >
                {char}
              </span>
            );
          })}
          {typed.length > target.length && (
            <span className="text-rose-600 dark:text-rose-400 line-through font-bold">
              {typed.slice(target.length)}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col justify-between space-y-6 py-2 sm:py-4">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/learn/decks')}
            className="rounded-xl"
            title={t('learn.backToDecksBtn')}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">{t('learn.backToDecksBtn')}</span>
          </Button>

          <div>
            <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center space-x-2">
              <span>{currentDeck ? currentDeck.name : t('learn.allDecksReviewTitle')}</span>
              {currentDeck?.color && (
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: currentDeck.color }}
                />
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {direction === 'en_to_vi' ? t('learn.directionEnVi') : t('learn.directionViEn')}
            </p>
          </div>
        </div>

        {/* Direction & Typing Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setDirection((prev) => (prev === 'en_to_vi' ? 'vi_to_en' : 'en_to_vi'))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium flex items-center space-x-1.5 transition-colors"
            title={t('learn.switchDirectionTooltip')}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {direction === 'en_to_vi' ? 'EN → VI' : 'VI → EN'}
            </span>
          </button>

          <button
            onClick={() => setEnableTyping((prev) => !prev)}
            className={`p-2 rounded-xl border text-xs font-medium flex items-center space-x-1.5 transition-colors ${
              enableTyping
                ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={t('learn.toggleTypingModeTooltip')}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t('learn.typingMode')}</span>
          </button>
        </div>
      </div>

      {/* Main Review Area */}
      <div className="flex-1 flex flex-col justify-center my-6">
        {isQueueLoading ? (
          <div className="py-20 text-center text-slate-400 animate-pulse space-y-3">
            <Layers className="w-12 h-12 mx-auto text-indigo-500 animate-bounce" />
            <p className="font-semibold text-sm">{t('learn.loadingQueue')}</p>
          </div>
        ) : isQueueEmpty ? (
          /* Empty Queue State */
          <div className="max-w-md mx-auto text-center py-16 px-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {t('learn.allCaughtUpTitle')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {t('learn.allCaughtUpDesc')}
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <Button onClick={() => navigate('/learn/decks')}>
                {t('learn.backToDecksBtn')}
              </Button>
            </div>
          </div>
        ) : isFinished ? (
          /* Session Completed Screen */
          <div className="max-w-md mx-auto text-center py-14 px-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center mx-auto shadow-indigo-500/20 shadow-xl">
              <PartyPopper className="w-10 h-10 animate-bounce" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {t('learn.sessionCompleteTitle')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('learn.sessionCompleteSubtitle')}
              </p>
            </div>

            {isDailyGoalCompleted && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center space-x-2 text-xs sm:text-sm font-bold shadow-sm animate-in fade-in slide-in-from-bottom-2">
                <span>{t('learn.dailyReviewGoalCompleted')}</span>
              </div>
            )}

            {/* Session Stats Grid */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-[10px] text-slate-400 font-medium">{t('learn.reviewedCards')}</p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {sessionStats.reviewedCount}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">{t('learn.retentionRate')}</p>
                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {sessionStats.reviewedCount > 0
                    ? Math.round((sessionStats.goodOrEasyCount / sessionStats.reviewedCount) * 100)
                    : 100}
                  %
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-medium">{t('learn.avgTimePerCard')}</p>
                <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                  {sessionStats.reviewedCount > 0
                    ? (sessionStats.totalDurationMs / sessionStats.reviewedCount / 1000).toFixed(1)
                    : 0}
                  s
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                isLoading={isRefetching}
                onClick={() => {
                  setSessionStats({
                    reviewedCount: 0,
                    goodOrEasyCount: 0,
                    totalDurationMs: 0,
                  });
                  refetchQueue();
                }}
              >
                <Repeat className="w-4 h-4 mr-1.5" />
                {t('learn.reviewMoreBtn')}
              </Button>
              <Button
                className="flex-1"
                onClick={() => navigate('/learn/decks')}
              >
                {t('learn.backToDecksBtn')}
              </Button>
            </div>
          </div>
        ) : (
          /* Active Review Flashcard */
          <div className="space-y-6">
            {/* Session Progress Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    {t('learn.cardProgressLabel', {
                      current: currentIndex + 1,
                      total: sessionCards.length,
                    })}
                  </span>
                </span>
                <span className="text-slate-400">
                  {Math.round(((currentIndex) / sessionCards.length) * 100)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                  style={{
                    width: `${((currentIndex) / sessionCards.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* 3D Flashcard Flip Container */}
            <div
              className="relative w-full h-[360px] sm:h-[400px] cursor-pointer select-none"
              style={{ perspective: '1200px' }}
              onClick={() => setIsFlipped((prev) => !prev)}
            >
              <div
                className="relative w-full h-full rounded-3xl transition-transform duration-500 shadow-xl"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* --- FRONT FACE --- */}
                <div
                  className="absolute inset-0 w-full h-full p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 flex flex-col justify-between overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                >
                  {/* Front Top Meta */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="default" size="sm" className="uppercase font-bold tracking-wider text-[10px]">
                        {currentCard?.partOfSpeech || 'other'}
                      </Badge>
                      {currentCard?.source && (
                        <Badge variant="secondary" size="sm" className="text-[10px]">
                          {currentCard.source}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                      <span>{t('learn.pressSpaceToFlip')}</span>
                    </div>
                  </div>

                  {/* Front Core Word Display */}
                  <div className="text-center my-auto px-4">
                    <h3 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight break-words">
                      {direction === 'en_to_vi' ? currentCard?.word : currentCard?.meaning}
                    </h3>

                    {/* Audio Pronunciation Button (for English word) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        speakWord(currentCard?.word || '');
                      }}
                      className="mt-4 inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
                      title={t('learn.playAudioTooltip')}
                    >
                      <Volume2 className="w-4 h-4 mr-1.5" />
                      <span>{t('learn.listenAudio')}</span>
                    </button>
                  </div>

                  {/* Front Bottom Tip */}
                  <div className="text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                    {t('learn.clickToFlipHint')}
                  </div>
                </div>

                {/* --- BACK FACE --- */}
                <div
                  className="absolute inset-0 w-full h-full p-8 rounded-3xl bg-slate-50/95 dark:bg-slate-900 border-2 border-indigo-200/80 dark:border-indigo-900/50 flex flex-col justify-between overflow-y-auto"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  {/* Back Top Meta */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                        {currentCard?.word}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <Badge variant="default" size="sm" className="text-[10px]">
                        {currentCard?.partOfSpeech}
                      </Badge>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        speakWord(currentCard?.word || '');
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Back Definition & Example */}
                  <div className="my-auto py-2 space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        {direction === 'vi_to_en' ? t('learn.wordLabel') : t('learn.meaningLabel')}
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug">
                        {direction === 'vi_to_en' ? currentCard?.word : currentCard?.meaning}
                      </p>
                      {direction === 'vi_to_en' && (
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-1">
                          {currentCard?.meaning}
                        </p>
                      )}
                    </div>

                    {currentCard?.example && (
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          {t('learn.exampleLabel')}
                        </p>
                        <p className="text-sm italic text-slate-700 dark:text-slate-300">
                          "{currentCard.example}"
                        </p>
                      </div>
                    )}

                    {currentCard?.note && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        <b>{t('learn.noteLabel')}:</b> {currentCard.note}
                      </div>
                    )}
                  </div>

                  {/* Back Tags */}
                  {currentCard?.tags && currentCard.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      {currentCard.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Typing Mode Input Container */}
            {enableTyping && (
              <div
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <Keyboard className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{t('learn.typingModePrompt')}</span>
                  </label>
                  <span className="text-[11px] text-slate-400">{t('learn.typingPressEnterHint')}</span>
                </div>

                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={typedInput}
                    onChange={(e) => {
                      setTypedInput(e.target.value);
                      if (typingChecked) setTypingChecked(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCheckTyping();
                      }
                    }}
                    placeholder={t('learn.typingPlaceholder')}
                    className="flex-1 px-3.5 py-2 rounded-xl text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleCheckTyping}
                  >
                    {t('learn.checkTypingBtn')}
                  </Button>
                </div>

                {renderTypingDiff()}
              </div>
            )}

            {/* Smart SM-2 Rating Buttons (1, 2, 3, 4) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
                <span>{isFlipped ? t('learn.rateYourRecall') : t('learn.flipToRateHint')}</span>
                <span className="hidden sm:inline">{t('learn.shortcutsHint')}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1: Again (Red) */}
                <button
                  type="button"
                  disabled={!isFlipped || answerMutation.isPending}
                  onClick={() => handleAnswer(1)}
                  className={`p-3.5 rounded-2xl border-2 text-center transition-all flex flex-col justify-between group ${
                    isFlipped
                      ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 hover:border-rose-400 hover:shadow-md cursor-pointer'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/40 text-slate-400 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200/80 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200">
                      1
                    </span>
                    <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      +{getIntervalLabel(1)}
                    </span>
                  </div>
                  <div className="mt-2 text-left">
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                      {t('learn.ratingAgain')}
                    </p>
                    <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 line-clamp-1">
                      {t('learn.ratingAgainDesc')}
                    </p>
                  </div>
                </button>

                {/* 2: Hard (Amber/Orange) */}
                <button
                  type="button"
                  disabled={!isFlipped || answerMutation.isPending}
                  onClick={() => handleAnswer(2)}
                  className={`p-3.5 rounded-2xl border-2 text-center transition-all flex flex-col justify-between group ${
                    isFlipped
                      ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 hover:border-amber-400 hover:shadow-md cursor-pointer'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/40 text-slate-400 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200">
                      2
                    </span>
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      +{getIntervalLabel(2)}
                    </span>
                  </div>
                  <div className="mt-2 text-left">
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                      {t('learn.ratingHard')}
                    </p>
                    <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 line-clamp-1">
                      {t('learn.ratingHardDesc')}
                    </p>
                  </div>
                </button>

                {/* 3: Good (Emerald/Green) */}
                <button
                  type="button"
                  disabled={!isFlipped || answerMutation.isPending}
                  onClick={() => handleAnswer(3)}
                  className={`p-3.5 rounded-2xl border-2 text-center transition-all flex flex-col justify-between group ${
                    isFlipped
                      ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 hover:shadow-md cursor-pointer'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/40 text-slate-400 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200">
                      3
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      +{getIntervalLabel(3)}
                    </span>
                  </div>
                  <div className="mt-2 text-left">
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      {t('learn.ratingGood')}
                    </p>
                    <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 line-clamp-1">
                      {t('learn.ratingGoodDesc')}
                    </p>
                  </div>
                </button>

                {/* 4: Easy (Blue) */}
                <button
                  type="button"
                  disabled={!isFlipped || answerMutation.isPending}
                  onClick={() => handleAnswer(4)}
                  className={`p-3.5 rounded-2xl border-2 text-center transition-all flex flex-col justify-between group ${
                    isFlipped
                      ? 'border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 hover:border-blue-400 hover:shadow-md cursor-pointer'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/40 text-slate-400 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-200/80 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200">
                      4
                    </span>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      +{getIntervalLabel(4)}
                    </span>
                  </div>
                  <div className="mt-2 text-left">
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                      {t('learn.ratingEasy')}
                    </p>
                    <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 line-clamp-1">
                      {t('learn.ratingEasyDesc')}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="text-center text-xs text-slate-400 dark:text-slate-500 pt-4 border-t border-slate-100 dark:border-slate-800">
        <span>{t('learn.keyboardShortcutsFooter')}</span>
      </div>
    </div>
  );
};
