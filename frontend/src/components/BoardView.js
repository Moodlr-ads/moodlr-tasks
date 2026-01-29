import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Input } from './ui/input';
import { TableView } from './TableView';
import { KanbanView } from './KanbanView';
import { CalendarView } from './CalendarView';
import { ListView } from './ListView';
import { TaskSheet } from './TaskSheet';
import { 
  LayoutGrid, 
  List, 
  Calendar, 
  Rows3,
  Search,
  Plus,
  Settings,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const BoardView = () => {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [currentView, setCurrentView] = useState('table');
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterPriority, setFilterPriority] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (boardId) {
      loadBoardData();
    }
  }, [boardId]);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const loadBoardData = async () => {
    try {
      const [boardRes, tasksRes, groupsRes, statusesRes] = await Promise.all([
        axios.get(`${API}/boards/${boardId}`, getAuthHeaders()),
        axios.get(`${API}/tasks?board_id=${boardId}`, getAuthHeaders()),
        axios.get(`${API}/groups?board_id=${boardId}`, getAuthHeaders()),
        axios.get(`${API}/statuses?board_id=${boardId}`, getAuthHeaders())
      ]);

      setBoard(boardRes.data);
      setTasks(tasksRes.data);
      setGroups(groupsRes.data);
      setStatuses(statusesRes.data);
    } catch (error) {
      console.error('Failed to load board data:', error);
      toast.error('Failed to load board');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    const title = prompt('Task title:');
    if (!title) return;

    try {
      const response = await axios.post(
        `${API}/tasks`,
        {
          board_id: boardId,
          title,
          priority: 'medium',
          status_id: statuses[0]?.id
        },
        getAuthHeaders()
      );
      setTasks([...tasks, response.data]);
      toast.success('Task created');
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleCreateGroup = async () => {
    const name = prompt('Group name:');
    if (!name) return;

    try {
      const response = await axios.post(
        `${API}/groups`,
        { board_id: boardId, name, order: groups.length },
        getAuthHeaders()
      );
      setGroups([...groups, response.data]);
      toast.success('Group created');
    } catch (error) {
      toast.error('Failed to create group');
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      const response = await axios.put(
        `${API}/tasks/${taskId}`,
        updates,
        getAuthHeaders()
      );
      setTasks(tasks.map(t => t.id === taskId ? response.data : t));
      return response.data;
    } catch (error) {
      toast.error('Failed to update task');
      throw error;
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;

    try {
      await axios.delete(`${API}/tasks/${taskId}`, getAuthHeaders());
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus && task.status_id !== filterStatus) return false;
    if (filterPriority && task.priority !== filterPriority) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500">Loading board...</div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500">Board not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Board Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{board.icon}</span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {board.name}
              </h1>
              {board.description && (
                <p className="text-sm text-slate-600 mt-1">{board.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateGroup}
              data-testid="create-group-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Group
            </Button>
            <Button
              size="sm"
              onClick={handleCreateTask}
              data-testid="create-task-button"
              style={{ backgroundColor: 'hsl(243, 75%, 59%)' }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Task
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              data-testid="search-input"
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            data-testid="filter-status-select"
            value={filterStatus || ''}
            onChange={(e) => setFilterStatus(e.target.value || null)}
            className="h-9 px-3 rounded-md border border-slate-200 text-sm bg-white"
          >
            <option value="">All Statuses</option>
            {statuses.map(status => (
              <option key={status.id} value={status.id}>{status.name}</option>
            ))}
          </select>
          <select
            data-testid="filter-priority-select"
            value={filterPriority || ''}
            onChange={(e) => setFilterPriority(e.target.value || null)}
            className="h-9 px-3 rounded-md border border-slate-200 text-sm bg-white"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-white border-b border-slate-200 px-8">
        <Tabs value={currentView} onValueChange={setCurrentView}>
          <TabsList className="bg-transparent border-b-0">
            <TabsTrigger 
              value="table" 
              data-testid="view-tab-table"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Rows3 className="h-4 w-4 mr-2" />
              Table
            </TabsTrigger>
            <TabsTrigger 
              value="kanban" 
              data-testid="view-tab-kanban"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Kanban
            </TabsTrigger>
            <TabsTrigger 
              value="calendar" 
              data-testid="view-tab-calendar"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </TabsTrigger>
            <TabsTrigger 
              value="list" 
              data-testid="view-tab-list"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
            >
              <List className="h-4 w-4 mr-2" />
              List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-auto bg-slate-50">
        {currentView === 'table' && (
          <TableView
            tasks={filteredTasks}
            groups={groups}
            statuses={statuses}
            onTaskClick={setSelectedTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        )}
        {currentView === 'kanban' && (
          <KanbanView
            tasks={filteredTasks}
            statuses={statuses}
            onTaskClick={setSelectedTask}
            onUpdateTask={handleUpdateTask}
          />
        )}
        {currentView === 'calendar' && (
          <CalendarView
            tasks={filteredTasks}
            onTaskClick={setSelectedTask}
          />
        )}
        {currentView === 'list' && (
          <ListView
            tasks={filteredTasks}
            statuses={statuses}
            onTaskClick={setSelectedTask}
          />
        )}
      </div>

      {/* Task Detail Sheet */}
      {selectedTask && (
        <TaskSheet
          task={selectedTask}
          statuses={statuses}
          groups={groups}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
};
