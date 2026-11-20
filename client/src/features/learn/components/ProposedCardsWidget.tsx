import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Check,
  CheckCircle2,
  FolderPlus,
  Edit2,
  Save,
  X,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { learnService } from '../services/learn.service';
import { chatService } from '../services/chat.service';
import { Button } from '../../../components/ui/Button';
import { toast } from '../../../store/useToastStore';
import { useI18n } from '../../../i18n';
import type { ProposedCard, PartOfSpeech } from '../types/learn';

interface ProposedCardsWidgetProps {
  cards: ProposedCard[];
  messageId?: string;
  isStreaming?: boolean;
}

export const ProposedCardsWidget: React.FC<ProposedCardsWidgetProps> = ({
  cards: initialCards,
  isStreaming = false,
}) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [cards, setCards] = useState<ProposedCard[]>(initialCards || []);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set((initialCards || []).map((_, i) => i))
  );
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editMeaning, setEditMeaning] = useState('');
  const [editExample, setEditExample] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  // Sync props when initialCards changes
  useEffect(() => {
    if (initialCards && initialCards.length > 0) {
      setCards(initialCards);
      setSelectedIndices(new Set(initialCards.map((_, i) => i)));
    }
  }, [initialCards]);

  // Fetch available decks
  const { data: decks = [] } = useQuery({
    queryKey: ['learn', 'decks'],
    queryFn: () => learnService.getDecks(),
  });

  // Default select first deck
  useEffect(() => {
    if (!selectedDeckId && decks.length > 0) {
      setSelectedDeckId(decks[0]._id);
    }
  }, [decks, selectedDeckId]);

  // Mutation to add cards
  const addCardsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDeckId) {
        throw new Error(t('learn.selectDeckError'));
      }
      const selectedCards = cards.filter((_, idx) => selectedIndices.has(idx));
      if (selectedCards.length === 0) {
        throw new Error(t('chat.selectAtLeastOneCard'));
      }
      return chatService.addCardsAction(selectedDeckId, selectedCards);
    },
    onSuccess: (data) => {
      setIsSuccess(true);
      setSavedCount(data.addedCount);
      toast.success(t('chat.addCardsSuccess', { count: data.addedCount }));
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['learn', 'decks'] });
      queryClient.invalidateQueries({ queryKey: ['learn', 'cards'] });
      queryClient.invalidateQueries({ queryKey: ['learn', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || err.message || t('common.error'));
    },
  });

  if (isDismissed) {
    return (
      <div className="my-2 p-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 flex items-center justify-between select-none">
        <span>{t('chat.proposedCardsDismissed')}</span>
        <button
          onClick={() => setIsDismissed(false)}
          className="text-indigo-600 hover:underline dark:text-indigo-400 font-medium"
        >
          {t('chat.reviewAgain')}
        </button>
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return null;
  }

  // Handle Select All / Deselect All
  const isAllSelected = selectedIndices.size === cards.length && cards.length > 0;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(cards.map((_, i) => i)));
    }
  };

  const toggleSelectCard = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };

  // Start inline edit
  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditMeaning(cards[index].meaning);
    setEditExample(cards[index].example || '');
  };

  // Save inline edit
  const handleSaveEdit = (index: number) => {
    const nextCards = [...cards];
    nextCards[index] = {
      ...nextCards[index],
      meaning: editMeaning.trim(),
      example: editExample.trim(),
    };
    setCards(nextCards);
    setEditingIndex(null);
  };

  const getPosBadgeClass = (pos?: PartOfSpeech) => {
    switch (pos) {
      case 'noun':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60';
      case 'verb':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60';
      case 'adjective':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60';
      case 'adverb':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60';
      case 'idiom':
      case 'phrase':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  // Render Success Banner
  if (isSuccess) {
    const targetDeck = decks.find((d) => d._id === selectedDeckId);
    return (
      <div className="my-3 p-4 rounded-2xl border border-emerald-300/80 dark:border-emerald-800/80 bg-gradient-to-r from-emerald-50/90 to-teal-50/70 dark:from-emerald-950/40 dark:to-teal-950/30 shadow-xs">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                {t('chat.addCardsSuccess', { count: savedCount })}
              </h4>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                {t('chat.proposedCardsReadyDesc', { deck: targetDeck?.name || '' })}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate(`/learn/cards?deckId=${selectedDeckId}`)}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
          >
            <span>{t('chat.viewDeckBtn')}</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </div>
    );
  }

  const selectedCount = selectedIndices.size;

  return (
    <div className="my-3.5 rounded-2xl border border-indigo-200/90 dark:border-indigo-800/80 bg-gradient-to-b from-indigo-50/40 via-white to-white dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900 shadow-sm overflow-hidden select-none">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/80 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white">
              {t('chat.proposedCardsTitle', { count: cards.length })}
            </span>
          </div>
        </div>

        {/* Deck Selector */}
        <div className="flex items-center space-x-2 text-xs">
          <label className="text-slate-500 dark:text-slate-400 flex items-center font-medium">
            <Layers className="w-3.5 h-3.5 mr-1 text-indigo-500" />
            <span>{t('chat.selectDestinationDeck')}</span>
          </label>
          {decks.length > 0 ? (
            <select
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              className="px-2.5 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {decks.map((deck) => (
                <option key={deck._id} value={deck._id}>
                  {deck.name} ({deck.totalCards || 0} {t('learn.cardsUnit')})
                </option>
              ))}
            </select>
          ) : (
            <button
              onClick={() => navigate('/learn/decks')}
              className="text-xs text-rose-500 underline font-semibold flex items-center"
            >
              <FolderPlus className="w-3.5 h-3.5 mr-1" />
              {t('chat.createDeckFirst')}
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto max-h-72 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  title={isAllSelected ? t('chat.deselectAll') : t('chat.selectAll')}
                />
              </th>
              <th className="py-2.5 px-3 w-36">{t('chat.wordColumn')}</th>
              <th className="py-2.5 px-2.5 w-24">{t('chat.posColumn')}</th>
              <th className="py-2.5 px-3">{t('chat.meaningColumn')}</th>
              <th className="py-2.5 px-3 hidden md:table-cell">{t('chat.exampleColumn')}</th>
              <th className="py-2.5 px-2.5 w-16 text-center">{t('common.edit')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {cards.map((card, idx) => {
              const isSelected = selectedIndices.has(idx);
              const isRowEditing = editingIndex === idx;

              return (
                <tr
                  key={`${card.word}_${idx}`}
                  className={`hover:bg-indigo-50/30 dark:hover:bg-slate-800/40 transition-colors ${
                    isSelected ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : 'opacity-65'
                  }`}
                >
                  <td className="py-2 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectCard(idx)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                    <div className="flex flex-col">
                      <span>{card.word}</span>
                      {card.note && (
                        <span className="text-[10px] text-slate-400 font-normal italic">{card.note}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${getPosBadgeClass(
                        card.partOfSpeech
                      )}`}
                    >
                      {card.partOfSpeech || 'other'}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {isRowEditing ? (
                      <input
                        type="text"
                        value={editMeaning}
                        onChange={(e) => setEditMeaning(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(idx);
                          else if (e.key === 'Escape') setEditingIndex(null);
                        }}
                        className="w-full px-2 py-1 rounded-lg border border-indigo-400 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                    ) : (
                      <span className="font-medium text-slate-800 dark:text-slate-200">{card.meaning}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 hidden md:table-cell text-slate-500 dark:text-slate-400 italic text-[11px]">
                    {isRowEditing ? (
                      <input
                        type="text"
                        value={editExample}
                        onChange={(e) => setEditExample(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(idx);
                          else if (e.key === 'Escape') setEditingIndex(null);
                        }}
                        placeholder={t('learn.examplePlaceholder')}
                        className="w-full px-2 py-1 rounded-lg border border-indigo-400 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                    ) : (
                      <span>{card.example || '-'}</span>
                    )}
                  </td>
                  <td className="py-2 px-2.5 text-center">
                    {isRowEditing ? (
                      <button
                        onClick={() => handleSaveEdit(idx)}
                        className="p-1 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-400"
                        title={t('chat.saveRowTooltip')}
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(idx)}
                        className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title={t('chat.editRowTooltip')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-800/70 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {t('chat.selectedCardsCount', { selected: selectedCount, total: cards.length })}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsDismissed(true)}
            disabled={addCardsMutation.isPending}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            <span>{t('chat.dismissBtn')}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => addCardsMutation.mutate()}
            disabled={selectedCount === 0 || !selectedDeckId || addCardsMutation.isPending || isStreaming}
            isLoading={addCardsMutation.isPending}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            <span>
              {t('chat.addCardsBtn', { count: selectedCount })}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProposedCardsWidget;
