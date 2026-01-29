"use client";

import { useEffect, useState, useCallback } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Plus,
  LayoutDashboard,
  FolderOpen,
  LogOut,
  Search,
  Calendar,
  Flag,
  MoreHorizontal,
  Trash2,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Types
interface Workspace {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  createdAt: string;
}

interface Board {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  createdAt: string;
}

interface Status {
  id: string;
  boardId: string;
  name: string;
  color: string;
  order: number;
}

interface Group {
  id: string;
  boardId: string;
  name: string;
  order: number;
}

interface Task {
  id: string;
  boardId: string;
  groupId: string | null;
  title: string;
  description: string | null;
  statusId: string | null;
  priority: "low" | "medium" | "high" | "critical";
  startDate: string | null;
  dueDate: string | null;
  order: number;
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "#22c55e" },
  medium: { label: "Medium", color: "#eab308" },
  high: { label: "High", color: "#f97316" },
  critical: { label: "Critical", color: "#ef4444" },
};

export default function DashboardPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Dialog states
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState("");
  const [newBoardName, setNewBoardName] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskStatusId, setNewTaskStatusId] = useState("");
  const [newTaskGroupId, setNewTaskGroupId] = useState("");

  // Fetch workspaces
  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data);
        if (data.length === 0) {
          // Seed demo data for new users
          const seedRes = await fetch("/api/seed-demo-data", { method: "POST" });
          if (seedRes.ok) {
            const res2 = await fetch("/api/workspaces");
            if (res2.ok) {
              const data2 = await res2.json();
              setWorkspaces(data2);
              if (data2.length > 0) {
                setSelectedWorkspace(data2[0]);
              }
            }
          }
        } else if (!selectedWorkspace) {
          setSelectedWorkspace(data[0]);
        }
      }
    } catch {
      toast.error("Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch boards for workspace
  const fetchBoards = useCallback(async (workspaceId: string) => {
    try {
      const res = await fetch(`/api/boards?workspace_id=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setBoards(data);
        if (data.length > 0 && !selectedBoard) {
          setSelectedBoard(data[0]);
        }
      }
    } catch {
      toast.error("Failed to load boards");
    }
  }, []);

  // Fetch board data (statuses, groups, tasks)
  const fetchBoardData = useCallback(async (boardId: string) => {
    try {
      const [statusRes, groupRes, taskRes] = await Promise.all([
        fetch(`/api/statuses?board_id=${boardId}`),
        fetch(`/api/groups?board_id=${boardId}`),
        fetch(`/api/tasks?board_id=${boardId}`),
      ]);

      if (statusRes.ok) setStatuses(await statusRes.json());
      if (groupRes.ok) setGroups(await groupRes.json());
      if (taskRes.ok) setTasks(await taskRes.json());
    } catch {
      toast.error("Failed to load board data");
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (selectedWorkspace) {
      setSelectedBoard(null);
      setBoards([]);
      fetchBoards(selectedWorkspace.id);
    }
  }, [selectedWorkspace, fetchBoards]);

  useEffect(() => {
    if (selectedBoard) {
      fetchBoardData(selectedBoard.id);
    }
  }, [selectedBoard, fetchBoardData]);

  // Create workspace
  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newWorkspaceName,
          description: newWorkspaceDesc || null,
        }),
      });
      if (res.ok) {
        const workspace = await res.json();
        setWorkspaces((prev) => [workspace, ...prev]);
        setSelectedWorkspace(workspace);
        setNewWorkspaceName("");
        setNewWorkspaceDesc("");
        setShowNewWorkspace(false);
        toast.success("Workspace created");
      }
    } catch {
      toast.error("Failed to create workspace");
    }
  };

  // Create board
  const handleCreateBoard = async () => {
    if (!newBoardName.trim() || !selectedWorkspace) return;
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: selectedWorkspace.id,
          name: newBoardName,
        }),
      });
      if (res.ok) {
        const board = await res.json();
        setBoards((prev) => [board, ...prev]);
        setSelectedBoard(board);
        setNewBoardName("");
        setShowNewBoard(false);
        toast.success("Board created");
      }
    } catch {
      toast.error("Failed to create board");
    }
  };

  // Create task
  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !selectedBoard) return;
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId: selectedBoard.id,
          title: newTaskTitle,
          description: newTaskDesc || null,
          priority: newTaskPriority,
          statusId: newTaskStatusId || null,
          groupId: newTaskGroupId || null,
        }),
      });
      if (res.ok) {
        const task = await res.json();
        setTasks((prev) => [...prev, task]);
        setNewTaskTitle("");
        setNewTaskDesc("");
        setNewTaskPriority("medium");
        setNewTaskStatusId("");
        setNewTaskGroupId("");
        setShowNewTask(false);
        toast.success("Task created");
      }
    } catch {
      toast.error("Failed to create task");
    }
  };

  // Update task status
  const handleUpdateTaskStatus = async (taskId: string, statusId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusId }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, statusId } : t))
        );
      }
    } catch {
      toast.error("Failed to update task");
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        toast.success("Task deleted");
      }
    } catch {
      toast.error("Failed to delete task");
    }
  };

  // Filter tasks by search
  const filteredTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group tasks by status
  const tasksByStatus = (statusId: string) =>
    filteredTasks.filter((t) => t.statusId === statusId);

  const unassignedTasks = filteredTasks.filter(
    (t) => !t.statusId || !statuses.find((s) => s.id === t.statusId)
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0 overflow-hidden"
        } bg-white border-r border-slate-200 flex flex-col transition-all duration-200`}
      >
        <div className="p-4 border-b border-slate-200">
          <h1 className="text-lg font-bold text-slate-900">TaskFlow Pro</h1>
        </div>

        <ScrollArea className="flex-1 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Workspaces
            </span>
            <Dialog open={showNewWorkspace} onOpenChange={setShowNewWorkspace}>
              <DialogTrigger asChild>
                <button className="text-slate-400 hover:text-slate-600">
                  <Plus className="h-4 w-4" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Workspace</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      placeholder="My Workspace"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Description (optional)</Label>
                    <Input
                      value={newWorkspaceDesc}
                      onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                      placeholder="What's this workspace for?"
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleCreateWorkspace} className="w-full">
                    Create Workspace
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-1">
            {workspaces.map((ws) => (
              <div key={ws.id}>
                <button
                  onClick={() => setSelectedWorkspace(ws)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    selectedWorkspace?.id === ws.id
                      ? "bg-slate-100 text-slate-900 font-medium"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span>{ws.icon}</span>
                  <span className="truncate">{ws.name}</span>
                  {selectedWorkspace?.id === ws.id && (
                    <ChevronRight className="h-3 w-3 ml-auto text-slate-400" />
                  )}
                </button>

                {/* Show boards under selected workspace */}
                {selectedWorkspace?.id === ws.id && (
                  <div className="ml-6 mt-1 space-y-0.5">
                    {boards.map((board) => (
                      <button
                        key={board.id}
                        onClick={() => setSelectedBoard(board)}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors ${
                          selectedBoard?.id === board.id
                            ? "bg-indigo-50 text-indigo-700 font-medium"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        }`}
                      >
                        <span className="text-xs">{board.icon}</span>
                        <span className="truncate">{board.name}</span>
                      </button>
                    ))}
                    <Dialog open={showNewBoard} onOpenChange={setShowNewBoard}>
                      <DialogTrigger asChild>
                        <button className="w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50">
                          <Plus className="h-3 w-3" />
                          New Board
                        </button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>New Board</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                          <div>
                            <Label>Name</Label>
                            <Input
                              value={newBoardName}
                              onChange={(e) => setNewBoardName(e.target.value)}
                              placeholder="Sprint Board"
                              className="mt-1"
                            />
                          </div>
                          <Button onClick={handleCreateBoard} className="w-full">
                            Create Board
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-slate-200">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-500 hover:text-red-600"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-slate-600"
          >
            <LayoutDashboard className="h-5 w-5" />
          </button>

          {selectedBoard ? (
            <>
              <div className="flex items-center gap-2">
                <span>{selectedBoard.icon}</span>
                <h2 className="font-semibold text-slate-900">
                  {selectedBoard.name}
                </h2>
              </div>

              <div className="flex-1 max-w-sm ml-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tasks..."
                    className="pl-9 h-8 text-sm"
                  />
                </div>
              </div>

              <div className="ml-auto">
                <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
                  <DialogTrigger asChild>
                    <Button size="sm" style={{ backgroundColor: "hsl(243, 75%, 59%)" }}>
                      <Plus className="h-4 w-4 mr-1" />
                      New Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>New Task</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div>
                        <Label>Title</Label>
                        <Input
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          placeholder="Task title"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Description (optional)</Label>
                        <Input
                          value={newTaskDesc}
                          onChange={(e) => setNewTaskDesc(e.target.value)}
                          placeholder="What needs to be done?"
                          className="mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Status</Label>
                          <Select
                            value={newTaskStatusId}
                            onValueChange={setNewTaskStatusId}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {statuses.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: s.color }}
                                    />
                                    {s.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Priority</Label>
                          <Select
                            value={newTaskPriority}
                            onValueChange={setNewTaskPriority}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(priorityConfig).map(
                                ([key, cfg]) => (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: cfg.color }}
                                      />
                                      {cfg.label}
                                    </div>
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {groups.length > 0 && (
                        <div>
                          <Label>Group (optional)</Label>
                          <Select
                            value={newTaskGroupId}
                            onValueChange={setNewTaskGroupId}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select group" />
                            </SelectTrigger>
                            <SelectContent>
                              {groups.map((g) => (
                                <SelectItem key={g.id} value={g.id}>
                                  {g.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <Button onClick={handleCreateTask} className="w-full">
                        Create Task
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </>
          ) : (
            <h2 className="text-slate-500">Select a board to get started</h2>
          )}
        </header>

        {/* Board Content */}
        <div className="flex-1 overflow-auto p-4">
          {selectedBoard ? (
            <div className="flex gap-4 h-full">
              {/* Unassigned column */}
              {unassignedTasks.length > 0 && (
                <div className="w-72 flex-shrink-0 flex flex-col">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span className="text-sm font-medium text-slate-700">
                      No Status
                    </span>
                    <span className="text-xs text-slate-400 ml-auto">
                      {unassignedTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {unassignedTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        statuses={statuses}
                        groups={groups}
                        onUpdateStatus={handleUpdateTaskStatus}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Status columns */}
              {statuses.map((status) => (
                <div key={status.id} className="w-72 flex-shrink-0 flex flex-col">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="text-sm font-medium text-slate-700">
                      {status.name}
                    </span>
                    <span className="text-xs text-slate-400 ml-auto">
                      {tasksByStatus(status.id).length}
                    </span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {tasksByStatus(status.id).map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        statuses={statuses}
                        groups={groups}
                        onUpdateStatus={handleUpdateTaskStatus}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {tasks.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No tasks yet</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Create your first task to get started
                    </p>
                    <Button
                      size="sm"
                      className="mt-4"
                      style={{ backgroundColor: "hsl(243, 75%, 59%)" }}
                      onClick={() => setShowNewTask(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New Task
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <LayoutDashboard className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">
                  {workspaces.length === 0
                    ? "Create a workspace to get started"
                    : boards.length === 0
                    ? "Create a board in this workspace"
                    : "Select a board from the sidebar"}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Task Card Component
function TaskCard({
  task,
  statuses,
  groups,
  onUpdateStatus,
  onDelete,
}: {
  task: Task;
  statuses: Status[];
  groups: Group[];
  onUpdateStatus: (taskId: string, statusId: string) => void;
  onDelete: (taskId: string) => void;
}) {
  const group = groups.find((g) => g.id === task.groupId);
  const priority = priorityConfig[task.priority];

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-slate-900 leading-snug">
          {task.title}
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-slate-400 hover:text-slate-600 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {statuses.map((s) => (
              <DropdownMenuItem
                key={s.id}
                onClick={() => onUpdateStatus(task.id, s.id)}
              >
                <div
                  className="h-2 w-2 rounded-full mr-2"
                  style={{ backgroundColor: s.color }}
                />
                Move to {s.name}
              </DropdownMenuItem>
            ))}
            <Separator className="my-1" />
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {task.description && (
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 h-5"
          style={{
            borderColor: priority.color,
            color: priority.color,
          }}
        >
          <Flag className="h-2.5 w-2.5 mr-0.5" />
          {priority.label}
        </Badge>

        {group && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
            {group.name}
          </Badge>
        )}

        {task.dueDate && (
          <span className="text-[10px] text-slate-400 flex items-center gap-0.5 ml-auto">
            <Calendar className="h-2.5 w-2.5" />
            {new Date(task.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>
    </div>
  );
}
