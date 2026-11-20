import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sliders, Keyboard, Check } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useI18n } from '../../../i18n';
import { learnService } from '../services/learn.service';
import { toast } from '../../../store/useToastStore';
import type { LearnSettings } from '../types/learn';

interface LearnSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (settings: LearnSettings) => void;
}

export const LearnSettingsModal: React.FC<LearnSettingsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['learn', 'settings'],
    queryFn: () => learnService.getSettings(),
    enabled: isOpen,
  });

  const [maxNew, setMaxNew] = useState(20);
  const [maxReview, setMaxReview] = useState(100);
  const [direction, setDirection] = useState<'en_to_vi' | 'vi_to_en'>('en_to_vi');
  const [typingMode, setTypingMode] = useState(false);

  useEffect(() => {
    if (settings) {
      setMaxNew(settings.maxNewCardsPerDay ?? 20);
      setMaxReview(settings.maxReviewCardsPerDay ?? 100);
      setDirection(settings.defaultDirection ?? 'en_to_vi');
      setTypingMode(!!settings.enableTypingMode);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (payload: Partial<LearnSettings>) => learnService.updateSettings(payload),
    onSuccess: (updated) => {
      toast.success(t('learn.settingsSavedSuccess'));
      queryClient.setQueryData(['learn', 'settings'], updated);
      queryClient.invalidateQueries({ queryKey: ['learn', 'review', 'queue'] });
      if (onSuccess) onSuccess(updated);
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || t('common.error');
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      maxNewCardsPerDay: Number(maxNew) || 20,
      maxReviewCardsPerDay: Number(maxReview) || 100,
      defaultDirection: direction,
      enableTypingMode: typingMode,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('learn.studySettingsTitle')}
      size="md"
    >
      {isLoading ? (
        <div className="py-8 text-center text-slate-500 animate-pulse">
          {t('common.loading')}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-start space-x-3 text-xs text-indigo-700 dark:text-indigo-300">
            <Sliders className="w-5 h-5 flex-shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
            <p leading-relaxed>
              {t('learn.settingsInfoDesc')}
            </p>
          </div>

          {/* Daily Quotas */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('learn.dailyLimitsHeader')}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('learn.maxNewCardsLabel')}
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={maxNew}
                    onChange={(e) => setMaxNew(Math.max(1, parseInt(e.target.value) || 1))}
                    className="pr-12 font-medium"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
                    {t('learn.cardsUnit')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {t('learn.maxNewCardsHint')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('learn.maxReviewCardsLabel')}
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={maxReview}
                    onChange={(e) => setMaxReview(Math.max(1, parseInt(e.target.value) || 1))}
                    className="pr-12 font-medium"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
                    {t('learn.cardsUnit')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {t('learn.maxReviewCardsHint')}
                </p>
              </div>
            </div>
          </div>

          {/* Review Direction */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('learn.defaultDirectionHeader')}
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDirection('en_to_vi')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  direction === 'en_to_vi'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{t('learn.directionEnVi')}</span>
                  {direction === 'en_to_vi' && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {t('learn.directionEnViDesc')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDirection('vi_to_en')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  direction === 'vi_to_en'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{t('learn.directionViEn')}</span>
                  {direction === 'vi_to_en' && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {t('learn.directionViEnDesc')}
                </span>
              </button>
            </div>
          </div>

          {/* Typing Mode Toggle */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Keyboard className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <label htmlFor="typing-toggle" className="text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                    {t('learn.enableTypingModeLabel')}
                  </label>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('learn.enableTypingModeDesc')}
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="typing-toggle"
                  type="checkbox"
                  checked={typingMode}
                  onChange={(e) => setTypingMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              isLoading={mutation.isPending}
            >
              {t('common.save')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
