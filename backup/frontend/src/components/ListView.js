import { StatusPill } from './StatusPill';
import { PriorityBadge } from './PriorityBadge';
import { format } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';

export const ListView = ({ tasks, statuses, onTaskClick }) => {
  const getStatusById = (statusId) => {
    return statuses.find(s => s.id === statusId);
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return null;
    }
  };

  return (
    <div className="p-6" data-testid="list-view">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm divide-y divide-slate-100">
        {tasks.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No tasks found
          </div>
        ) : (
          tasks.map(task => {
            const status = getStatusById(task.status_id);
            const dueDate = formatDate(task.due_date);

            return (
              <div
                key={task.id}
                data-testid={`list-task-${task.id}`}
                onClick={() => onTaskClick(task)}
                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 mb-1">{task.title}</h3>
                    {task.description && (
                      <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                      <StatusPill status={status} compact />
                      <PriorityBadge priority={task.priority} compact />
                      {dueDate && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar className="h-3 w-3" />
                          Due {dueDate}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    {formatDate(task.created_at) || 'Recently'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
