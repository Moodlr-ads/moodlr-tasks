import { Check } from 'lucide-react';

export const StatusPill = ({ status, onClick, compact = false }) => {
  if (!status) return null;

  const getColorClasses = (color) => {
    const colorMap = {
      '#94a3b8': 'bg-slate-100 text-slate-700 border-slate-200',
      '#3b82f6': 'bg-blue-50 text-blue-700 border-blue-200',
      '#a855f7': 'bg-purple-50 text-purple-700 border-purple-200',
      '#10b981': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      '#ef4444': 'bg-red-50 text-red-700 border-red-200',
      '#f59e0b': 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return colorMap[color] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <button
      onClick={onClick}
      data-testid={`status-pill-${status.id}`}
      className={`inline-flex items-center gap-1.5 border rounded-md font-medium transition-all hover:shadow-sm ${
        compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      } ${getColorClasses(status.color)}`}
    >
      <div
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: status.color }}
      />
      {status.name}
    </button>
  );
};
