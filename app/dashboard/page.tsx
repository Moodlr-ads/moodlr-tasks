"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  ChevronRight,
  LayoutDashboard,
  Loader2,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

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
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    null,
  );
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
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<Workspace | null>(null);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [pendingBoardDelete, setPendingBoardDelete] = useState<Board | null>(
    null,
  );
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState("");
  const [editWorkspaceName, setEditWorkspaceName] = useState("");
  const [editWorkspaceDesc, setEditWorkspaceDesc] = useState("");
  const [editBoardName, setEditBoardName] = useState("");
  const [newBoardName, setNewBoardName] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskStatusId, setNewTaskStatusId] = useState("");
  const [newTaskGroupId, setNewTaskGroupId] = useState("");
  const [workspaceHeading, setWorkspaceHeading] = useState("WORKSPACES");
  const [editHeadingOpen, setEditHeadingOpen] = useState(false);
  const [editHeadingValue, setEditHeadingValue] = useState(workspaceHeading);

  // Fetch workspaces
  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data);
        if (data.length === 0) {
          // Seed demo data for new users
          const seedRes = await fetch("/api/seed-demo-data", {
            method: "POST",
          });
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

  // Update workspace
  const handleUpdateWorkspace = async () => {
    if (!editingWorkspace || !editWorkspaceName.trim()) return;
    try {
      const res = await fetch(`/api/workspaces/${editingWorkspace.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editWorkspaceName,
          description: editWorkspaceDesc || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setWorkspaces((prev) =>
          prev.map((w) => (w.id === updated.id ? updated : w)),
        );
        if (selectedWorkspace?.id === updated.id) {
          setSelectedWorkspace(updated);
        }
        setEditingWorkspace(null);
        toast.success("Workspace updated");
      }
    } catch {
      toast.error("Failed to update workspace");
    }
  };

  // Delete workspace
  const handleDeleteWorkspace = async (workspaceId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
        if (selectedWorkspace?.id === workspaceId) {
          setSelectedWorkspace(null);
          setSelectedBoard(null);
          setBoards([]);
          setStatuses([]);
          setGroups([]);
          setTasks([]);
        }
        toast.success("Workspace deleted");
      }
    } catch {
      toast.error("Failed to delete workspace");
    }
  };

  // Update board
  const handleUpdateBoard = async () => {
    if (!editingBoard || !editBoardName.trim()) return;
    try {
      const res = await fetch(`/api/boards/${editingBoard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editBoardName }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBoards((prev) =>
          prev.map((b) => (b.id === updated.id ? updated : b)),
        );
        if (selectedBoard?.id === updated.id) {
          setSelectedBoard(updated);
        }
        setEditingBoard(null);
        toast.success("Board updated");
      }
    } catch {
      toast.error("Failed to update board");
    }
  };

  // Delete board
  const handleDeleteBoard = async (boardId: string) => {
    try {
      const res = await fetch(`/api/boards/${boardId}`, { method: "DELETE" });
      if (res.ok) {
        setBoards((prev) => prev.filter((b) => b.id !== boardId));
        if (selectedBoard?.id === boardId) {
          setSelectedBoard(null);
          setStatuses([]);
          setGroups([]);
          setTasks([]);
        }
        toast.success("Board deleted");
      }
    } catch {
      toast.error("Failed to delete board");
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
          prev.map((t) => (t.id === taskId ? { ...t, statusId } : t)),
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
      (t.description || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Derived list view
  // (no grouping/drag-drop; status handled per-row select)

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0 overflow-hidden"
        } bg-card border-r border-border flex flex-col transition-all duration-200`}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 dark:bg-transparent p-2 dark:p-0 rounded-md flex items-center justify-center">
              <Image
                src="/moodlr-icon.png"
                alt="Moodlr Task"
                width={24}
                height={24}
                className="h-6 w-6"
                priority
              />
            </div>
            <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Moodlr Task
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => {
                setEditHeadingValue(workspaceHeading);
                setEditHeadingOpen(true);
              }}
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 hover:text-foreground"
            >
              {workspaceHeading}
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setEditHeadingValue(workspaceHeading);
                  setEditHeadingOpen(true);
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Rename workspaces heading"
              >
                ✎
              </button>
              <Dialog open={showNewWorkspace} onOpenChange={setShowNewWorkspace}>
                <DialogTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground">
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
          </div>

          <div className="space-y-1">
            {workspaces.map((ws) => (
              <div key={ws.id} className="group">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedWorkspace(ws)}
                    className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingWorkspace(ws);
                          setEditWorkspaceName(ws.name);
                          setEditWorkspaceDesc(ws.description || "");
                        }}
                      >
                        Edit name
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete(ws);
                        }}
                      >
                        Remove workspace
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Show boards under selected workspace */}
                {selectedWorkspace?.id === ws.id && (
                  <div className="ml-6 mt-1 space-y-0.5">
                    {boards.map((board) => (
                      <div key={board.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedBoard(board)}
                          className={`flex-1 flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors ${
                            selectedBoard?.id === board.id
                              ? "bg-indigo-50 text-indigo-700 font-medium"
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                          }`}
                        >
                          <span className="text-xs">{board.icon}</span>
                          <span className="truncate">{board.name}</span>
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingBoard(board);
                                setEditBoardName(board.name);
                              }}
                            >
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingBoardDelete(board);
                              }}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
        </div>

        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-red-500"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background text-foreground">
        {/* Header */}
        <header className="h-14 bg-card border-b border-border flex items-center px-4 gap-3 text-foreground">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-muted-foreground hover:text-foreground"
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
                    className="pl-9 h-8 text-sm bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="ml-auto flex items-center gap-3">
                <ThemeToggle />
                <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      style={{ backgroundColor: "hsl(243, 75%, 59%)" }}
                    >
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
                                ),
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
            <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
              <div className="grid grid-cols-[2fr,1fr,1fr,1fr,120px] px-4 py-3 bg-muted border-b border-border text-xs font-semibold text-muted-foreground">
                <span>Task</span>
                <span>Status</span>
                <span>Priority</span>
                <span>Group</span>
                <span className="text-right pr-2">Actions</span>
              </div>

              {filteredTasks.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No tasks found. Create one to get started.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredTasks.map((task) => {
                    const status = statuses.find((s) => s.id === task.statusId);
                    const group = groups.find((g) => g.id === task.groupId);
                    const priority = priorityConfig[task.priority];

                    return (
                      <div
                        key={task.id}
                        className="grid grid-cols-[2fr,1fr,1fr,1fr,120px] px-4 py-3 items-center text-sm"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground">
                            {task.title}
                          </span>
                          {task.description && (
                            <span className="text-xs text-muted-foreground line-clamp-2">
                              {task.description}
                            </span>
                          )}
                        </div>

                        <div className="max-w-[180px]">
                          <Select
                            value={task.statusId || ""}
                            onValueChange={(val) =>
                              handleUpdateTaskStatus(task.id, val)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="No status" />
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
                          <span
                            className="inline-flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full border"
                            style={{
                              color: priority.color,
                              borderColor: priority.color,
                            }}
                          >
                            {priority.label}
                          </span>
                        </div>

                        <div className="text-slate-300 text-sm">
                          {group ? group.name : "—"}
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          {task.dueDate && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(task.dueDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {statuses.map((s) => (
                                <DropdownMenuItem
                                  key={s.id}
                                  onClick={() => handleUpdateTaskStatus(task.id, s.id)}
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
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
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

      {/* Edit Workspace Dialog */}
      <Dialog
        open={!!editingWorkspace}
        onOpenChange={(open) => {
          if (!open) setEditingWorkspace(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Name</Label>
              <Input
                value={editWorkspaceName}
                onChange={(e) => setEditWorkspaceName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={editWorkspaceDesc}
                onChange={(e) => setEditWorkspaceDesc(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingWorkspace(null)}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleUpdateWorkspace}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        {/* @ts-ignore Radix wrapped component typing loosened */}
        <AlertDialogContent>
          {/* @ts-ignore */}
          <AlertDialogHeader>
            {/* @ts-ignore */}
            <AlertDialogTitle>Remove workspace?</AlertDialogTitle>
            {/* @ts-ignore */}
            <AlertDialogDescription>
              This will delete the workspace and its boards/tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* @ts-ignore */}
          <AlertDialogFooter>
            {/* @ts-ignore */}
            <AlertDialogCancel onClick={() => setPendingDelete(null)}>
              Cancel
            </AlertDialogCancel>
            {/* @ts-ignore */}
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (pendingDelete) handleDeleteWorkspace(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Board Dialog */}
      <Dialog
        open={!!editingBoard}
        onOpenChange={(open) => {
          if (!open) setEditingBoard(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Name</Label>
              <Input
                value={editBoardName}
                onChange={(e) => setEditBoardName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingBoard(null)}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleUpdateBoard}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Board confirmation */}
      <AlertDialog
        open={!!pendingBoardDelete}
        onOpenChange={(open) => {
          if (!open) setPendingBoardDelete(null);
        }}
      >
        {/* @ts-ignore */}
        <AlertDialogContent>
          {/* @ts-ignore */}
          <AlertDialogHeader>
            {/* @ts-ignore */}
            <AlertDialogTitle>Remove board?</AlertDialogTitle>
            {/* @ts-ignore */}
            <AlertDialogDescription>
              This will delete the board and its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* @ts-ignore */}
          <AlertDialogFooter>
            {/* @ts-ignore */}
            <AlertDialogCancel onClick={() => setPendingBoardDelete(null)}>
              Cancel
            </AlertDialogCancel>
            {/* @ts-ignore */}
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (pendingBoardDelete) handleDeleteBoard(pendingBoardDelete.id);
                setPendingBoardDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit heading dialog */}
      <Dialog open={editHeadingOpen} onOpenChange={setEditHeadingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit sidebar heading</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Heading</Label>
              <Input
                value={editHeadingValue}
                onChange={(e) => setEditHeadingValue(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditHeadingOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setWorkspaceHeading(editHeadingValue || "WORKSPACES");
                  setEditHeadingOpen(false);
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
