import React from 'react';
import { Keyboard, Plus, Calendar, HelpCircle, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useI18n } from '../../i18n';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();

  const shortcuts = [
    {
      key: 'N',
      icon: Plus,
      description: t('shortcuts.shortcutN'),
    },
    {
      key: 'T',
      icon: Calendar,
      description: t('shortcuts.shortcutT'),
    },
    {
      key: '?',
      icon: HelpCircle,
      description: t('shortcuts.shortcutQuestion'),
    },
    {
      key: 'Esc',
      icon: X,
      description: t('shortcuts.shortcutEsc'),
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('shortcuts.modalTitle')}
      description={t('shortcuts.modalDesc')}
      size="md"
    >
      <div className="space-y-4">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {shortcuts.map((sc) => {
            const Icon = sc.icon;
            return (
              <div key={sc.key} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-200 font-medium">
                    {sc.description}
                  </span>
                </div>
                <kbd className="px-2.5 py-1 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md shadow-2xs">
                  {sc.key}
                </kbd>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          {t('shortcuts.note')}
        </p>

        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
