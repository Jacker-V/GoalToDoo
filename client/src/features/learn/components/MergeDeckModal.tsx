import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { GitMerge, ArrowRight, AlertTriangle } from 'lucide-react';
import { useI18n } from '../../../i18n';
import { learnService } from '../services/learn.service';
import { toast } from '../../../store/useToastStore';
import type { Deck } from '../types/learn';

interface MergeDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  decks: Deck[];
  defaultSourceDeckId?: string;
  onSuccess: () => void;
}

export const MergeDeckModal: React.FC<MergeDeckModalProps> = ({
  isOpen,
  onClose,
  decks,
  defaultSourceDeckId,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [sourceDeckId, setSourceDeckId] = useState('');
  const [targetDeckId, setTargetDeckId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultSourceDeckId) {
      setSourceDeckId(defaultSourceDeckId);
      const remaining = decks.filter((d) => d._id !== defaultSourceDeckId);
      if (remaining.length > 0) {
        setTargetDeckId(remaining[0]._id);
      } else {
        setTargetDeckId('');
      }
    } else if (decks.length >= 2) {
      setSourceDeckId(decks[0]._id);
      setTargetDeckId(decks[1]._id);
    } else {
      setSourceDeckId('');
      setTargetDeckId('');
    }
    setError(null);
  }, [defaultSourceDeckId, decks, isOpen]);

  const sourceDeck = decks.find((d) => d._id === sourceDeckId);
  const targetDeck = decks.find((d) => d._id === targetDeckId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceDeckId || !targetDeckId) {
      setError(t('learn.selectBothDecksError'));
      return;
    }
    if (sourceDeckId === targetDeckId) {
      setError(t('learn.mergeIdenticalDecksError'));
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await learnService.mergeDecks({
        sourceDeckId,
        targetDeckId,
      });

      toast.success(t('learn.mergeSuccess', { count: res.movedCardsCount }));
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || t('common.error');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('learn.mergeDecksTitle')}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start space-x-3 text-amber-800 dark:text-amber-200 text-xs leading-relaxed">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">{t('learn.mergeWarningTitle')}</p>
            <p>{t('learn.mergeWarningDesc')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-2">
          {/* Source Deck */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              {t('learn.sourceDeck')}
            </label>
            <select
              value={sourceDeckId}
              onChange={(e) => setSourceDeckId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">{t('learn.selectDeck')}</option>
              {decks.map((d) => (
                <option key={d._id} value={d._id} disabled={d._id === targetDeckId}>
                  {d.name} ({d.totalCards || 0} {t('learn.cardsUnit')})
                </option>
              ))}
            </select>
          </div>

          {/* Target Deck */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              {t('learn.targetDeck')}
            </label>
            <select
              value={targetDeckId}
              onChange={(e) => setTargetDeckId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">{t('learn.selectDeck')}</option>
              {decks.map((d) => (
                <option key={d._id} value={d._id} disabled={d._id === sourceDeckId}>
                  {d.name} ({d.totalCards || 0} {t('learn.cardsUnit')})
                </option>
              ))}
            </select>
          </div>
        </div>

        {sourceDeck && targetDeck && (
          <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              {sourceDeck.name} ({t('common.delete')})
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {targetDeck.name} ({t('learn.targetReceivingCards', { count: sourceDeck.totalCards || 0 })})
            </span>
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="danger"
            isLoading={isSubmitting}
            disabled={!sourceDeckId || !targetDeckId || sourceDeckId === targetDeckId}
          >
            <GitMerge className="w-4 h-4 mr-1.5" />
            {t('learn.confirmMerge')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
