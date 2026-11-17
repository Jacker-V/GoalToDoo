import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileJson, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useQuery } from '@tanstack/react-query';
import { taskService } from '../../services/task.service';
import { goalService } from '../../services/goal.service';
import {
  exportTasksToCSV,
  exportTasksToJSON,
  exportGoalsToCSV,
  exportGoalsToJSON,
} from '../../utils/export';
import { toast } from '../../store/useToastStore';
import { useI18n } from '../../i18n';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'tasks' | 'goals';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'tasks',
}) => {
  const { t } = useI18n();
  const [dataType, setDataType] = useState<'tasks' | 'goals'>(defaultType);
  const [format, setFormat] = useState<'csv' | 'json'>('csv');

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskService.getTasks(),
    enabled: isOpen,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalService.getGoals(),
    enabled: isOpen,
  });

  const handleExport = () => {
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      if (dataType === 'tasks') {
        if (format === 'csv') {
          exportTasksToCSV(tasks, `tasks_${timestamp}.csv`);
        } else {
          exportTasksToJSON(tasks, `tasks_${timestamp}.json`);
        }
      } else {
        if (format === 'csv') {
          exportGoalsToCSV(goals, `goals_${timestamp}.csv`);
        } else {
          exportGoalsToJSON(goals, `goals_${timestamp}.json`);
        }
      }
      toast.success(t('export.exportSuccess'));
      onClose();
    } catch (err) {
      toast.error(t('export.exportFailed'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('export.modalTitle')}
      description={t('export.modalDesc')}
      size="md"
    >
      <div className="space-y-6">
        {/* 1. Data Type Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t('export.selectDataType')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDataType('tasks')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                dataType === 'tasks'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-medium'
              }`}
            >
              <div className="text-xs">
                <div>{t('export.typeTasks')}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">({t('export.itemsCount', { count: tasks.length })})</div>
              </div>
              {dataType === 'tasks' && <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => setDataType('goals')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                dataType === 'goals'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-medium'
              }`}
            >
              <div className="text-xs">
                <div>{t('export.typeGoals')}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">({t('export.itemsCount', { count: goals.length })})</div>
              </div>
              {dataType === 'goals' && <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
            </button>
          </div>
        </div>

        {/* 2. Format Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t('export.selectFormat')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center space-x-3 ${
                format === 'csv'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-medium'
              }`}
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div className="text-xs">
                <div>CSV</div>
                <div className="text-[10px] text-slate-400">{t('export.csvDesc')}</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat('json')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center space-x-3 ${
                format === 'json'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-medium'
              }`}
            >
              <FileJson className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div className="text-xs">
                <div>JSON</div>
                <div className="text-[10px] text-slate-400">{t('export.jsonDesc')}</div>
              </div>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={handleExport} className="flex items-center space-x-1.5">
            <Download className="w-4 h-4" />
            <span>{t('export.downloadButton')}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
