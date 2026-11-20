import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useI18n } from '../../../i18n';
import { learnService } from '../services/learn.service';
import { toast } from '../../../store/useToastStore';
import type { Card, Deck, PartOfSpeech } from '../types/learn';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card | null;
  decks: Deck[];
  defaultDeckId?: string;
  onSuccess: (savedCard: Card) => void;
}

const PART_OF_SPEECH_OPTIONS: Array<{ value: PartOfSpeech; labelKey: string }> = [
  { value: 'noun', labelKey: 'learn.posNoun' },
  { value: 'verb', labelKey: 'learn.posVerb' },
  { value: 'adjective', labelKey: 'learn.posAdjective' },
  { value: 'adverb', labelKey: 'learn.posAdverb' },
  { value: 'preposition', labelKey: 'learn.posPreposition' },
  { value: 'conjunction', labelKey: 'learn.posConjunction' },
  { value: 'idiom', labelKey: 'learn.posIdiom' },
  { value: 'phrase', labelKey: 'learn.posPhrase' },
  { value: 'other', labelKey: 'learn.posOther' },
];

export const CardModal: React.FC<CardModalProps> = ({
  isOpen,
  onClose,
  card,
  decks,
  defaultDeckId,
  onSuccess,
}) => {
  const { t } = useI18n();

  const [deckId, setDeckId] = useState('');
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState<PartOfSpeech>('other');
  const [example, setExample] = useState('');
  const [note, setNote] = useState('');
  const [source, setSource] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (card) {
      const dId = typeof card.deckId === 'string' ? card.deckId : card.deckId?._id;
      setDeckId(dId || defaultDeckId || (decks[0]?._id ?? ''));
      setWord(card.word);
      setMeaning(card.meaning);
      setPartOfSpeech(card.partOfSpeech || 'other');
      setExample(card.example || '');
      setNote(card.note || '');
      setSource(card.source || '');
      setTagsInput(Array.isArray(card.tags) ? card.tags.join(', ') : '');
      setImageUrl(card.imageUrl || '');
    } else {
      setDeckId(defaultDeckId || (decks[0]?._id ?? ''));
      setWord('');
      setMeaning('');
      setPartOfSpeech('other');
      setExample('');
      setNote('');
      setSource('');
      setTagsInput('');
      setImageUrl('');
    }
    setAllowDuplicate(false);
    setDuplicateWarning(null);
    setError(null);
  }, [card, defaultDeckId, decks, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!deckId) {
      setError(t('learn.selectDeckError'));
      return;
    }
    if (!word.trim()) {
      setError(t('learn.wordRequired'));
      return;
    }
    if (!meaning.trim()) {
      setError(t('learn.meaningRequired'));
      return;
    }

    const parsedTags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    try {
      setIsSubmitting(true);
      setError(null);
      setDuplicateWarning(null);

      if (card) {
        const updated = await learnService.updateCard(card._id, {
          deckId,
          word: word.trim(),
          meaning: meaning.trim(),
          partOfSpeech,
          example: example.trim(),
          note: note.trim(),
          source: source.trim(),
          tags: parsedTags,
          imageUrl: imageUrl.trim(),
        });
        toast.success(t('learn.cardUpdatedSuccess'));
        onSuccess(updated);
        onClose();
      } else {
        const created = await learnService.createCard({
          deckId,
          word: word.trim(),
          meaning: meaning.trim(),
          partOfSpeech,
          example: example.trim(),
          note: note.trim(),
          source: source.trim(),
          tags: parsedTags,
          imageUrl: imageUrl.trim(),
          allowDuplicate,
        });
        toast.success(t('learn.cardCreatedSuccess'));
        onSuccess(created);
        onClose();
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        setDuplicateWarning(
          t('learn.duplicateCardWarning', { word: word.trim() })
        );
      } else {
        const msg = err.response?.data?.error?.message || t('common.error');
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={card ? t('learn.editCard') : t('learn.createCard')}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}

        {duplicateWarning && (
          <div className="p-3.5 text-sm rounded-xl bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200 border border-amber-300 dark:border-amber-800 space-y-2">
            <p className="font-medium text-xs">{duplicateWarning}</p>
            <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold">
              <input
                type="checkbox"
                checked={allowDuplicate}
                onChange={(e) => setAllowDuplicate(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>{t('learn.allowDuplicateCheckbox')}</span>
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Deck Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              {t('learn.deck')} <span className="text-rose-500">*</span>
            </label>
            <select
              value={deckId}
              onChange={(e) => setDeckId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {decks.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Part of Speech */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              {t('learn.partOfSpeech')}
            </label>
            <select
              value={partOfSpeech}
              onChange={(e) => setPartOfSpeech(e.target.value as PartOfSpeech)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {PART_OF_SPEECH_OPTIONS.map((pos) => (
                <option key={pos.value} value={pos.value}>
                  {t(pos.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Word */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              {t('learn.word')} <span className="text-rose-500">*</span>
            </label>
            <Input
              value={word}
              onChange={(e) => {
                setWord(e.target.value);
                setDuplicateWarning(null);
              }}
              placeholder={t('learn.wordPlaceholder')}
              autoFocus
            />
          </div>

          {/* Meaning */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              {t('learn.meaning')} <span className="text-rose-500">*</span>
            </label>
            <Input
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              placeholder={t('learn.meaningPlaceholder')}
            />
          </div>
        </div>

        {/* Example sentence */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            {t('learn.example')}
          </label>
          <textarea
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder={t('learn.examplePlaceholder')}
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Source */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              {t('learn.source')}
            </label>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder={t('learn.sourcePlaceholder')}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              {t('learn.tags')}
            </label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder={t('learn.tagsPlaceholder')}
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            {t('learn.note')}
          </label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('learn.notePlaceholder')}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {card ? t('common.save') : t('common.confirm')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
