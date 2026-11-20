import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Eye, Save, RotateCcw, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { useI18n } from '../../../i18n';
import { learnService } from '../services/learn.service';
import { toast } from '../../../store/useToastStore';
import type { Deck, BulkImportCardItem, PartOfSpeech } from '../types/learn';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  decks: Deck[];
  defaultDeckId?: string;
  onSuccess: () => void;
}

const POS_OPTIONS: PartOfSpeech[] = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'preposition',
  'conjunction',
  'idiom',
  'phrase',
  'other',
];

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  decks,
  defaultDeckId,
  onSuccess,
}) => {
  const { t } = useI18n();

  const [deckId, setDeckId] = useState('');
  const [rawText, setRawText] = useState('');
  const [source, setSource] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateDuplicates, setUpdateDuplicates] = useState(false);

  // Preview state
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewCards, setPreviewCards] = useState<BulkImportCardItem[]>([]);
  const [duplicatesCount, setDuplicatesCount] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDeckId(defaultDeckId || (decks[0]?._id ?? ''));
    setRawText('');
    setSource('');
    setTagsInput('');
    setIsPreviewMode(false);
    setPreviewCards([]);
    setDuplicatesCount(0);
    setError(null);
  }, [defaultDeckId, decks, isOpen]);

  const handlePreview = async () => {
    if (!deckId) {
      setError(t('learn.selectDeckError'));
      return;
    }
    if (!rawText.trim()) {
      setError(t('learn.rawTextRequired'));
      return;
    }

    const parsedTags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    try {
      setIsLoading(true);
      setError(null);

      const res = await learnService.previewBulkImport({
        deckId,
        rawText,
        source: source.trim(),
        tags: parsedTags,
      });

      setPreviewCards(res.cards);
      setDuplicatesCount(res.duplicatesCount);
      setIsPreviewMode(true);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || t('common.error');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardFieldChange = (index: number, field: keyof BulkImportCardItem, value: any) => {
    setPreviewCards((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleCommit = async () => {
    if (!deckId) {
      setError(t('learn.selectDeckError'));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await learnService.commitBulkImport({
        deckId,
        cards: previewCards,
        skipDuplicates,
        updateDuplicates,
      });

      toast.success(
        t('learn.bulkImportSuccess', {
          count: res.insertedCount,
          updated: res.updatedCount,
        })
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || t('common.error');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const insertSampleText = () => {
    setRawText(t('learn.sampleBulkText'));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('learn.bulkImportTitle')}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 text-sm rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}

        {!isPreviewMode ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Deck selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('learn.targetDeck')} <span className="text-rose-500">*</span>
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

            {/* Helper tips */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span className="flex items-center">
                  <HelpCircle className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                  {t('learn.bulkGuideTitle')}
                </span>
                <button
                  type="button"
                  onClick={insertSampleText}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] font-medium"
                >
                  {t('learn.insertSampleText')}
                </button>
              </div>
              <p>{t('learn.bulkGuideLine1')}</p>
              <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                • {t('learn.bulkGuideFormat1')} <br />
                • {t('learn.bulkGuideFormat2')} <br />
                • {t('learn.bulkGuideFormat3')}
              </p>
            </div>

            {/* Raw Text Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                {t('learn.rawTextLabel')} <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={t('learn.rawTextPlaceholder')}
                rows={8}
                className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                {t('common.cancel')}
              </Button>
              <Button type="button" onClick={handlePreview} isLoading={isLoading}>
                <Eye className="w-4 h-4 mr-1.5" />
                {t('learn.previewBtn')}
              </Button>
            </div>
          </>
        ) : (
          /* PREVIEW MODE */
          <>
            {/* Header stats & Duplicate actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
              <div className="flex items-center space-x-2">
                <Badge variant="default" size="sm">
                  {t('learn.totalParsed')}: {previewCards.length}
                </Badge>
                {duplicatesCount > 0 ? (
                  <Badge variant="warning" size="sm">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {t('learn.duplicatesCount')}: {duplicatesCount}
                  </Badge>
                ) : (
                  <Badge variant="success" size="sm">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {t('learn.allValid')}
                  </Badge>
                )}
              </div>

              {duplicatesCount > 0 && (
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="dupAction"
                      checked={skipDuplicates && !updateDuplicates}
                      onChange={() => {
                        setSkipDuplicates(true);
                        setUpdateDuplicates(false);
                      }}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{t('learn.skipDuplicatesOption')}</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="dupAction"
                      checked={updateDuplicates}
                      onChange={() => {
                        setSkipDuplicates(false);
                        setUpdateDuplicates(true);
                      }}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{t('learn.updateDuplicatesOption')}</span>
                  </label>
                </div>
              )}
            </div>

            {/* Editable Preview Table */}
            <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/90 sticky top-0 z-10 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-2.5 w-1/4">{t('learn.word')}</th>
                    <th className="p-2.5 w-24">{t('learn.partOfSpeech')}</th>
                    <th className="p-2.5 w-1/3">{t('learn.meaning')}</th>
                    <th className="p-2.5">{t('learn.example')}</th>
                    <th className="p-2.5 w-24 text-center">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {previewCards.map((card, idx) => (
                    <tr
                      key={idx}
                      className={
                        card.isDuplicate
                          ? 'bg-amber-50/50 dark:bg-amber-950/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }
                    >
                      <td className="p-2">
                        <input
                          type="text"
                          value={card.word}
                          onChange={(e) => handleCardFieldChange(idx, 'word', e.target.value)}
                          className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={card.partOfSpeech || 'other'}
                          onChange={(e) =>
                            handleCardFieldChange(idx, 'partOfSpeech', e.target.value)
                          }
                          className="w-full px-1.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs"
                        >
                          {POS_OPTIONS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={card.meaning}
                          onChange={(e) => handleCardFieldChange(idx, 'meaning', e.target.value)}
                          className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={card.example || ''}
                          onChange={(e) => handleCardFieldChange(idx, 'example', e.target.value)}
                          className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-500 dark:text-slate-400"
                        />
                      </td>
                      <td className="p-2 text-center">
                        {card.isDuplicate ? (
                          <Badge
                            variant="warning"
                            size="sm"
                            title={card.duplicateReason || t('learn.duplicateBadge')}
                          >
                            {t('learn.duplicateBadge')}
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            {t('learn.validBadge')}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPreviewMode(false)}
                disabled={isLoading}
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                {t('learn.backToEditBtn')}
              </Button>
              <div className="flex items-center space-x-3">
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                  {t('common.cancel')}
                </Button>
                <Button type="button" onClick={handleCommit} isLoading={isLoading}>
                  <Save className="w-4 h-4 mr-1.5" />
                  {t('learn.commitSaveBtn')}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
