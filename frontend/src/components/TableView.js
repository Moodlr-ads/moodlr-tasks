import { useState } from 'react';
import { StatusPill } from './StatusPill';
import { PriorityBadge } from './PriorityBadge';
import { GripVertical, MoreHorizontal, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export const TableView = ({ tasks, groups, statuses, onTaskClick, onUpdateTask, onDeleteTask }) => {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleCellClick = (taskId, field, currentValue) => {
    setEditingCell({ taskId, field });
    setEditValue(currentValue || '');
  };

  const handleCellBlur = async (taskId) => {
    if (editingCell && editValue !== undefined) {
      await onUpdateTask(taskId, { [editingCell.field]: editValue });
    }
    setEditingCell(null);
  };

  const handleStatusChange = async (taskId, statusId) => {
    await onUpdateTask(taskId, { status_id: statusId });
  };

  const handlePriorityChange = async (taskId, priority) => {
    await onUpdateTask(taskId, { priority });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return '-';
    }
  };

  const getStatusById = (statusId) => {
    return statuses.find(s => s.id === statusId);
  };

  const getGroupById = (groupId) => {
    return groups.find(g => g.id === groupId);
  };

  // Group tasks by group_id
  const tasksByGroup = {};
  const ungroupedTasks = [];

  tasks.forEach(task => {
    if (task.group_id) {
      if (!tasksByGroup[task.group_id]) {
        tasksByGroup[task.group_id] = [];
      }
      tasksByGroup[task.group_id].push(task);
    } else {
      ungroupedTasks.push(task);
    }
  });

  const renderTaskRow = (task) => {
    const status = getStatusById(task.status_id);
    const isEditing = editingCell?.taskId === task.id;

    return (
      <tr
        key={task.id}
        data-testid={`task-row-${task.id}`}
        className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group"
      >
        {/* Drag Handle */}
        <td className="p-3 w-10">
          <GripVertical className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity drag-handle" />
        </td>

        {/* Task Title */}
        <td className="p-3 min-w-[300px]">
          {isEditing && editingCell.field === 'title' ? (
            <input
              data-testid={`edit-title-input-${task.id}`}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleCellBlur(task.id)}
              onKeyDown={(e) => e.key === 'Enter' && handleCellBlur(task.id)}
              autoFocus
              className="w-full px-2 py-1 border border-primary rounded text-sm font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            <div
              onClick={() => handleCellClick(task.id, 'title', task.title)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span className="text-sm font-medium text-slate-900 hover:text-primary transition-colors">
                {task.title}
              </span>
            </div>
          )}
        </td>

        {/* Status */}
        <td className="p-3 w-40">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="cursor-pointer">
                <StatusPill status={status} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent data-testid={`status-dropdown-${task.id}`}>
              {statuses.map(s => (
                <DropdownMenuItem
                  key={s.id}
                  data-testid={`status-option-${s.id}`}
                  onClick={() => handleStatusChange(task.id, s.id)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </td>

        {/* Priority */}
        <td className="p-3 w-32">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="cursor-pointer">
                <PriorityBadge priority={task.priority} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent data-testid={`priority-dropdown-${task.id}`}>
              {['low', 'medium', 'high', 'critical'].map(p => (
                <DropdownMenuItem
                  key={p}
                  data-testid={`priority-option-${p}`}
                  onClick={() => handlePriorityChange(task.id, p)}
                >
                  <PriorityBadge priority={p} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </td>

        {/* Start Date */}
        <td className="p-3 w-36">
          <div className="flex items-center gap-1 text-sm text-slate-600">
            <Calendar className="h-3 w-3" />
            {formatDate(task.start_date)}
          </div>
        </td>

        {/* Due Date */}
        <td className="p-3 w-36">
          <div className="flex items-center gap-1 text-sm text-slate-600">
            <Calendar className="h-3 w-3" />
            {formatDate(task.due_date)}
          </div>
        </td>

        {/* Actions */}
        <td className="p-3 w-16">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid={`task-actions-${task.id}`}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4 text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onTaskClick(task)} data-testid={`view-task-${task.id}`}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDeleteTask(task.id)}
                className="text-red-600"
                data-testid={`delete-task-${task.id}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
    );
  };

  return (
    <div className="p-6" data-testid="table-view">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="p-3 w-10"></th>
                <th className="p-3 text-left">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Task
                  </span>
                </th>
                <th className="p-3 text-left w-40">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </span>
                </th>
                <th className="p-3 text-left w-32">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Priority
                  </span>
                </th>
                <th className="p-3 text-left w-36">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Start Date
                  </span>
                </th>
                <th className="p-3 text-left w-36">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Due Date
                  </span>
                </th>
                <th className="p-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {/* Grouped Tasks */}
              {groups.map(group => {
                const groupTasks = tasksByGroup[group.id] || [];
                if (groupTasks.length === 0) return null;

                return (
                  <React.Fragment key={`group-section-${group.id}`}>
                    <tr key={`group-${group.id}`} className="bg-slate-50">
                      <td colSpan="7" className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-700">
                            {group.name}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({groupTasks.length})
                          </span>
                        </div>
                      </td>
                    </tr>
                    {groupTasks.map(renderTaskRow)}
                  </React.Fragment>
                );
              })}

              {/* Ungrouped Tasks */}
              {ungroupedTasks.length > 0 && (
                <>
                  {groups.length > 0 && (
                    <tr className="bg-slate-50">
                      <td colSpan="7" className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-700">
                            Ungrouped
                          </span>
                          <span className="text-xs text-slate-500">
                            ({ungroupedTasks.length})
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {ungroupedTasks.map(renderTaskRow)}
                </>
              )}

              {tasks.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    No tasks yet. Create one to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
