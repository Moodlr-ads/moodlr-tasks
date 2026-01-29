import { AlertCircle, ArrowUp, Minus } from 'lucide-react';

export const PriorityBadge = ({ priority, onClick, compact = false }) => {
  const priorityConfig = {
    low: {
      label: 'Low',
      color: 'text-slate-500',
      icon: Minus,
    },
    medium: {
      label: 'Medium',
      color: 'text-blue-500',
      icon: Minus,
    },
    high: {
      label: 'High',
      color: 'text-orange-500',
      icon: ArrowUp,
    },
    critical: {
      label: 'Critical',
      color: 'text-red-600',
      icon: AlertCircle,
    },
  };

  const config = priorityConfig[priority] || priorityConfig.medium;
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      data-testid={`priority-badge-${priority}`}
      className={`inline-flex items-center gap-1 font-medium transition-all hover:opacity-70 ${
        compact ? 'text-xs' : 'text-sm'
      } ${config.color}`}
    >
      <Icon className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
      {!compact && config.label}
    </button>
  );
};
