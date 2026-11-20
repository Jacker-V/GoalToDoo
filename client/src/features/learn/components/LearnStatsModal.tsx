import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useI18n } from '../../../i18n';
import { learnService } from '../services/learn.service';
import { toast } from '../../../store/useToastStore';

interface LearnStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LearnStatsModal: React.FC<LearnStatsModalProps> = ({ isOpen, onClose }) => {
  const { t, language } = useI18n();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'leeches' | 'sources'>('overview');

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['learn', 'stats'],
    queryFn: () => learnService.getStats(),
    enabled: isOpen,
  });

  const suspendMutation = useMutation({
    mutationFn: (cardId: string) => learnService.suspendCard(cardId),
    onSuccess: (updatedCard) => {
      const isSuspended = updatedCard.srs.status === 'suspended';
      toast.success(
        isSuspended ? t('learn.cardSuspendedToast') : t('learn.cardResumedToast')
      );
      refetch();
      queryClient.invalidateQueries({ queryKey: ['learn', 'cards'] });
      queryClient.invalidateQueries({ queryKey: ['learn', 'decks'] });
      queryClient.invalidateQueries({ queryKey: ['learn', 'review', 'queue'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || t('common.error');
      toast.error(msg);
    },
  });

  // Calculate highest count for forecast bar normalization
  const maxForecastCount = Math.max(
    1,
    ...(stats?.forecast?.map((f) => f.dueCount) || [1])
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('learn.statsModalTitle')}
      size="xl"
    >
      {isLoading || !stats ? (
        <div className="py-12 text-center text-slate-500 animate-pulse">
          {t('common.loading')}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{t('learn.tabOverviewForecast')}</span>
            </button>
            <button
              onClick={() => setActiveTab('leeches')}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'leeches'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {t('learn.tabLeechCards')} ({stats.leechCards.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'sources'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t('learn.tabSources')}</span>
            </button>
          </div>

          {/* TAB 1: OVERVIEW & FORECAST */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Metric Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {t('learn.totalCards')}
                  </p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {stats.totalCards}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                      {t('learn.retentionRate')}
                    </p>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {stats.retentionRate}%
                  </p>
                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                    {stats.successfulReviews}/{stats.totalReviews} {t('learn.reviewsUnit')}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                  <p className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                    {t('learn.statusReview')}
                  </p>
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {stats.byStatus.review}
                  </p>
                  <p className="text-[10px] text-indigo-700/80 dark:text-indigo-400/80 mt-0.5">
                    {t('learn.masteredDesc')}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                  <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                    {t('learn.statusLearning')}
                  </p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    {stats.byStatus.learning}
                  </p>
                  <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                    +{stats.byStatus.new} {t('learn.statusNew')}
                  </p>
                </div>
              </div>

              {/* Status Breakdown Bar */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>{t('learn.cardDistributionTitle')}</span>
                  <span className="text-slate-400">{stats.totalCards} {t('learn.cardsUnit')}</span>
                </div>

                {stats.totalCards > 0 ? (
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${(stats.byStatus.review / stats.totalCards) * 100}%` }}
                        className="h-full bg-emerald-500 transition-all"
                        title={`${t('learn.statusReview')}: ${stats.byStatus.review}`}
                      />
                      <div
                        style={{ width: `${(stats.byStatus.learning / stats.totalCards) * 100}%` }}
                        className="h-full bg-indigo-500 transition-all"
                        title={`${t('learn.statusLearning')}: ${stats.byStatus.learning}`}
                      />
                      <div
                        style={{ width: `${(stats.byStatus.new / stats.totalCards) * 100}%` }}
                        className="h-full bg-blue-400 transition-all"
                        title={`${t('learn.statusNew')}: ${stats.byStatus.new}`}
                      />
                      <div
                        style={{ width: `${(stats.byStatus.suspended / stats.totalCards) * 100}%` }}
                        className="h-full bg-slate-300 dark:bg-slate-600 transition-all"
                        title={`${t('learn.statusSuspended')}: ${stats.byStatus.suspended}`}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>{t('learn.statusReview')}: <b>{stats.byStatus.review}</b></span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        <span>{t('learn.statusLearning')}: <b>{stats.byStatus.learning}</b></span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                        <span>{t('learn.statusNew')}: <b>{stats.byStatus.new}</b></span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span>{t('learn.statusSuspended')}: <b>{stats.byStatus.suspended}</b></span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">{t('learn.noCardsYet')}</p>
                )}
              </div>

              {/* 7-Day Forecast Bar Chart */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                      <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{t('learn.forecast7DaysTitle')}</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t('learn.forecast7DaysSubtitle')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 pt-6 pb-2 items-end min-h-[140px]">
                  {stats.forecast.map((item, index) => {
                    const heightPercent = Math.max(8, Math.round((item.dueCount / maxForecastCount) * 100));
                    const isToday = index === 0;

                    return (
                      <div key={item.date} className="flex flex-col items-center space-y-1.5 group">
                        {/* Count Badge on Top */}
                        <span
                          className={`text-[11px] font-bold transition-all ${
                            item.dueCount > 0
                              ? isToday
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-700 dark:text-slate-300'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        >
                          {item.dueCount}
                        </span>

                        {/* Bar */}
                        <div className="w-full h-24 bg-slate-100 dark:bg-slate-800/80 rounded-lg flex items-end p-1">
                          <div
                            style={{ height: `${item.dueCount > 0 ? heightPercent : 0}%` }}
                            className={`w-full rounded-md transition-all duration-500 ${
                              isToday
                                ? 'bg-gradient-to-t from-rose-600 to-rose-400'
                                : 'bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-500 group-hover:to-indigo-300'
                            }`}
                          />
                        </div>

                        {/* Date Label */}
                        <span
                          className={`text-[10px] text-center font-medium line-clamp-1 ${
                            isToday
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {language === 'vi' ? item.labelVi : item.labelEn}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {item.date.split('-').slice(1).join('/')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LEECH CARDS */}
          {activeTab === 'leeches' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300">
                <div className="flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <p>
                    {t('learn.leechCardsDesc')}
                  </p>
                </div>
              </div>

              {stats.leechCards.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-80" />
                  <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                    {t('learn.noLeechCardsTitle')}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {t('learn.noLeechCardsDesc')}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 max-h-96 overflow-y-auto">
                  {stats.leechCards.map((card) => {
                    const isSuspended = card.srs?.status === 'suspended';

                    return (
                      <div
                        key={card._id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {card.word}
                            </span>
                            <Badge variant="danger" size="sm">
                              {card.srs?.lapses || 0} {t('learn.lapsesUnit')}
                            </Badge>
                            {isSuspended && (
                              <Badge variant="secondary" size="sm">
                                {t('learn.statusSuspended')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                            {card.meaning}
                          </p>
                          {card.example && (
                            <p className="text-[11px] text-slate-400 italic truncate mt-0.5">
                              "{card.example}"
                            </p>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant={isSuspended ? 'outline' : 'danger'}
                          onClick={() => suspendMutation.mutate(card._id)}
                          isLoading={suspendMutation.isPending}
                          title={isSuspended ? t('learn.resumeCardBtn') : t('learn.suspendCardBtn')}
                        >
                          {isSuspended ? (
                            <>
                              <PlayCircle className="w-3.5 h-3.5 mr-1" />
                              {t('learn.resumeCardBtn')}
                            </>
                          ) : (
                            <>
                              <PauseCircle className="w-3.5 h-3.5 mr-1" />
                              {t('learn.suspendCardBtn')}
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SOURCES */}
          {activeTab === 'sources' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('learn.sourcesSubtitle')}
              </p>

              {stats.bySource.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  {t('learn.noCardsYet')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stats.bySource.map((s) => (
                    <div
                      key={s.source}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <BookOpen className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {s.source}
                        </span>
                      </div>
                      <Badge variant="default" size="sm">
                        {s.count} {t('learn.cardsUnit')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
