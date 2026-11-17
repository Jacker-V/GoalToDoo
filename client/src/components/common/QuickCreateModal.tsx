import React from 'react';
import { CheckSquare, Target, Calendar } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useI18n } from '../../i18n';

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: 'task' | 'goal' | 'event') => void;
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  const { t } = useI18n();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('quickCreate.modalTitle')}
      description={t('quickCreate.modalDesc')}
      size="sm"
    >
      <div className="grid grid-cols-1 gap-3 py-2">
        <button
          type="button"
          onClick={() => {
            onSelectAction('task');
            onClose();
          }}
          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 flex items-center space-x-3.5 text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-white">
              {t('tasks.modal.createTitle')}
            </div>
            <div className="text-[11px] text-slate-400">
              {t('quickCreate.taskSubtitle')}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectAction('goal');
            onClose();
          }}
          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-purple-500 hover:bg-purple-50/40 dark:hover:bg-purple-950/40 flex items-center space-x-3.5 text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-white">
              {t('goals.modal.createTitle')}
            </div>
            <div className="text-[11px] text-slate-400">
              {t('quickCreate.goalSubtitle')}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectAction('event');
            onClose();
          }}
          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/40 flex items-center space-x-3.5 text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-white">
              {t('calendar.modal.createTitle')}
            </div>
            <div className="text-[11px] text-slate-400">
              {t('quickCreate.eventSubtitle')}
            </div>
          </div>
        </button>
      </div>
    </Modal>
  );
};
