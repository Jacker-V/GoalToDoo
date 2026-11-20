import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useI18n } from '../../../i18n';
import { learnService } from '../services/learn.service';
import { toast } from '../../../store/useToastStore';
import type { Deck } from '../types/learn';

interface DeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  deck: Deck | null;
  onSuccess: (savedDeck: Deck) => void;
}

const COLOR_PALETTE = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#84cc16', // Lime
  '#f59e0b', // Amber
  '#f97316', // Orange
  '#ef4444', // Red
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#64748b', // Slate
];

export const DeckModal: React.FC<DeckModalProps> = ({
  isOpen,
  onClose,
  deck,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (deck) {
      setName(deck.name);
      setDescription(deck.description || '');
      setColor(deck.color || '#6366f1');
    } else {
      setName('');
      setDescription('');
      setColor('#6366f1');
    }
    setError(null);
  }, [deck, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('learn.deckNameRequired'));
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (deck) {
        const updated = await learnService.updateDeck(deck._id, {
          name: name.trim(),
          description: description.trim(),
          color,
        });
        toast.success(t('learn.deckUpdatedSuccess'));
        onSuccess(updated);
      } else {
        const created = await learnService.createDeck({
          name: name.trim(),
          description: description.trim(),
          color,
        });
        toast.success(t('learn.deckCreatedSuccess'));
        onSuccess(created);
      }
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
      title={deck ? t('learn.editDeck') : t('learn.createDeck')}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            {t('learn.deckName')} <span className="text-rose-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('learn.deckNamePlaceholder')}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            {t('learn.deckDescription')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('learn.deckDescriptionPlaceholder')}
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            {t('learn.deckColor')}
          </label>
          <div className="flex flex-wrap items-center gap-2.5">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                  color === c ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {deck ? t('common.save') : t('common.confirm')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
