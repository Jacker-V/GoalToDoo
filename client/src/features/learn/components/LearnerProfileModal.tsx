import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap,
  Target,
  Calendar,
  Clock,
  AlertCircle,
  Heart,
  FileText,
  RotateCcw,
  Save,
  Plus,
  X,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { chatService } from '../services/chat.service';
import { toast } from '../../../store/useToastStore';
import { useI18n } from '../../../i18n';
import type { LearnerProfile } from '../types/learn';

interface LearnerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (profile: LearnerProfile) => void;
}

const LEVEL_OPTIONS = [
  { value: 'Beginner (A1)' },
  { value: 'Elementary (A2)' },
  { value: 'Intermediate (B1)' },
  { value: 'Upper-Intermediate (B2)' },
  { value: 'Advanced (C1)' },
  { value: 'Proficiency (C2)' },
  { value: 'IELTS 5.0 - 6.0' },
  { value: 'IELTS 6.5 - 7.5' },
  { value: 'IELTS 8.0+' },
  { value: 'TOEIC 500 - 700' },
  { value: 'TOEIC 750+' },
  { value: 'Giao tiếp hàng ngày cơ bản', labelKey: 'chat.levelDaily' },
  { value: 'Giao tiếp công việc & phỏng vấn', labelKey: 'chat.levelBusiness' },
];

export const LearnerProfileModal: React.FC<LearnerProfileModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated,
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  // Fetch learner profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['learn', 'chat', 'profile'],
    queryFn: () => chatService.getLearnerProfile(),
    enabled: isOpen,
  });

  const [level, setLevel] = useState('Intermediate (B1)');
  const [targetGoal, setTargetGoal] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const [weaknessInput, setWeaknessInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Sync state from fetched profile
  useEffect(() => {
    if (profile) {
      setLevel(profile.level || 'Intermediate (B1)');
      setTargetGoal(profile.targetGoal || '');
      setTargetDate(
        profile.targetDate ? new Date(profile.targetDate).toISOString().slice(0, 10) : ''
      );
      setDailyMinutes(profile.dailyMinutes || 30);
      setWeaknesses(Array.isArray(profile.weaknesses) ? profile.weaknesses : []);
      setInterests(Array.isArray(profile.interests) ? profile.interests : []);
      setNotes(profile.notes || '');
    }
  }, [profile]);

  // Save profile mutation
  const updateMutation = useMutation({
    mutationFn: (payload: Partial<LearnerProfile>) => chatService.updateLearnerProfile(payload),
    onSuccess: (updated) => {
      toast.success(t('chat.profileSaveSuccess'));
      queryClient.setQueryData(['learn', 'chat', 'profile'], updated);
      onProfileUpdated?.(updated);
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || t('common.error');
      toast.error(msg);
    },
  });

  // Reset profile mutation ("Forget all")
  const resetMutation = useMutation({
    mutationFn: () => chatService.resetLearnerProfile(),
    onSuccess: (resetProfile) => {
      toast.success(t('chat.profileResetSuccess'));
      queryClient.setQueryData(['learn', 'chat', 'profile'], resetProfile);
      setLevel(resetProfile.level || 'Intermediate (B1)');
      setTargetGoal('');
      setTargetDate('');
      setDailyMinutes(30);
      setWeaknesses([]);
      setInterests([]);
      setNotes('');
      setIsResetConfirmOpen(false);
      onProfileUpdated?.(resetProfile);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || t('common.error');
      toast.error(msg);
    },
  });

  const handleAddWeakness = () => {
    const val = weaknessInput.trim();
    if (val && !weaknesses.includes(val)) {
      setWeaknesses([...weaknesses, val]);
      setWeaknessInput('');
    }
  };

  const handleRemoveWeakness = (index: number) => {
    setWeaknesses(weaknesses.filter((_, i) => i !== index));
  };

  const handleAddInterest = () => {
    const val = interestInput.trim();
    if (val && !interests.includes(val)) {
      setInterests([...interests, val]);
      setInterestInput('');
    }
  };

  const handleRemoveInterest = (index: number) => {
    setInterests(interests.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      level,
      targetGoal: targetGoal.trim(),
      targetDate: targetDate ? new Date(targetDate).toISOString() : null,
      dailyMinutes: Number(dailyMinutes) || 30,
      weaknesses,
      interests,
      notes: notes.trim(),
    });
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('chat.profileModalTitle')}
        maxWidth="2xl"
      >
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-500">{t('common.loading')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Context Info Banner */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-start space-x-3 text-xs text-indigo-900 dark:text-indigo-200">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">{t('chat.profileModalSubtitle')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Level Dropdown */}
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <GraduationCap className="w-4 h-4 mr-1.5 text-indigo-500" />
                  <span>{t('chat.profileLevelLabel')}</span>
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  {LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.labelKey ? t(opt.labelKey) : opt.value}
                    </option>
                  ))}
                </select>
              </div>

              {/* Daily Minutes */}
              <div>
                <label className="flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <Clock className="w-4 h-4 mr-1.5 text-amber-500" />
                  <span>{t('chat.profileDailyMinutesLabel')}</span>
                </label>
                <input
                  type="number"
                  min={5}
                  max={480}
                  value={dailyMinutes}
                  onChange={(e) => setDailyMinutes(Number(e.target.value) || 0)}
                  onBlur={() => setDailyMinutes((prev) => Math.max(5, Math.min(480, Number(prev) || 30)))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              {/* Target Goal */}
              <div className="sm:col-span-2">
                <label className="flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <Target className="w-4 h-4 mr-1.5 text-rose-500" />
                  <span>{t('chat.profileTargetGoalLabel')}</span>
                </label>
                <input
                  type="text"
                  value={targetGoal}
                  onChange={(e) => setTargetGoal(e.target.value)}
                  placeholder={t('chat.profileTargetGoalPlaceholder')}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              {/* Target Date */}
              <div className="sm:col-span-2">
                <label className="flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <Calendar className="w-4 h-4 mr-1.5 text-emerald-500" />
                  <span>{t('chat.profileTargetDateLabel')}</span>
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full sm:w-1/2 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Weaknesses Tag Input */}
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <AlertCircle className="w-4 h-4 mr-1.5 text-amber-500" />
                <span>{t('chat.profileWeaknessesLabel')}</span>
              </label>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={weaknessInput}
                  onChange={(e) => setWeaknessInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddWeakness();
                    }
                  }}
                  placeholder={t('chat.profileWeaknessesPlaceholder')}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddWeakness}
                  className="rounded-xl px-3 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>{t('chat.addTagBtn')}</span>
                </Button>
              </div>

              {weaknesses.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {weaknesses.map((w, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-medium"
                    >
                      <span>{w}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveWeakness(idx)}
                        className="ml-1.5 p-0.5 rounded-full hover:bg-amber-200/60 dark:hover:bg-amber-800 text-amber-500 hover:text-amber-700 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Interests Tag Input */}
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <Heart className="w-4 h-4 mr-1.5 text-rose-500" />
                <span>{t('chat.profileInterestsLabel')}</span>
              </label>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddInterest();
                    }
                  }}
                  placeholder={t('chat.profileInterestsPlaceholder')}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddInterest}
                  className="rounded-xl px-3 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>{t('chat.addTagBtn')}</span>
                </Button>
              </div>

              {interests.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {interests.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-medium"
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveInterest(idx)}
                        className="ml-1.5 p-0.5 rounded-full hover:bg-indigo-200/60 dark:hover:bg-indigo-800 text-indigo-500 hover:text-indigo-700 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Personal Notes */}
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <FileText className="w-4 h-4 mr-1.5 text-slate-400" />
                <span>{t('chat.profileNotesLabel')}</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('chat.profileNotesPlaceholder')}
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {/* Reset "Forget all" Button */}
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                disabled={resetMutation.isPending || updateMutation.isPending}
                className="inline-flex items-center text-xs font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-3 py-2 rounded-xl transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                <span>{t('chat.profileResetBtn')}</span>
              </button>

              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="rounded-xl px-4 text-xs"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={updateMutation.isPending}
                  className="rounded-xl px-5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-500/20"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  <span>{t('common.save')}</span>
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirmation Dialog for Resetting Profile ("Forget all") */}
      {isResetConfirmOpen && (
        <ConfirmModal
          isOpen={isResetConfirmOpen}
          onClose={() => setIsResetConfirmOpen(false)}
          onConfirm={() => resetMutation.mutate()}
          title={t('chat.profileResetConfirmTitle')}
          description={t('chat.profileResetConfirmDesc')}
          confirmText={t('chat.profileResetBtn')}
          variant="danger"
          isLoading={resetMutation.isPending}
        />
      )}
    </>
  );
};
