import type { Task } from '../types/task';
import type { Goal } from '../types/goal';

const downloadBlob = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportTasksToCSV = (tasks: Task[], filename = 'tasks_export.csv') => {
  const headers = [
    'ID',
    'Title',
    'Priority',
    'Due Date',
    'Due Time',
    'Is Completed',
    'Completed At',
    'Recurrence',
    'Tags',
    'Total Subtasks',
    'Done Subtasks',
    'Notes',
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = tasks.map((t) => [
    escapeCSV(t._id),
    escapeCSV(t.title),
    escapeCSV(t.priority),
    escapeCSV(t.dueDate ? t.dueDate.slice(0, 10) : ''),
    escapeCSV(t.dueTime || ''),
    escapeCSV(t.isCompleted ? 'Yes' : 'No'),
    escapeCSV(t.completedAt || ''),
    escapeCSV(t.recurrence?.type || 'none'),
    escapeCSV((t.tags || []).join('; ')),
    escapeCSV(t.subtasks?.length || 0),
    escapeCSV(t.subtasks?.filter((s) => s.done).length || 0),
    escapeCSV(t.notes || ''),
  ]);

  // \uFEFF is UTF-8 Byte Order Mark for Excel
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
};

export const exportTasksToJSON = (tasks: Task[], filename = 'tasks_export.json') => {
  const jsonContent = JSON.stringify(tasks, null, 2);
  downloadBlob(jsonContent, filename, 'application/json');
};

export const exportGoalsToCSV = (goals: Goal[], filename = 'goals_export.csv') => {
  const headers = [
    'ID',
    'Title',
    'Type',
    'Priority',
    'Status',
    'Progress Mode',
    'Target Value',
    'Current Value',
    'Unit',
    'Progress %',
    'Ideal Progress %',
    'Start Date',
    'End Date',
    'Description',
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = goals.map((g) => [
    escapeCSV(g._id),
    escapeCSV(g.title),
    escapeCSV(g.type),
    escapeCSV(g.priority),
    escapeCSV(g.status),
    escapeCSV(g.progressMode),
    escapeCSV(g.targetValue ?? ''),
    escapeCSV(g.currentValue ?? ''),
    escapeCSV(g.unit || ''),
    escapeCSV(g.progressCache ?? 0),
    escapeCSV(g.idealProgress ?? 0),
    escapeCSV(g.startDate ? g.startDate.slice(0, 10) : ''),
    escapeCSV(g.endDate ? g.endDate.slice(0, 10) : ''),
    escapeCSV(g.description || ''),
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
};

export const exportGoalsToJSON = (goals: Goal[], filename = 'goals_export.json') => {
  const jsonContent = JSON.stringify(goals, null, 2);
  downloadBlob(jsonContent, filename, 'application/json');
};
