import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { StatusPill } from './StatusPill';
import { PriorityBadge } from './PriorityBadge';
import { Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export const TaskSheet = ({ task, statuses, groups, onClose, onUpdate, onDelete }) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [statusId, setStatusId] = useState(task.status_id);
  const [priority, setPriority] = useState(task.priority);
  const [startDate, setStartDate] = useState(
    task.start_date ? format(new Date(task.start_date), 'yyyy-MM-dd') : ''
  );
  const [dueDate, setDueDate] = useState(
    task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : ''
  );
  const [groupId, setGroupId] = useState(task.group_id || '');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const changed =
      title !== task.title ||
      description !== (task.description || '') ||
      statusId !== task.status_id ||
      priority !== task.priority ||
      groupId !== (task.group_id || '');
    setHasChanges(changed);
  }, [title, description, statusId, priority, groupId, task]);

  const handleSave = async () => {
    try {
      await onUpdate(task.id, {
        title,
        description: description || null,
        status_id: statusId,
        priority,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        group_id: groupId || null,
      });
      toast.success('Task updated');
      onClose();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(task.id);
      onClose();
    } catch (error) {
      // Error is handled in parent
    }
  };

  const currentStatus = statuses.find(s => s.id === statusId);

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent data-testid="task-sheet" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Task Details
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="task-title" className="text-sm font-medium text-slate-700">
              Title
            </Label>
            <Input
              id="task-title"
              data-testid="task-sheet-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="task-description" className="text-sm font-medium text-slate-700">
              Description
            </Label>
            <Textarea
              id="task-description"
              data-testid="task-sheet-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1"
              placeholder="Add a description..."
            />
          </div>

          {/* Status */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              Status
            </Label>
            <div className="flex flex-wrap gap-2">
              {statuses.map(status => (
                <button
                  key={status.id}
                  data-testid={`sheet-status-${status.id}`}
                  onClick={() => setStatusId(status.id)}
                  className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-all ${
                    statusId === status.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    {status.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              Priority
            </Label>
            <div className="flex gap-2">
              {['low', 'medium', 'high', 'critical'].map(p => (
                <button
                  key={p}
                  data-testid={`sheet-priority-${p}`}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-all ${
                    priority === p
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <PriorityBadge priority={p} />
                </button>
              ))}
            </div>
          </div>

          {/* Group */}
          {groups.length > 0 && (
            <div>
              <Label htmlFor="task-group" className="text-sm font-medium text-slate-700">
                Group
              </Label>
              <select
                id="task-group"
                data-testid="task-sheet-group"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="mt-1 w-full h-9 px-3 rounded-md border border-slate-200 text-sm bg-white"
              >
                <option value="">No group</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date" className="text-sm font-medium text-slate-700">
                Start Date
              </Label>
              <Input
                id="start-date"
                data-testid="task-sheet-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="due-date" className="text-sm font-medium text-slate-700">
                Due Date
              </Label>
              <Input
                id="due-date"
                data-testid="task-sheet-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t border-slate-200">
            <div className="text-xs text-slate-500 space-y-1">
              <p>Created: {format(new Date(task.created_at), 'PPpp')}</p>
              <p>Updated: {format(new Date(task.updated_at), 'PPpp')}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              data-testid="task-sheet-delete"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Task
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                data-testid="task-sheet-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges}
                data-testid="task-sheet-save"
                style={{ backgroundColor: 'hsl(243, 75%, 59%)' }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
