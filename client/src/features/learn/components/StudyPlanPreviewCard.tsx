import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Target,
  CheckCircle2,
  CalendarCheck,
  CheckSquare,
  X,
  Edit2,
  FolderTree,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { chatService } from '../services/chat.service';
import { toast } from '../../../store/useToastStore';
import { useI18n } from '../../../i18n';
import type { StudyPlanData, ApplyPlanResponse } from '../types/learn';

interface StudyPlanPreviewCardProps {
  plan: StudyPlanData;
  messageId?: string;
  isStreaming?: boolean;
}

export const StudyPlanPreviewCard: React.FC<StudyPlanPreviewCardProps> = ({
  plan: initialPlan,
  isStreaming = false,
}) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [plan, setPlan] = useState<StudyPlanData>(initialPlan);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [appliedData, setAppliedData] = useState<ApplyPlanResponse | null>(null);

  // Accordion state: which months/weeks are open
  const [expandedMonths, setExpandedMonths] = useState<Record<number, boolean>>({ 0: true });
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({ 0: true, 1: true });
  const [isEditing, setIsEditing] = useState(false);

  // Sync initialPlan if updated during stream
  React.useEffect(() => {
    if (initialPlan) {
      setPlan(initialPlan);
    }
  }, [initialPlan]);

  const toggleMonth = (idx: number) => {
    setExpandedMonths((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleWeek = (idx: number) => {
    setExpandedWeeks((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const applyMutation = useMutation({
    mutationFn: async () => {
      return chatService.applyStudyPlan(plan);
    },
    onSuccess: (data) => {
      setIsApplied(true);
      setAppliedData(data);
      toast.success(t('chat.appliedPlanSuccess'));
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || t('common.error');
      toast.error(msg);
    },
  });

  if (isDismissed) {
    return null;
  }

  const totalGoals =
    (plan.yearGoal ? 1 : 0) +
    (plan.monthGoals?.length || 0) +
    (plan.weekGoals?.length || 0);
  const totalTasks = plan.tasks?.length || 0;

  return (
    <div className="mt-3.5 mb-2 overflow-hidden rounded-2xl border border-indigo-200 dark:border-indigo-900/70 bg-gradient-to-br from-indigo-50/50 via-white to-emerald-50/30 dark:from-indigo-950/30 dark:via-slate-900 dark:to-emerald-950/20 shadow-sm transition-all text-xs">
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between bg-white/50 dark:bg-slate-900/50">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <FolderTree className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>
                {t('chat.studyPlanPreviewTitle', { goalsCount: totalGoals, tasksCount: totalTasks })}
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('chat.studyPlanPreviewSubtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {!isApplied && !isStreaming && (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isEditing
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={t('chat.editPlanBtn')}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={t('chat.dismissBtn')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hierarchical Roadmap Tree */}
      <div className="p-4 space-y-3">
        {/* 1. Year Goal Node */}
        {plan.yearGoal && (
          <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
                <Target className="w-3.5 h-3.5 mr-1" />
                <span>{t('chat.planYearGoal')}</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-200/60 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 font-semibold">
                {plan.yearGoal.priority || 'high'}
              </span>
            </div>
            {isEditing ? (
              <input
                type="text"
                value={plan.yearGoal.title}
                onChange={(e) =>
                  setPlan({
                    ...plan,
                    yearGoal: { ...plan.yearGoal!, title: e.target.value },
                  })
                }
                className="w-full px-2 py-1 text-xs rounded border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
              />
            ) : (
              <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                {plan.yearGoal.title}
              </h5>
            )}
            {plan.yearGoal.description && (
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                {plan.yearGoal.description}
              </p>
            )}
          </div>
        )}

        {/* 2. Month Goals (Accordion) */}
        {plan.monthGoals && plan.monthGoals.length > 0 && (
          <div className="space-y-2 pl-2 sm:pl-3 border-l-2 border-indigo-200 dark:border-indigo-900/60 ml-2">
            {plan.monthGoals.map((mg, mIdx) => {
              const isMonthOpen = !!expandedMonths[mIdx];
              // Find child week goals for this monthGoalIndex
              const childWeeks = (plan.weekGoals || []).filter(
                (wg) => wg.monthGoalIndex === mIdx || (wg.monthGoalIndex === undefined && mIdx === 0)
              );

              return (
                <div
                  key={mIdx}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 overflow-hidden shadow-2xs"
                >
                  {/* Month Goal Header */}
                  <div
                    onClick={() => toggleMonth(mIdx)}
                    className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none"
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0 mr-2">
                      <button type="button" className="text-slate-400 flex-shrink-0">
                        {isMonthOpen ? (
                          <ChevronDown className="w-4 h-4 text-indigo-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 flex-shrink-0">
                        {t('chat.planMonthGoal')} {mIdx + 1}
                      </span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={mg.title}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const updated = [...(plan.monthGoals || [])];
                            updated[mIdx] = { ...updated[mIdx], title: e.target.value };
                            setPlan({ ...plan, monthGoals: updated });
                          }}
                          className="flex-1 px-2 py-0.5 text-xs rounded border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200"
                        />
                      ) : (
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                          {mg.title}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {t('chat.weeksCount', { count: childWeeks.length })}
                    </span>
                  </div>

                  {/* Month Goal Body: Child Weeks */}
                  {isMonthOpen && (
                    <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
                      {mg.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mb-2">
                          {mg.description}
                        </p>
                      )}

                      {/* Week Goals Tree */}
                      {childWeeks.map((wg, wIdx) => {
                        const globalWeekIdx = (plan.weekGoals || []).indexOf(wg);
                        const isWeekOpen = !!expandedWeeks[globalWeekIdx];
                        // Find tasks for this weekGoalIndex
                        const childTasks = (plan.tasks || []).filter(
                          (t) =>
                            t.weekGoalIndex === globalWeekIdx ||
                            (t.weekGoalIndex === undefined && globalWeekIdx === 0)
                        );

                        return (
                          <div
                            key={wIdx}
                            className="rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-900/50 overflow-hidden"
                          >
                            {/* Week Goal Header */}
                            <div
                              onClick={() => toggleWeek(globalWeekIdx)}
                              className="px-2.5 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors select-none"
                            >
                              <div className="flex items-center space-x-1.5 flex-1 min-w-0 mr-2">
                                <button type="button" className="text-slate-400 flex-shrink-0">
                                  {isWeekOpen ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 flex-shrink-0">
                                  {t('chat.planWeekGoal')} {wIdx + 1}
                                </span>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={wg.title}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      const updated = [...(plan.weekGoals || [])];
                                      updated[globalWeekIdx] = { ...updated[globalWeekIdx], title: e.target.value };
                                      setPlan({ ...plan, weekGoals: updated });
                                    }}
                                    className="flex-1 px-2 py-0.5 text-xs rounded border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200"
                                  />
                                ) : (
                                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs truncate">
                                    {wg.title}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">
                                {t('chat.tasksCount', { count: childTasks.length })}
                              </span>
                            </div>

                            {/* Week Goal Body: Tasks */}
                            {isWeekOpen && childTasks.length > 0 && (
                              <div className="px-3 pb-2.5 pt-1 space-y-1.5 border-t border-slate-200/50 dark:border-slate-800">
                                {childTasks.map((task, tIdx) => {
                                  const globalTaskIdx = (plan.tasks || []).indexOf(task);
                                  return (
                                    <div
                                      key={tIdx}
                                      className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-start space-x-2"
                                    >
                                      <CheckSquare className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                          {isEditing ? (
                                            <input
                                              type="text"
                                              value={task.title}
                                              onChange={(e) => {
                                                const updated = [...(plan.tasks || [])];
                                                updated[globalTaskIdx] = { ...updated[globalTaskIdx], title: e.target.value };
                                                setPlan({ ...plan, tasks: updated });
                                              }}
                                              className="w-full mr-2 px-2 py-0.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-semibold text-slate-800 dark:text-slate-200"
                                            />
                                          ) : (
                                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                              {task.title}
                                            </span>
                                          )}
                                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-medium text-slate-400 flex-shrink-0">
                                            {task.priority || 'medium'}
                                          </span>
                                        </div>
                                        {task.notes && (
                                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                            {task.notes}
                                          </p>
                                        )}
                                        {task.subtasks && task.subtasks.length > 0 && (
                                          <div className="mt-1 pl-2 border-l border-slate-200 dark:border-slate-700 space-y-0.5">
                                            {task.subtasks.map((st, sIdx) => {
                                              const subtaskTitle = typeof st === 'string' ? st : (st as any)?.title;
                                              return (
                                                <div
                                                  key={sIdx}
                                                  className="text-[10px] text-slate-500 flex items-center space-x-1"
                                                >
                                                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                                  <span>{subtaskTitle}</span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 3. Standalone Week Goals (when monthGoals is omitted or weeks without month) */}
        {(!plan.monthGoals || plan.monthGoals.length === 0) && plan.weekGoals && plan.weekGoals.length > 0 && (
          <div className="space-y-2 pl-2 sm:pl-3 border-l-2 border-emerald-200 dark:border-emerald-900/60 ml-2">
            <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
              <CalendarCheck className="w-3.5 h-3.5 mr-1" />
              <span>{t('chat.standaloneWeekGoals')}</span>
            </span>
            {plan.weekGoals.map((wg, wIdx) => {
              const isWeekOpen = !!expandedWeeks[wIdx];
              const childTasks = (plan.tasks || []).filter(
                (t) => t.weekGoalIndex === wIdx || (t.weekGoalIndex === undefined && wIdx === 0)
              );

              return (
                <div
                  key={wIdx}
                  className="rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-900/50 overflow-hidden"
                >
                  <div
                    onClick={() => toggleWeek(wIdx)}
                    className="px-2.5 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors select-none"
                  >
                    <div className="flex items-center space-x-1.5 flex-1 min-w-0 mr-2">
                      <button type="button" className="text-slate-400 flex-shrink-0">
                        {isWeekOpen ? (
                          <ChevronDown className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 flex-shrink-0">
                        {t('chat.planWeekGoal')} {wIdx + 1}
                      </span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={wg.title}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const updated = [...(plan.weekGoals || [])];
                            updated[wIdx] = { ...updated[wIdx], title: e.target.value };
                            setPlan({ ...plan, weekGoals: updated });
                          }}
                          className="flex-1 px-2 py-0.5 text-xs rounded border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200"
                        />
                      ) : (
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs truncate">
                          {wg.title}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">
                      {t('chat.tasksCount', { count: childTasks.length })}
                    </span>
                  </div>

                  {isWeekOpen && childTasks.length > 0 && (
                    <div className="px-3 pb-2.5 pt-1 space-y-1.5 border-t border-slate-200/50 dark:border-slate-800">
                      {childTasks.map((task, tIdx) => {
                        const globalTaskIdx = (plan.tasks || []).indexOf(task);
                        return (
                          <div
                            key={tIdx}
                            className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-start space-x-2"
                          >
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={task.title}
                                    onChange={(e) => {
                                      const updated = [...(plan.tasks || [])];
                                      updated[globalTaskIdx] = { ...updated[globalTaskIdx], title: e.target.value };
                                      setPlan({ ...plan, tasks: updated });
                                    }}
                                    className="w-full mr-2 px-2 py-0.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-semibold text-slate-800 dark:text-slate-200"
                                  />
                                ) : (
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    {task.title}
                                  </span>
                                )}
                                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-medium text-slate-400 flex-shrink-0">
                                  {task.priority || 'medium'}
                                </span>
                              </div>
                              {task.notes && (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {task.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Standalone Tasks (when no monthGoals and no weekGoals) */}
        {(!plan.monthGoals || plan.monthGoals.length === 0) && (!plan.weekGoals || plan.weekGoals.length === 0) && plan.tasks && plan.tasks.length > 0 && (
          <div className="space-y-1.5 pl-2 sm:pl-3 border-l-2 border-indigo-200 dark:border-indigo-900/60 ml-2">
            <span className="inline-flex items-center text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
              <CheckSquare className="w-3.5 h-3.5 mr-1" />
              <span>{t('chat.standaloneTasks')}</span>
            </span>
            {plan.tasks.map((task, tIdx) => (
              <div
                key={tIdx}
                className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-start space-x-2"
              >
                <CheckSquare className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    {isEditing ? (
                      <input
                        type="text"
                        value={task.title}
                        onChange={(e) => {
                          const updated = [...(plan.tasks || [])];
                          updated[tIdx] = { ...updated[tIdx], title: e.target.value };
                          setPlan({ ...plan, tasks: updated });
                        }}
                        className="w-full mr-2 px-2 py-0.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-semibold text-slate-800 dark:text-slate-200"
                      />
                    ) : (
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {task.title}
                      </span>
                    )}
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-medium text-slate-400 flex-shrink-0">
                      {task.priority || 'medium'}
                    </span>
                  </div>
                  {task.notes && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {task.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="px-4 py-3 bg-indigo-50/50 dark:bg-slate-900/60 border-t border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
        {isApplied ? (
          <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <div>
                <span>{t('chat.appliedPlanSuccess')}</span>
                {appliedData && (
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                    {t('chat.planSummary', {
                      goals: appliedData.createdGoalsCount,
                      tasks: appliedData.createdTasksCount,
                    })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/calendar')}
                className="rounded-xl px-3 text-xs font-medium"
              >
                <Calendar className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                <span>{t('chat.viewCalendarBtn')}</span>
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/goals')}
                className="rounded-xl px-3 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Target className="w-3.5 h-3.5 mr-1" />
                <span>{t('chat.viewGoalsBtn')}</span>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              disabled={isStreaming || applyMutation.isPending}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {t('chat.dismissBtn')}
            </button>

            <Button
              size="sm"
              onClick={() => applyMutation.mutate()}
              isLoading={applyMutation.isPending}
              disabled={isStreaming}
              className="rounded-xl px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
            >
              <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
              <span>{t('chat.applyPlanBtn')}</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
