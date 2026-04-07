export const getRowColorClass = (color?: string) => {
  switch (color) {
    case 'Red': return '!bg-red-100 dark:!bg-red-900/40 hover:!bg-red-200 dark:hover:!bg-red-900/50';
    case 'Violet': return '!bg-violet-100 dark:!bg-violet-900/40 hover:!bg-violet-200 dark:hover:!bg-violet-900/50';
    case 'Green': return '!bg-emerald-100 dark:!bg-emerald-900/40 hover:!bg-emerald-200 dark:hover:!bg-emerald-900/50';
    default: return 'hover:bg-slate-50 dark:hover:bg-slate-800/50';
  }
};

export const getColumnColorClass = (color?: string) => {
  switch (color) {
    case 'Red': return 'bg-red-50 dark:bg-red-900/20';
    case 'Violet': return 'bg-violet-50 dark:bg-violet-900/20';
    case 'Green': return 'bg-emerald-50 dark:bg-emerald-900/20';
    default: return '';
  }
};
