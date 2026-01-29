import { useState } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StatusPill } from './StatusPill';
import { PriorityBadge } from './PriorityBadge';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';

const SortableTask = ({ task, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-testid={`kanban-task-${task.id}`}
      onClick={() => onClick(task)}
      className="bg-white p-3 rounded-md border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer mb-2"
    >
      <h4 className="font-medium text-slate-900 text-sm mb-2">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-slate-600 mb-2 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between">
        <PriorityBadge priority={task.priority} compact />
        {task.due_date && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="h-3 w-3" />
            {format(new Date(task.due_date), 'MMM dd')}
          </div>
        )}
      </div>
    </div>
  );
};

export const KanbanView = ({ tasks, statuses, onTaskClick, onUpdateTask }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id;
    const newStatusId = over.id;

    const task = tasks.find(t => t.id === taskId);
    if (task && task.status_id !== newStatusId) {
      await onUpdateTask(taskId, { status_id: newStatusId });
    }
  };

  return (
    <div className="p-6" data-testid="kanban-view">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statuses.map(status => {
            const statusTasks = tasks.filter(t => t.status_id === status.id);

            return (
              <div
                key={status.id}
                data-testid={`kanban-column-${status.id}`}
                className="bg-slate-50 rounded-lg p-4 min-h-[500px]"
              >
                <div className="mb-4">
                  <StatusPill status={status} />
                  <span className="ml-2 text-sm text-slate-500">
                    ({statusTasks.length})
                  </span>
                </div>

                <SortableContext
                  id={status.id}
                  items={statusTasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {statusTasks.map(task => (
                    <SortableTask
                      key={task.id}
                      task={task}
                      onClick={onTaskClick}
                    />
                  ))}
                </SortableContext>

                {statusTasks.length === 0 && (
                  <div className="text-center text-sm text-slate-400 mt-8">
                    No tasks
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
};
