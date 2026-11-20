import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  GraduationCap,
  Target,
  Clock,
  AlertCircle,
  Heart,
  CheckCircle2,
  X,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { chatService } from '../services/chat.service';
import { toast } from '../../../store/useToastStore';
import { useI18n } from '../../../i18n';
import type { LearnerProfile } from '../types/learn';

interface ProposedProfileUpdateWidgetProps {
  profile: Partial<LearnerProfile>;
  messageId?: string;
  isStreaming?: boolean;
}

export const ProposedProfileUpdateWidget: React.FC<ProposedProfileUpdateWidgetProps> = ({
  profile,
  isStreaming = false,
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [isApplied, setIsApplied] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const applyMutation = useMutation({
    mutationFn: async () => {
      return chatService.updateLearnerProfile(profile);
    },
    onSuccess: (updated) => {
      setIsApplied(true);
      toast.success(t('chat.profileSaveSuccess'));
      queryClient.setQueryData(['learn', 'chat', 'profile'], updated);
      queryClient.invalidateQueries({ queryKey: ['learn', 'chat', 'profile'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || t('common.error');
      toast.error(msg);
    },
  });

  if (isDismissed) {
    return null;
  }

  return (
    <div className="mt-3.5 mb-2 overflow-hidden rounded-2xl border border-indigo-200 dark:border-indigo-900/70 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/20 shadow-sm transition-all text-xs">
      {/* Widget Header */}
      <div className="px-4 py-3 border-b border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100">
              {t('chat.proposedProfileTitle')}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('chat.proposedProfileSubtitle')}
            </p>
          </div>
        </div>

        {!isApplied && !isStreaming && (
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t('chat.dismissBtn')}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Profile Details List */}
      <div className="p-4 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Level */}
          {profile.level && (
            <div className="flex items-center space-x-2 p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              <GraduationCap className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  {t('chat.profileLevelLabel')}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {profile.level}
                </span>
              </div>
            </div>
          )}

          {/* Daily Minutes */}
          {typeof profile.dailyMinutes === 'number' && (
            <div className="flex items-center space-x-2 p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  {t('chat.profileDailyMinutesLabel')}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {profile.dailyMinutes} {t('chat.minutesPerDay')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Target Goal */}
        {profile.targetGoal && (
          <div className="flex items-start space-x-2 p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
            <Target className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                {t('chat.profileTargetGoalLabel')}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {profile.targetGoal}
              </span>
            </div>
          </div>
        )}

        {/* Weaknesses */}
        {profile.weaknesses && profile.weaknesses.length > 0 && (
          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
            <span className="flex items-center text-[10px] text-slate-400 uppercase font-semibold mb-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 mr-1" />
              <span>{t('chat.profileWeaknessesLabel')}</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {profile.weaknesses.map((w, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-medium"
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
            <span className="flex items-center text-[10px] text-slate-400 uppercase font-semibold mb-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500 mr-1" />
              <span>{t('chat.profileInterestsLabel')}</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {profile.interests.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-medium"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {profile.notes && (
          <div className="flex items-start space-x-2 p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-600 dark:text-slate-300 italic">
              "{profile.notes}"
            </div>
          </div>
        )}
      </div>

      {/* Widget Footer Actions */}
      <div className="px-4 py-3 bg-indigo-50/50 dark:bg-slate-900/60 border-t border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
        {isApplied ? (
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>{t('chat.profileUpdatedBadge')}</span>
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
              className="rounded-xl px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              <span>{t('chat.applyProfileUpdateBtn')}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
