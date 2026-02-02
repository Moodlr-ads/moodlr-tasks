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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Calendar,
  ChevronRight,
  GripVertical,
  LayoutDashboard,
  Loader2,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
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
  assigneeId?: string | null;
  assignee?: User | null;
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "#22c55e" },
  medium: { label: "Medium", color: "#eab308" },
  high: { label: "High", color: "#f97316" },
  critical: { label: "Critical", color: "#ef4444" },
};

const UserAvatar = ({
  src,
  name,
  className,
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
}) => {
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;
  return (
    <Avatar className={cn("h-6 w-6 shrink-0", className)}>
      {showImage ? (
        <AvatarImage
          src={src || ""}
          alt={name || "User avatar"}
          className="object-cover"
          onError={() => setErrored(true)}
        />
      ) : null}
      <AvatarFallback className="bg-muted text-foreground text-[10px]">
        {name ? getInitials(name) : "?"}
      </AvatarFallback>
    </Avatar>
  );
};

const TASK_GRID =
  "grid gap-x-3 gap-y-3 grid-cols-[minmax(260px,1.5fr)_150px_110px_150px_200px_140px_140px_60px] items-center";
const TABLE_MIN_WIDTH = "min-w-[1200px] xl:min-w-[1250px]";

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
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

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
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("unassigned");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskStartDate, setNewTaskStartDate] = useState("");
  const [workspaceHeading, setWorkspaceHeading] = useState("WORKSPACES");
  const [editHeadingOpen, setEditHeadingOpen] = useState(false);
  const [editHeadingValue, setEditHeadingValue] = useState(workspaceHeading);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
  );

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

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch {
      toast.error("Failed to load users");
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const profileSnapshot = useRef<{
    id: string | null;
    image: string;
    name: string;
    email: string;
  }>({ id: null, image: "", name: "", email: "" });

const isValidEmail = (email: string) => {
  const trimmed = email.trim();
  if (!trimmed) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
  return emailRegex.test(trimmed);
};
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me");
      if (res.ok) {
        const data = await res.json();
        const snap = {
          id: data?.id || null,
          image: data?.image || "",
          name: data?.name || "",
          email: data?.email || "",
        };
        profileSnapshot.current = snap;
        setProfileId(snap.id);
        setProfileImage(snap.image);
        setProfileName(snap.name);
        setProfileEmail(snap.email);
      }
    } catch {
      // ignore
    }
  }, []);

useEffect(() => {
  fetchProfile();
}, [fetchProfile]);

  const handleAvatarUpload = async (file: File) => {
    try {
      setAvatarUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        toast.error("Upload failed");
        return;
      }
      const data = await res.json();
      const imageUrl = data.imageUrl as string;
      // Apenas prepara draft; salvar acontece no botão Save
      setProfileImage(imageUrl);
      toast.success("Photo uploaded. Click Save to apply.");
    } catch {
      toast.error("Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  };

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

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await signOut({ redirect: false });
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Failed to log out");
    } finally {
      setLogoutLoading(false);
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
          assigneeId: newTaskAssigneeId === "unassigned" ? null : newTaskAssigneeId,
          startDate: newTaskStartDate || null,
          dueDate: newTaskDueDate || null,
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
        setNewTaskAssigneeId("unassigned");
        setNewTaskDueDate("");
        setNewTaskStartDate("");
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

  const handleUpdateTaskAssignee = async (
    taskId: string,
    assigneeId: string | null,
  ) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)),
        );
      }
    } catch {
      toast.error("Failed to update assignee");
    }
  };

  const handleUpdateTaskStartDate = async (taskId: string, startDate: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: startDate || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)),
        );
      }
    } catch {
      toast.error("Failed to update start date");
    }
  };

  const handleUpdateTaskDueDate = async (taskId: string, dueDate: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: dueDate || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)),
        );
      }
    } catch {
      toast.error("Failed to update due date");
    }
  };

  const persistReorder = async (orderedIds: string[]) => {
    if (!selectedBoard) return;
    try {
      await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId: selectedBoard.id, orderedIds }),
      });
    } catch {
      toast.error("Failed to save order");
    }
  };

  // Filter tasks by search
  const filteredTasks = [...tasks]
    .sort((a, b) => a.order - b.order)
    .filter(
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
                    onClick={() => {
                      setSelectedWorkspace(ws);
                    }}
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
                          onClick={() => {
                            setSelectedBoard(board);
                          }}
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
            onClick={handleLogout}
            disabled={logoutLoading}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {logoutLoading ? "Signing out..." : "Log Out"}
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
                <h2 className="font-semibold text-slate-900 dark:text-slate-200">
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
            </>
          ) : (
            <div className="flex-1 flex items-center justify-end gap-3 ml-auto">
              <h2 className="text-slate-500 mr-auto">
                Select a board to get started
              </h2>
            </div>
          )}

          <div className="ml-auto flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowProfileModal(true)}
            >
              <UserAvatar src={profileImage} name={profileName} className="h-7 w-7" />
              <span className="hidden sm:block text-sm">{profileName || "Profile"}</span>
            </Button>
            <ThemeToggle />
            {selectedBoard && (
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
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Assignee (optional)</Label>
                        <Select
                          value={newTaskAssigneeId}
                          onValueChange={setNewTaskAssigneeId}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select person" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Due date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="mt-1 w-full justify-start"
                            >
                              {newTaskDueDate
                                ? formatDateHuman(newTaskDueDate)
                                : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          {/* @ts-ignore Radix type issue in .jsx wrapper */}
                          <PopoverContent className="p-0" align="start">
                            <CalendarPicker
                              className="p-2"
                              classNames={{}}
                              mode="single"
                              selected={
                                newTaskDueDate
                                  ? new Date(newTaskDueDate)
                                  : undefined
                              }
                              onSelect={(date: Date | undefined) =>
                                setNewTaskDueDate(
                                  date ? date.toISOString().slice(0, 10) : "",
                                )
                              }
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <Button onClick={handleCreateTask} className="w-full">
                      Create Task
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </header>

        {/* Board Content */}
        <div className="flex-1 overflow-auto p-4 xl:px-10 xl:py-6">
          {selectedBoard ? (
            <div className="w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1500px] mx-auto px-3 sm:px-4 lg:px-6">
              {/* Tabela com scroll controlado (>=1200px) */}
              <div className="task-table-view">
                <div className="bg-card border border-border rounded-lg shadow-sm w-full overflow-x-auto overflow-y-hidden nice-scrollbar tasks-scroll">
                  <div
                    className={`${TASK_GRID} ${TABLE_MIN_WIDTH} px-4 py-3 xl:px-6 xl:py-3.5 text-[11px] font-medium tracking-wide text-muted-foreground border-b border-white/5 items-center`}
                  >
                    <span>Task</span>
                    <span>Status</span>
                    <span className="text-center">Priority</span>
                    <span className="text-center">Group</span>
                    <span>Assignee</span>
                    <span>Start date</span>
                    <span>Due date</span>
                    <span className="justify-self-end pr-2 text-right">
                      Actions
                    </span>
                  </div>

                  {filteredTasks.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                      No tasks found. Create one to get started.
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={({ active, over }) => {
                        if (!over || active.id === over.id) return;
                        setTasks((prev) => {
                          const oldIndex = prev.findIndex((t) => t.id === active.id);
                          const newIndex = prev.findIndex((t) => t.id === over.id);
                          const reordered = arrayMove(prev, oldIndex, newIndex).map(
                            (t, idx) => ({ ...t, order: idx }),
                          );
                          persistReorder(reordered.map((t) => t.id));
                          return reordered;
                        });
                      }}
                    >
                      <SortableContext
                        items={filteredTasks.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className={`${TABLE_MIN_WIDTH}`}>
                          {filteredTasks.map((task, idx) => (
                            <SortableTaskRow
                              key={task.id}
                              rowIndex={idx}
                              task={task}
                              statuses={statuses}
                              groups={groups}
                              users={users}
                              onStatusChange={handleUpdateTaskStatus}
                              onDelete={handleDeleteTask}
                              onAssigneeChange={handleUpdateTaskAssignee}
                              onStartDateChange={handleUpdateTaskStartDate}
                              onDueDateChange={handleUpdateTaskDueDate}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>

              {/* Card view para telas menores (<1200px) */}
              <div className="task-card-view space-y-3">
                {filteredTasks.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    No tasks found. Create one to get started.
                  </div>
                ) : (
                  filteredTasks.map((task) => {
                    const priority = priorityConfig[task.priority];
                    const group = groups.find((g) => g.id === task.groupId);
                    const status = statuses.find((s) => s.id === task.statusId);
                    const assignee = task.assignee;
                    const assigneeImage = (assignee as any)?.image as string | undefined;

                    return (
                      <div
                        key={task.id}
                        className="bg-card/70 border border-border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            className="text-muted-foreground hover:text-foreground mt-1"
                            aria-label="Reorder handle (desktop only)"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-semibold leading-tight line-clamp-2">
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-[11px] text-muted-foreground">Status</Label>
                            <Select
                              value={task.statusId || ""}
                              onValueChange={(val) => handleUpdateTaskStatus(task.id, val)}
                            >
                              <SelectTrigger className="h-10 w-full max-w-[180px]">
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

                          <div className="flex items-center gap-2">
                            <Label className="text-[11px] text-muted-foreground">Priority</Label>
                            <span
                              className="inline-flex items-center gap-2 text-[11px] font-medium px-2.5 py-1.5 rounded-full border h-9"
                              style={{
                                color: priority.color,
                                borderColor: priority.color,
                              }}
                            >
                              {priority.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Label className="text-[11px] text-muted-foreground">Group</Label>
                            <span className="text-sm text-foreground">
                              {group ? group.name : "—"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Label className="text-[11px] text-muted-foreground">Assignee</Label>
                            <Select
                              value={task.assigneeId ?? "unassigned"}
                              onValueChange={(val) =>
                                handleUpdateTaskAssignee(
                                  task.id,
                                  val === "unassigned" ? null : val,
                                )
                              }
                            >
                              <SelectTrigger className="h-10 w-full max-w-[220px]">
                                <div className="flex items-center gap-2.5">
                                  <Avatar className="h-6 w-6 shrink-0">
                                    {assigneeImage ? (
                                      <AvatarImage src={assigneeImage} alt={assignee?.name} />
                                    ) : null}
                                    <AvatarFallback className="bg-muted text-foreground text-[10px]">
                                      {assignee ? getInitials(assignee.name) : "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm text-foreground truncate">
                                    {assignee ? assignee.name : "Unassigned"}
                                  </span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {users.map((u) => (
                                  <SelectItem key={u.id} value={u.id}>
                                    <div className="flex items-center gap-2.5">
                                      <Avatar className="h-6 w-6">
                                        {u.image ? <AvatarImage src={u.image} alt={u.name} /> : null}
                                        <AvatarFallback className="bg-muted text-foreground text-[10px]">
                                          {getInitials(u.name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span>{u.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center gap-2">
                            <Label className="text-[11px] text-muted-foreground">Start</Label>
                            <div className="w-full max-w-[180px]">
                              <DateCell
                                label="Start"
                                value={task.startDate}
                                onChange={(v) => handleUpdateTaskStartDate(task.id, v)}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Label className="text-[11px] text-muted-foreground">Due</Label>
                            <div className="w-full max-w-[180px]">
                              <DateCell
                                label="Due"
                                value={task.dueDate}
                                onChange={(v) => handleUpdateTaskDueDate(task.id, v)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-2 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800">
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
                  })
                )}
              </div>
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

  {/* Profile Modal */}
  <Dialog
    open={showProfileModal}
    onOpenChange={(open) => {
      setShowProfileModal(open);
      if (open) {
        // reset form to snapshot when opening
        const snap = profileSnapshot.current;
        setProfileId(snap.id);
        setProfileImage(snap.image);
        setProfileName(snap.name);
        setProfileEmail(snap.email);
      } else {
        // discard unsaved changes on close
        const snap = profileSnapshot.current;
        setProfileId(snap.id);
        setProfileImage(snap.image);
        setProfileName(snap.name);
        setProfileEmail(snap.email);
      }
    }}
  >
    <DialogContent className="max-w-xl">
      <DialogHeader className="flex flex-row items-center justify-between">
        <DialogTitle>Profile</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative"
            disabled={avatarUploading}
          >
          <UserAvatar src={profileImage} name={profileName} className="h-16 w-16" />
            {avatarUploading && (
              <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center text-xs text-white">
                Uploading...
              </div>
            )}
          </button>
          <div className="space-y-2 flex-1">
            <div>
              <Label>Name</Label>
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Click the avatar to upload a photo
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Avatar URL (optional)</Label>
          <Input
            value={profileImage}
            onChange={(e) => setProfileImage(e.target.value)}
            placeholder="https://..."
          />
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={async () => {
                if (!profileName.trim()) {
                  toast.error("Name is required");
                  return;
                }
                const emailDraft = profileEmail.trim();
                const emailChanged =
                  emailDraft.toLowerCase() !==
                  (profileSnapshot.current.email || "").trim().toLowerCase();
                if (emailChanged && !isValidEmail(emailDraft)) {
                  toast.error("Invalid email");
                  return;
                }
                try {
                  const res = await fetch("/api/users/me", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      image: profileImage?.trim() ? profileImage.trim() : null,
                      name: profileName.trim(),
                      email: profileEmail.trim(),
                    }),
                  });
                  if (res.ok) {
                    const updated = await res.json();
                    const snap = {
                      id: updated?.id || profileId,
                      image: updated?.image || "",
                      name: updated?.name || profileName,
                      email: updated?.email || profileEmail,
                    };
                    profileSnapshot.current = snap;
                    setProfileId(snap.id);
                    setProfileImage(snap.image);
                    setProfileName(snap.name);
                    setProfileEmail(snap.email);
                    setUsers((prev) =>
                      prev.map((u) =>
                        snap.id && u.id === snap.id
                          ? {
                              ...u,
                              image: snap.image || null,
                              name: snap.name,
                              email: snap.email,
                            }
                          : u,
                      ),
                    );
                    setTasks((prev) =>
                      prev.map((t) =>
                        t.assignee && snap.id && t.assignee.id === snap.id
                          ? {
                              ...t,
                              assignee: {
                                ...t.assignee,
                                image: snap.image || null,
                                name: snap.name,
                                email: snap.email,
                              },
                            }
                          : t,
                      ),
                    );
                    toast.success("Profile saved");
                    setShowProfileModal(false);
                  } else {
                    toast.error("Failed to save profile");
                  }
                } catch {
                  toast.error("Failed to save profile");
                }
              }}
            >
              Save
            </Button>
            <Button
              variant="ghost"
              className="flex-none"
              onClick={async () => {
                const prevSnap = profileSnapshot.current;
                const previousImage = profileImage;
                const previousUsers = users;
                const previousTasks = tasks;
                // otimista: limpa imediatamente
                setProfileImage("");
                profileSnapshot.current = {
                  ...prevSnap,
                  image: "",
                };
                setUsers((prev) =>
                  prev.map((u) =>
                    prevSnap.id && u.id === prevSnap.id
                      ? { ...u, image: null }
                      : u,
                  ),
                );
                setTasks((prev) =>
                  prev.map((t) =>
                    t.assignee && prevSnap.id && t.assignee.id === prevSnap.id
                      ? { ...t, assignee: { ...t.assignee, image: null } }
                      : t,
                  ),
                );
                try {
                  const res = await fetch("/api/users/me", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      image: "",
                      name: profileName.trim(),
                      email: profileEmail.trim(),
                    }),
                  });
                  if (res.ok) {
                    const updated = await res.json().catch(() => null);
                    const nextImage = ""; // force removal even se a API devolver valor antigo
                    profileSnapshot.current = {
                      id: updated?.id || prevSnap.id,
                      image: nextImage,
                      name: updated?.name || profileName,
                      email: updated?.email || profileEmail,
                    };
                    setProfileImage(nextImage);
                    setUsers((prev) =>
                      prev.map((u) =>
                        profileSnapshot.current.id &&
                        u.id === profileSnapshot.current.id
                          ? { ...u, image: profileSnapshot.current.image || null }
                          : u,
                      ),
                    );
                    setTasks((prev) =>
                      prev.map((t) =>
                        t.assignee &&
                        profileSnapshot.current.id &&
                        t.assignee.id === profileSnapshot.current.id
                          ? {
                              ...t,
                              assignee: {
                                ...t.assignee,
                                image: profileSnapshot.current.image || null,
                              },
                            }
                          : t,
                      ),
                    );
                    fetchUsers();
                    toast.success("Avatar removed");
                  } else {
                    // rollback
                    profileSnapshot.current = prevSnap;
                    setProfileImage(previousImage);
                    setUsers(previousUsers);
                    setTasks(previousTasks);
                    toast.error("Failed to remove avatar");
                  }
                } catch {
                  profileSnapshot.current = prevSnap;
                  setProfileImage(previousImage);
                  setUsers(previousUsers);
                  setTasks(previousTasks);
                  toast.error("Failed to remove avatar");
                }
              }}
            >
              Remove photo
            </Button>
          </div>
        </div>

        <div className="pt-2 space-y-2 border-t border-border">
          <div className="text-sm font-medium">Change password</div>
          <div className="space-y-2">
            <div>
              <Label>Current password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <Label>New password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label>Confirm new password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button
              disabled={passwordSaving}
              onClick={async () => {
                if (newPassword !== confirmPassword) {
                  toast.error("New password and confirmation must match");
                  return;
                }
                if (newPassword.length < 8) {
                  toast.error("Password must be at least 8 characters");
                  return;
                }
                try {
                  setPasswordSaving(true);
                  const res = await fetch("/api/profile/password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      currentPassword,
                      newPassword,
                      confirmPassword,
                    }),
                  });
                  if (res.ok) {
                    toast.success("Password updated");
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  } else {
                    const data = await res.json();
                    toast.error(data?.error || "Failed to update password");
                  }
                } catch {
                  toast.error("Failed to update password");
                } finally {
                  setPasswordSaving(false);
                }
              }}
            >
              {passwordSaving ? "Updating..." : "Update password"}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
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

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDateValue(dateStr: string | null | undefined) {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().slice(0, 10);
}

function formatDateHuman(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "dd MMM yyyy");
  } catch {
    return "—";
  }
}

type RowProps = {
  rowIndex: number;
  task: Task;
  statuses: Status[];
  groups: Group[];
  users: User[];
  onStatusChange: (taskId: string, statusId: string) => void;
  onDelete: (taskId: string) => void;
  onAssigneeChange: (taskId: string, assigneeId: string | null) => void;
  onStartDateChange: (taskId: string, startDate: string) => void;
  onDueDateChange: (taskId: string, dueDate: string) => void;
};

const DateCell = ({
  value,
  onChange,
  label,
}: {
  value: string | null;
  onChange: (val: string) => void;
  label: string;
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 min-w-[116px] w-full px-3 bg-background border-border text-foreground text-xs flex items-center gap-2 justify-start"
        >
          <Calendar className="h-3.5 w-3.5" />
          {value ? formatDateHuman(value) : "Set date"}
        </Button>
      </PopoverTrigger>
      {/* @ts-ignore Radix jsx wrapper typing */}
      <PopoverContent className="p-2 w-auto" align="start">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium">{label}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onChange("")}
          >
            Clear
          </Button>
        </div>
        <CalendarPicker
          className="rounded-md border"
          classNames={{}}
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={(date: Date | undefined) =>
            onChange(date ? date.toISOString().slice(0, 10) : "")
          }
        />
      </PopoverContent>
    </Popover>
  );
};

function SortableTaskRow({
  rowIndex,
  task,
  statuses,
  groups,
  users,
  onStatusChange,
  onDelete,
  onAssigneeChange,
  onStartDateChange,
      onDueDateChange,
}: RowProps) {
  const priority = priorityConfig[task.priority];
  const group = groups.find((g) => g.id === task.groupId);
  const status = statuses.find((s) => s.id === task.statusId);
  const assignee =
    task.assignee ||
    (task.assigneeId ? users.find((u) => u.id === task.assigneeId) : null);
  const assigneeImage = (assignee as any)?.image as string | undefined;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style as React.CSSProperties}
      className={`${TASK_GRID} px-4 xl:px-6 py-3.5 text-sm transition border-b border-white/5 hover:bg-white/5 dark:hover:bg-white/5 bg-transparent`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <button
          className="text-muted-foreground hover:text-foreground mt-1"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex flex-col gap-1">
          <span className="text-base font-semibold text-foreground leading-tight">
            {task.title}
          </span>
          {task.description && (
            <span className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {task.description}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center min-w-0">
        <Select
          value={task.statusId || ""}
          onValueChange={(val) => onStatusChange(task.id, val)}
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

      <div className="flex items-center justify-center min-w-0">
        <span
          className="inline-flex items-center gap-2 text-[11px] font-medium px-2.5 py-1.5 rounded-full border h-9"
          style={{
            color: priority.color,
            borderColor: priority.color,
          }}
        >
          {priority.label}
        </span>
      </div>

      <div className="flex items-center justify-center text-sm text-foreground min-w-0">
        {group ? group.name : "—"}
      </div>

      <div className="flex items-center justify-center min-w-0">
        <Select
          value={task.assigneeId ?? "unassigned"}
          onValueChange={(val) =>
            onAssigneeChange(task.id, val === "unassigned" ? null : val)
          }
        >
          <SelectTrigger className="w-full max-w-[220px] h-10 px-3 min-w-0">
            <div className="flex items-center gap-2.5">
              {assignee ? (
                <>
                  <UserAvatar src={assigneeImage} name={assignee?.name} />
                  <span className="text-sm text-foreground truncate">
                    {assignee.name}
                  </span>
                </>
              ) : (
                <>
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="bg-muted text-foreground text-[10px]">
                      ?
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground truncate">Unassigned</span>
                </>
              )}
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                <div className="flex items-center gap-2.5">
                  <UserAvatar src={u.image || ""} name={u.name} />
                  <span>{u.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-center min-w-0">
        <DateCell
          label="Start"
          value={task.startDate}
          onChange={(v) => onStartDateChange(task.id, v)}
        />
      </div>
      <div className="flex justify-center min-w-0">
        <DateCell
          label="Due"
          value={task.dueDate}
          onChange={(v) => onDueDateChange(task.id, v)}
        />
      </div>

      <div className="flex items-center justify-end gap-2 justify-self-end pr-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {statuses.map((s) => (
              <DropdownMenuItem
                key={s.id}
                onClick={() => onStatusChange(task.id, s.id)}
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
    </div>
  );
}
