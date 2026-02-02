"use client";

import { ThemeToggle } from "@/components/theme-toggle";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
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
import { format, parse, parseISO } from "date-fns";
import {
  Calendar,
  ChevronRight,
  GripVertical,
  LayoutDashboard,
  Loader2,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { toast } from "sonner";

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

const emojiOptions = [
  "📁",
  "🚀",
  "📌",
  "📋",
  "📝",
  "💻",
  "🎯",
  "🧪",
  "🛠️",
  "📈",
  "📊",
  "🎨",
  "🧭",
  "🧠",
  "🛒",
  "🏗️",
];

const UserAvatar = ({
  src,
  name,
  className,
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
}) => {
  const normalizedSrc = src?.trim() ? src.trim() : undefined;

  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [normalizedSrc]);

  const showImage = !!normalizedSrc && !errored;

  return (
    <Avatar
      className={cn("h-6 w-6 shrink-0", className)}
      key={`${normalizedSrc ?? "no-src"}-${errored ? "err" : "ok"}`}
    >
      {showImage ? (
        <AvatarImage
          src={normalizedSrc}
          alt={name || "User avatar"}
          className="object-cover"
          onError={() => setErrored(true)}
        />
      ) : null}

      <AvatarFallback className="bg-muted text-foreground text-[10px] font-semibold uppercase">
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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDesc, setEditTaskDesc] = useState("");
  const [editTaskStatusId, setEditTaskStatusId] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState<Task["priority"]>("medium");
  const [editTaskGroupId, setEditTaskGroupId] = useState("none");
  const [editTaskAssigneeId, setEditTaskAssigneeId] = useState("unassigned");
  const [editTaskStartDate, setEditTaskStartDate] = useState("");
  const [editTaskDueDate, setEditTaskDueDate] = useState("");
  const [newWorkspaceIcon, setNewWorkspaceIcon] = useState("📁");
  const [editWorkspaceIcon, setEditWorkspaceIcon] = useState("📁");
  const [newBoardIcon, setNewBoardIcon] = useState("📋");
  const [editBoardIcon, setEditBoardIcon] = useState("📋");
  const [workspaceHeading, setWorkspaceHeading] = useState("WORKSPACES");
  const [editHeadingOpen, setEditHeadingOpen] = useState(false);
  const [editHeadingValue, setEditHeadingValue] = useState(workspaceHeading);
  const [seedingExamples, setSeedingExamples] = useState(false);
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
  const [profileDirty, setProfileDirty] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const profileSnapshot = useRef<{
    id: string | null;
    image: string;
    name: string;
    email: string;
  }>({ id: null, image: "", name: "", email: "" });

  const isValidEmail = (email: string) => {
    const trimmed = email.trim();
    if (!trimmed) return false;
    if (/\s/.test(trimmed)) return false;

    const atIndex = trimmed.lastIndexOf("@");
    if (atIndex <= 0 || atIndex !== trimmed.indexOf("@")) return false;

    const local = trimmed.slice(0, atIndex);
    const domain = trimmed.slice(atIndex + 1);

    if (local.length > 64 || domain.length > 255) return false;
    if (!local || !domain) return false;
    if (local.startsWith(".") || local.endsWith(".")) return false;
    if (local.includes("..")) return false;
    if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;

    const domainLower = domain.toLowerCase();
    if (domainLower.startsWith(".") || domainLower.endsWith(".")) return false;
    if (domainLower.includes("..")) return false;

    const labels = domainLower.split(".");
    if (labels.length < 2) return false;
    if (labels.some((l) => l.length === 0 || l.length > 63)) return false;
    if (
      labels.some(
        (l) => !/^[a-z0-9-]+$/.test(l) || l.startsWith("-") || l.endsWith("-"),
      )
    ) {
      return false;
    }

    const tld = labels[labels.length - 1];
    if (!/^[a-z]{2,24}$/.test(tld)) return false;

    return true;
  };

  const getEmailTypoSuggestion = (email: string) => {
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) return null;
    const atIndex = trimmed.lastIndexOf("@");
    if (atIndex <= 0) return null;

    const local = trimmed.slice(0, atIndex);
    const domain = trimmed.slice(atIndex + 1).toLowerCase();

    const knownDomains = [
      // Google
      "gmail.com",
      "googlemail.com",

      // Microsoft consumer
      "outlook.com",
      "hotmail.com",
      "live.com",
      "msn.com",

      // Popular providers
      "yahoo.com",
      "icloud.com",
      "me.com",
      "mac.com",
      "proton.me",
      "protonmail.com",
      "zoho.com",
      "aol.com",
      "gmx.com",
      "gmx.net",
      "yandex.com",
      "yandex.ru",
      "fastmail.com",
      "tutanota.com",
      "tuta.com",
      "mail.com",

      // Brasil
      "uol.com.br",
      "bol.com.br",
      "terra.com.br",
      "ig.com.br",
    ];

    const directTypos: Record<string, string> = {
      // gmail
      "gail.com": "gmail.com",
      "gmai.com": "gmail.com",
      "gmaill.com": "gmail.com",
      "gmial.com": "gmail.com",
      "gnail.com": "gmail.com",
      "gmail.con": "gmail.com",

      // outlook/hotmail/live
      "outllok.com": "outlook.com",
      "outlok.com": "outlook.com",
      "outlook.con": "outlook.com",
      "hotnail.com": "hotmail.com",
      "hotmail.con": "hotmail.com",

      // yahoo / icloud
      "yaho.com": "yahoo.com",
      "yahoo.con": "yahoo.com",
      "icloud.con": "icloud.com",
      "iclod.com": "icloud.com",

      // br
      "uol.con.br": "uol.com.br",
      "bol.con.br": "bol.com.br",
      "terra.con.br": "terra.com.br",
      "ig.con.br": "ig.com.br",
    };

    const suggestedDirect = directTypos[domain];
    if (suggestedDirect) return `${local}@${suggestedDirect}`;

    const levenshtein = (a: string, b: string) => {
      if (a === b) return 0;
      if (a.length === 0) return b.length;
      if (b.length === 0) return a.length;

      const prev = new Array<number>(b.length + 1);
      const curr = new Array<number>(b.length + 1);
      for (let j = 0; j <= b.length; j++) prev[j] = j;

      for (let i = 1; i <= a.length; i++) {
        curr[0] = i;
        const aChar = a.charCodeAt(i - 1);
        for (let j = 1; j <= b.length; j++) {
          const cost = aChar === b.charCodeAt(j - 1) ? 0 : 1;
          curr[j] = Math.min(
            prev[j] + 1,
            curr[j - 1] + 1,
            prev[j - 1] + cost,
          );
        }
        for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
      }

      return prev[b.length];
    };

    let bestDomain: string | null = null;
    let bestDistance = Infinity;
    for (const candidate of knownDomains) {
      const dist = levenshtein(domain, candidate);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestDomain = candidate;
      }
    }

    // Só sugere (e bloqueia) se estiver bem perto de um provedor conhecido
    if (bestDomain && bestDistance <= 2 && bestDomain !== domain) {
      return `${local}@${bestDomain}`;
    }

    return null;
  };

  const canLeaveProfileModal = () => {
    if (!profileName.trim()) return false;
    if (!isValidEmail(profileEmail)) return false;
    if (getEmailTypoSuggestion(profileEmail)) return false;
    const normalizedCurrentImage = profileImage.trim();
    const normalizedSnapshotImage = profileSnapshot.current.image.trim();
    const hasUnsavedAvatarChange =
      profileDirty && normalizedCurrentImage !== normalizedSnapshotImage;
    if (hasUnsavedAvatarChange) return false;
    return true;
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
        setProfileDirty(false);
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
      setProfileDirty(true);
      toast.success("Photo uploaded. Click Save to apply.");
    } catch {
      toast.error("Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileDirty) return;

    const normalizedName = profileName.trim();
    const normalizedEmail = profileEmail.trim();
    const normalizedImage = profileImage.trim();

    if (!normalizedName) {
      toast.error("Name is required");
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      toast.error("Invalid email");
      return;
    }
    const emailSuggestion = getEmailTypoSuggestion(normalizedEmail);
    if (emailSuggestion) {
      toast.error(`Email seems incorrect. Did you mean ${emailSuggestion}?`);
      return;
    }

    try {
      setProfileSaving(true);
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalizedName,
          email: normalizedEmail,
          image: normalizedImage ? normalizedImage : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Failed to update profile");
        return;
      }

      const updated = (await res.json()) as {
        id: string;
        name: string;
        email: string;
        image: string | null;
      };

      profileSnapshot.current = {
        id: updated.id,
        name: updated.name || "",
        email: updated.email || "",
        image: updated.image || "",
      };

      setProfileId(updated.id);
      setProfileName(updated.name || "");
      setProfileEmail(updated.email || "");
      setProfileImage(updated.image || "");
      setProfileDirty(false);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === updated.id
            ? { ...u, name: updated.name, email: updated.email, image: updated.image }
            : u,
        ),
      );
      setTasks((prev) =>
        prev.map((t) =>
          t.assignee?.id === updated.id
            ? {
                ...t,
                assignee: {
                  ...t.assignee,
                  name: updated.name,
                  email: updated.email,
                  image: updated.image,
                },
              }
            : t,
        ),
      );

      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setProfileSaving(false);
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
          icon: newWorkspaceIcon || undefined,
        }),
      });
      if (res.ok) {
        const workspace = await res.json();
        setWorkspaces((prev) => [workspace, ...prev]);
        setSelectedWorkspace(workspace);
        setNewWorkspaceName("");
        setNewWorkspaceDesc("");
        setNewWorkspaceIcon("📁");
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
          icon: editWorkspaceIcon || undefined,
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
        setEditWorkspaceIcon(updated.icon || "📁");
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
        body: JSON.stringify({ name: editBoardName, icon: editBoardIcon || undefined }),
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
          icon: newBoardIcon || undefined,
        }),
      });
      if (res.ok) {
        const board = await res.json();
        setBoards((prev) => [board, ...prev]);
        setSelectedBoard(board);
        setNewBoardName("");
        setNewBoardIcon("📋");
        setShowNewBoard(false);
        toast.success("Board created");
      }
    } catch {
      toast.error("Failed to create board");
    }
  };

  const handleSeedExamples = async () => {
    if (seedingExamples) return;
    setSeedingExamples(true);
    try {
      // Create workspace
      const wsRes = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Product Development",
          description: "Sample workspace with a starter board",
          icon: "🚀",
        }),
      });
      if (!wsRes.ok) throw new Error("workspace");
      const ws = await wsRes.json();
      // Create board
      const boardRes = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: ws.id,
          name: "Q1 Sprint Planning",
          icon: "📋",
        }),
      });
      if (!boardRes.ok) throw new Error("board");
      const board = await boardRes.json();

      setWorkspaces((prev) => [ws, ...prev]);
      setBoards((prev) => [board, ...prev]);
      setSelectedWorkspace(ws);
      setSelectedBoard(board);
      toast.success("Loaded example workspace and board");
    } catch {
      toast.error("Failed to load examples. Check database connection.");
    } finally {
      setSeedingExamples(false);
    }
  };

  // Create task
  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !selectedBoard) return;
    if (newTaskStartDate && newTaskDueDate) {
      const start = parseDateInput(newTaskStartDate);
      const due = parseDateInput(newTaskDueDate);
      if (start && due && start.getTime() > due.getTime()) {
        toast.error("Due date cannot be before start date");
        return;
      }
    }
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
          assigneeId:
            newTaskAssigneeId === "unassigned" ? null : newTaskAssigneeId,
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

  const handleUpdateTaskStartDate = async (
    taskId: string,
    startDate: string,
  ) => {
    const existing = tasks.find((t) => t.id === taskId);
    if (existing?.dueDate) {
      const due = parseDateInput(existing.dueDate);
      const start = parseDateInput(startDate);
      if (start && due && start.getTime() > due.getTime()) {
        toast.error("Start date cannot be after due date");
        return;
      }
    }
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
    const existing = tasks.find((t) => t.id === taskId);
    if (existing?.startDate) {
      const start = parseDateInput(existing.startDate);
      const due = parseDateInput(dueDate);
      if (start && due && due.getTime() < start.getTime()) {
        toast.error("Due date cannot be before start date");
        return;
      }
    }
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

  const beginEditTask = (task: Task) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDesc(task.description || "");
    setEditTaskStatusId(task.statusId || "");
    setEditTaskPriority(task.priority);
    setEditTaskGroupId(task.groupId || "none");
    setEditTaskAssigneeId(task.assigneeId || "unassigned");
    setEditTaskStartDate(formatDateValue(task.startDate) || "");
    setEditTaskDueDate(formatDateValue(task.dueDate) || "");
  };

  const handleSaveEditTask = async () => {
    if (!editingTask) return;
    if (!editTaskTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    if (editTaskStartDate && editTaskDueDate) {
      const start = parseDateInput(editTaskStartDate);
      const due = parseDateInput(editTaskDueDate);
      if (start && due && start.getTime() > due.getTime()) {
        toast.error("Due date cannot be before start date");
        return;
      }
    }
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTaskTitle,
          description: editTaskDesc || null,
          statusId: editTaskStatusId || null,
          priority: editTaskPriority,
          groupId: editTaskGroupId === "none" ? null : editTaskGroupId,
          assigneeId:
            editTaskAssigneeId === "unassigned" ? null : editTaskAssigneeId,
          startDate: editTaskStartDate || null,
          dueDate: editTaskDueDate || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setEditingTask(null);
        toast.success("Task updated");
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Failed to update task");
      }
    } catch {
      toast.error("Failed to update task");
    }
  };
  const handleUpdateTaskPriority = async (
    taskId: string,
    priority: Task["priority"],
  ) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)),
        );
      }
    } catch {
      toast.error("Failed to update priority");
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
              <Dialog
                open={showNewWorkspace}
                onOpenChange={setShowNewWorkspace}
              >
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
                      <Label>Icon</Label>
                      <Select
                        value={newWorkspaceIcon}
                        onValueChange={setNewWorkspaceIcon}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {emojiOptions.map((emoji) => (
                            <SelectItem key={emoji} value={emoji}>
                              {emoji}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

          <Dialog open={editHeadingOpen} onOpenChange={setEditHeadingOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Rename section</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Title</Label>
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
                    onClick={() => {
                      setEditHeadingOpen(false);
                      setEditHeadingValue(workspaceHeading);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      const next = editHeadingValue.trim();
                      setWorkspaceHeading(next || "WORKSPACES");
                      setEditHeadingOpen(false);
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="space-y-1">
            {workspaces.length === 0 ? (
              <div className="text-xs text-muted-foreground space-y-2 p-2">
                <div>No workspaces yet.</div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={seedingExamples}
                  onClick={handleSeedExamples}
                >
                  {seedingExamples ? "Loading..." : "Load example workspace"}
                </Button>
              </div>
            ) : (
              workspaces.map((ws) => (
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
                                setEditBoardIcon(board.icon || "📋");
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
                          <div>
                            <Label>Icon</Label>
                            <Select
                              value={newBoardIcon}
                              onValueChange={setNewBoardIcon}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {emojiOptions.map((emoji) => (
                                  <SelectItem key={emoji} value={emoji}>
                                    {emoji}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            onClick={handleCreateBoard}
                            className="w-full"
                          >
                            Create Board
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            )))}
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

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={editTaskTitle}
                onChange={(e) => setEditTaskTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={editTaskDesc}
                onChange={(e) => setEditTaskDesc(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select
                  value={editTaskStatusId}
                  onValueChange={setEditTaskStatusId}
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
                  value={editTaskPriority}
                  onValueChange={(v) => setEditTaskPriority(v as Task["priority"])}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: cfg.color }}
                          />
                          {cfg.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Group (optional)</Label>
                <Select
                  value={editTaskGroupId}
                  onValueChange={setEditTaskGroupId}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assignee (optional)</Label>
                <Select
                  value={editTaskAssigneeId}
                  onValueChange={setEditTaskAssigneeId}
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
            </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="mt-1 w-full justify-start"
                    >
                      {editTaskStartDate
                        ? formatDateHuman(editTaskStartDate)
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  {/* @ts-ignore Radix type issue in .jsx wrapper */}
                  <PopoverContent className="p-0" align="start">
                    <CalendarPicker
                      className="p-2"
                      classNames={{ day_today: "text-muted-foreground" }}
                      mode="single"
                      selected={
                        editTaskStartDate
                          ? parseDateInput(editTaskStartDate) ?? undefined
                          : undefined
                      }
                      defaultMonth={
                        editTaskStartDate
                          ? parseDateInput(editTaskStartDate) ?? undefined
                          : undefined
                      }
                      onSelect={(date: Date | undefined) => {
                        if (
                          date &&
                          editTaskDueDate &&
                          parseDateInput(editTaskDueDate) &&
                          date.getTime() >
                            (parseDateInput(editTaskDueDate)?.getTime() ?? 0)
                        ) {
                          toast.error("Start date cannot be after due date");
                          return;
                        }
                        setEditTaskStartDate(
                          date ? format(date, "yyyy-MM-dd") : "",
                        );
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Due date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="mt-1 w-full justify-start"
                    >
                      {editTaskDueDate
                        ? formatDateHuman(editTaskDueDate)
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  {/* @ts-ignore Radix type issue in .jsx wrapper */}
                  <PopoverContent className="p-0" align="start">
                    <CalendarPicker
                      className="p-2"
                      classNames={{ day_today: "text-muted-foreground" }}
                      mode="single"
                      selected={
                        editTaskDueDate
                          ? parseDateInput(editTaskDueDate) ?? undefined
                          : undefined
                      }
                      defaultMonth={
                        editTaskDueDate
                          ? parseDateInput(editTaskDueDate) ?? undefined
                          : undefined
                      }
                      onSelect={(date: Date | undefined) => {
                        if (
                          date &&
                          editTaskStartDate &&
                          parseDateInput(editTaskStartDate) &&
                          date.getTime() <
                            (parseDateInput(editTaskStartDate)?.getTime() ?? 0)
                        ) {
                          toast.error("Due date cannot be before start date");
                          return;
                        }
                        setEditTaskDueDate(
                          date ? format(date, "yyyy-MM-dd") : "",
                        );
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingTask(null)}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSaveEditTask}>
                Save changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              <UserAvatar
                src={profileImage || undefined}
                name={profileName}
                className="h-7 w-7"
              />
              <span className="hidden sm:block text-sm">
                {profileName || "Profile"}
              </span>
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
                            <SelectItem value="unassigned">
                              Unassigned
                            </SelectItem>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Start date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="mt-1 w-full justify-start"
                              >
                                {newTaskStartDate
                                  ? formatDateHuman(newTaskStartDate)
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
                                  newTaskStartDate
                                    ? parseDateInput(newTaskStartDate) ?? undefined
                                    : undefined
                                }
                    onSelect={(date: Date | undefined) => {
                      if (
                        date &&
                        newTaskDueDate &&
                        parseDateInput(newTaskDueDate) &&
                        date.getTime() >
                          (parseDateInput(newTaskDueDate)?.getTime() ?? 0)
                      ) {
                        toast.error("Start date cannot be after due date");
                        return;
                      }
                      setNewTaskStartDate(
                        date ? format(date, "yyyy-MM-dd") : "",
                      );
                    }}
                  />
                </PopoverContent>
              </Popover>
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
                                    ? parseDateInput(newTaskDueDate) ?? undefined
                                    : undefined
                                }
                    onSelect={(date: Date | undefined) => {
                      if (
                        date &&
                        newTaskStartDate &&
                        parseDateInput(newTaskStartDate) &&
                        date.getTime() <
                          (parseDateInput(newTaskStartDate)?.getTime() ?? 0)
                      ) {
                        toast.error("Due date cannot be before start date");
                        return;
                      }
                      setNewTaskDueDate(
                        date ? format(date, "yyyy-MM-dd") : "",
                      );
                    }}
                  />
                </PopoverContent>
              </Popover>
                        </div>
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
                          const oldIndex = prev.findIndex(
                            (t) => t.id === active.id,
                          );
                          const newIndex = prev.findIndex(
                            (t) => t.id === over.id,
                          );
                          const reordered = arrayMove(
                            prev,
                            oldIndex,
                            newIndex,
                          ).map((t, idx) => ({ ...t, order: idx }));
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
                              onPriorityChange={handleUpdateTaskPriority}
                              onEditTask={beginEditTask}
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
                    const assigneeImage = (assignee as any)?.image as
                      | string
                      | undefined;

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
                            <Label className="text-[11px] text-muted-foreground">
                              Status
                            </Label>
                            <Select
                              value={task.statusId || ""}
                              onValueChange={(val) =>
                                handleUpdateTaskStatus(task.id, val)
                              }
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
                            <Label className="text-[11px] text-muted-foreground">
                              Priority
                            </Label>
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
                            <Label className="text-[11px] text-muted-foreground">
                              Group
                            </Label>
                            <span className="text-sm text-foreground">
                              {group ? group.name : "—"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Label className="text-[11px] text-muted-foreground">
                              Assignee
                            </Label>
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
                                  <UserAvatar
                                    src={assigneeImage || undefined}
                                    name={assignee?.name}
                                    className="h-6 w-6"
                                  />
                                  <span className="text-sm text-foreground truncate">
                                    {assignee ? assignee.name : "Unassigned"}
                                  </span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">
                                  Unassigned
                                </SelectItem>
                                {users.map((u) => (
                                  <SelectItem key={u.id} value={u.id}>
                                    <div className="flex items-center gap-2.5">
                                      <UserAvatar
                                        src={u.image || undefined}
                                        name={u.name}
                                        className="h-6 w-6"
                                      />
                                      <span>{u.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center gap-2">
                            <Label className="text-[11px] text-muted-foreground">
                              Start
                            </Label>
                            <div className="w-full max-w-[180px]">
                              <DateCell
                                label="Start"
                                value={task.startDate}
                                onChange={(v) =>
                                  handleUpdateTaskStartDate(task.id, v)
                                }
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Label className="text-[11px] text-muted-foreground">
                              Due
                            </Label>
                            <div className="w-full max-w-[180px]">
                              <DateCell
                                label="Due"
                                value={task.dueDate}
                                onChange={(v) =>
                                  handleUpdateTaskDueDate(task.id, v)
                                }
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
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                beginEditTask(task);
                              }}
                            >
                              Edit task
                            </DropdownMenuItem>
                              <Separator className="my-1" />
                              {statuses.map((s) => (
                                <DropdownMenuItem
                                  key={s.id}
                                  onClick={() =>
                                    handleUpdateTaskStatus(task.id, s.id)
                                  }
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
          if (!open && !canLeaveProfileModal()) {
            const emailSuggestion = getEmailTypoSuggestion(profileEmail);
            const normalizedCurrentImage = profileImage.trim();
            const normalizedSnapshotImage = profileSnapshot.current.image.trim();
            const hasUnsavedAvatarChange =
              profileDirty && normalizedCurrentImage !== normalizedSnapshotImage;

            if (hasUnsavedAvatarChange) {
              toast.error("Save profile changes to close");
            } else if (emailSuggestion) {
              toast.error(`Email seems incorrect. Did you mean ${emailSuggestion}?`);
            } else {
              toast.error("Enter a valid email to close the profile");
            }
            setShowProfileModal(true);
            return;
          }

          setShowProfileModal(open);
          if (open) {
            // reset form to snapshot when opening
            const snap = profileSnapshot.current;
            setProfileId(snap.id);
            setProfileImage(snap.image);
            setProfileName(snap.name);
            setProfileEmail(snap.email);
            setProfileDirty(false);
          } else {
            // discard unsaved changes on close
            const snap = profileSnapshot.current;
            setProfileId(snap.id);
            setProfileImage(snap.image);
            setProfileName(snap.name);
            setProfileEmail(snap.email);
            setProfileDirty(false);
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
                <UserAvatar
                  src={profileImage || undefined}
                  name={profileName}
                  className="h-16 w-16"
                />
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center">
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </div>
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
                    onChange={(e) => {
                      setProfileName(e.target.value);
                      setProfileDirty(true);
                    }}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={profileEmail}
                    onChange={(e) => {
                      setProfileEmail(e.target.value);
                      setProfileDirty(true);
                    }}
                  />
                  {getEmailTypoSuggestion(profileEmail) ? (
                    <div className="text-xs text-destructive mt-1">
                      Did you mean {getEmailTypoSuggestion(profileEmail)}?
                    </div>
                  ) : null}
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
                onChange={(e) => {
                  setProfileImage(e.target.value);
                  setProfileDirty(true);
                }}
                placeholder="https://..."
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-none"
                  onClick={() => {
                    // 1) limpa no modal (draft)
                    setProfileImage("");
                    setProfileDirty(true);
                    toast.success("Photo removed. Click Save to apply.");
                  }}
                >
                  Remove photo
                </Button>
              </div>
            </div>

            <div className="flex">
              <Button
                className="w-full"
                disabled={
                  profileSaving ||
                  !profileDirty ||
                  !profileName.trim() ||
                  !isValidEmail(profileEmail) ||
                  !!getEmailTypoSuggestion(profileEmail)
                }
                onClick={handleSaveProfile}
              >
                {profileSaving ? "Saving..." : "Save"}
              </Button>
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
                <Label>Icon</Label>
                <Select
                  value={editWorkspaceIcon}
                  onValueChange={setEditWorkspaceIcon}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {emojiOptions.map((emoji) => (
                      <SelectItem key={emoji} value={emoji}>
                        {emoji}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              This will delete the workspace and its boards/tasks. This action
              cannot be undone.
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
            <div>
              <Label>Icon</Label>
              <Select
                value={editBoardIcon}
                onValueChange={setEditBoardIcon}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {emojiOptions.map((emoji) => (
                    <SelectItem key={emoji} value={emoji}>
                      {emoji}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              This will delete the board and its tasks. This action cannot be
              undone.
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
                if (pendingBoardDelete) {
                  handleDeleteBoard(pendingBoardDelete.id);
                }
                setPendingBoardDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function parseDateInput(dateStr?: string | null) {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  try {
    const parsed = parse(trimmed, "yyyy-MM-dd", new Date());
    if (!Number.isNaN(parsed.getTime())) return parsed;
  } catch {}

  try {
    const parsed = parseISO(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  } catch {}

  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatDateValue(dateStr: string | null | undefined) {
  const parsed = parseDateInput(dateStr);
  if (!parsed) return "";
  return format(parsed, "yyyy-MM-dd");
}

function formatDateHuman(dateStr: string | null | undefined) {
  const parsed = parseDateInput(dateStr);
  if (!parsed) return "—";
  return format(parsed, "dd MMM yyyy");
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
  onPriorityChange: (taskId: string, priority: Task["priority"]) => void;
  onEditTask: (task: Task) => void;
};

const DateCell = ({
  value,
  onChange,
  label,
  pairedDate,
  pairedType,
}: {
  value: string | null;
  onChange: (val: string) => void;
  label: string;
  pairedDate?: string | null;
  pairedType?: "start" | "due";
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
          classNames={{
            day_today: "text-muted-foreground",
          }}
          mode="single"
          selected={value ? parseDateInput(value) ?? undefined : undefined}
          defaultMonth={value ? parseDateInput(value) ?? undefined : undefined}
          onSelect={(date: Date | undefined) => {
            if (pairedType && pairedDate && date) {
              const paired = parseDateInput(pairedDate);
              if (paired) {
                if (
                  pairedType === "due" &&
                  paired.getTime() < date.getTime()
                ) {
                  toast.error("Start date cannot be after due date");
                  return;
                }
                if (
                  pairedType === "start" &&
                  paired.getTime() > date.getTime()
                ) {
                  toast.error("Due date cannot be before start date");
                  return;
                }
              }
            }
            onChange(date ? format(date, "yyyy-MM-dd") : "");
          }}
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
  onPriorityChange,
  onEditTask,
}: RowProps) {
  const priority = priorityConfig[task.priority];
  const group = groups.find((g) => g.id === task.groupId);
  const status = statuses.find((s) => s.id === task.statusId);
  const assignee =
    task.assignee ||
    (task.assigneeId ? users.find((u) => u.id === task.assigneeId) : null);
  const assigneeImage = (assignee as any)?.image as string | undefined;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

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
        <Select
          value={task.priority}
          onValueChange={(val) => onPriorityChange(task.id, val as Task["priority"])}
        >
          <SelectTrigger className="h-9 w-[120px] px-3">
            <div className="flex items-center gap-2 text-[11px] font-medium">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: priority.color }}
              />
              {priority.label}
            </div>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(priorityConfig).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: cfg.color }}
                  />
                  {cfg.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                  <UserAvatar
                    src={assigneeImage || undefined}
                    name={assignee?.name}
                  />
                  <span className="text-sm text-foreground truncate">
                    {assignee.name}
                  </span>
                </>
              ) : (
                <>
                  <UserAvatar />
                  <span className="text-sm text-foreground truncate">
                    Unassigned
                  </span>
                </>
              )}
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                <div className="flex items-center gap-2.5">
                  <UserAvatar src={u.image || undefined} name={u.name} />
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
          pairedDate={task.dueDate}
          pairedType="due"
        />
      </div>
      <div className="flex justify-center min-w-0">
        <DateCell
          label="Due"
          value={task.dueDate}
          onChange={(v) => onDueDateChange(task.id, v)}
          pairedDate={task.startDate}
          pairedType="start"
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
            <DropdownMenuItem
              onClick={() => onEditTask(task)}
            >
              Edit task
            </DropdownMenuItem>
            <Separator className="my-1" />
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
