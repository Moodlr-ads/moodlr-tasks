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
  DialogDescription,
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
import { Check } from "lucide-react";
import type React from "react";

// PopoverContent is defined in a JS file, so the TS types don't include children.
// Alias with a loose typing to avoid friction in this client component.
const PopoverContentAny = PopoverContent as unknown as React.ComponentType<any>;

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

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface Tag {
  id: string;
  name: string;
  workspaceId: string;
  createdAt: string;
}

interface Task {
  id: string;
  boardId: string;
  title: string;
  description: string | null;
  statusId: string | null;
  priority: "low" | "medium" | "high" | "critical";
  startDate: string | null;
  dueDate: string | null;
  order: number;
  assigneeId?: string | null;
  assignee?: User | null;
  assignees?: { user: User }[];
  tags?: Tag[];
}

type TagListSelectProps = {
  tags: Tag[];
  selectedIds: string[];
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  onTrash?: (id: string) => void;
  limit: number;
  newTagName: string;
  onNewTagNameChange: (v: string) => void;
  onCreate: () => void;
};

const TAG_LIMIT = 5;

const uniq = (arr: string[]) => Array.from(new Set(arr));
const uniqTags = (arr: Tag[]) =>
  Array.from(new Map(arr.map((t) => [t.id, t])).values());
const normalizeTask = (task: any): Task => {
  const assignees = Array.isArray(task?.assignees) ? task.assignees : [];
  const primaryAssignee = task?.assignee ?? assignees[0]?.user ?? null;

  return {
    ...task,
    assignees,
    assignee: primaryAssignee,
    assigneeId: task?.assigneeId ?? primaryAssignee?.id ?? null,
    tags: task?.tags ?? [],
  };
};

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

const TagListSelect = ({
  tags,
  selectedIds,
  onRemove,
  onToggle,
  onTrash,
  limit,
  newTagName,
  onNewTagNameChange,
  onCreate,
}: TagListSelectProps) => {
  const selectedIdsUnique = uniq(selectedIds);
  const reachedLimit = selectedIdsUnique.length >= limit;
  const uniqueTags = uniqTags(tags);
  const uniqueSelected = uniqueTags.filter((t) =>
    selectedIdsUnique.includes(t.id),
  );
  const toggle = (id: string) => {
    if (!selectedIdsUnique.includes(id) && reachedLimit) {
      toast.error(`You can add up to ${limit} tags per task.`);
      return;
    }
    onToggle(id);
  };

  return (
    <div className="space-y-3">
      <Label>Tags</Label>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          Selecionadas ({uniqueSelected.length}/{limit}):
        </span>
        {uniqueSelected.length === 0 ? (
          <span className="text-muted-foreground">Nenhuma</span>
        ) : (
          <span className="text-foreground">
            {uniqueSelected.map((t) => t.name).join(", ")}
          </span>
        )}
      </div>

      {reachedLimit && (
        <p className="text-xs text-muted-foreground">
          Máximo de {limit} tags por task.
        </p>
      )}

      <div className="space-y-1">
        <Label className="text-[12px] text-muted-foreground">
          Adicionar existentes
        </Label>
        <div className="flex flex-wrap gap-2">
          {uniqueTags.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              Nenhuma tag criada ainda.
            </span>
          ) : (
            uniqueTags.map((tag) => {
              const active = selectedIdsUnique.includes(tag.id);
              const disableAdd = !active && reachedLimit;
              return (
                <div key={tag.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggle(tag.id)}
                    disabled={disableAdd}
                    className={cn(
                      "px-2 py-1 rounded border text-xs transition",
                      active
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                        : "bg-card text-foreground border-border hover:bg-muted",
                      disableAdd ? "opacity-60 cursor-not-allowed" : "",
                    )}
                  >
                    {tag.name}
                  </button>
                  {onTrash ? (
                    <button
                      type="button"
                      onClick={() => onTrash(tag.id)}
                      className="text-muted-foreground hover:text-red-600"
                      title="Enviar para lixeira"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <Input
          value={newTagName}
          onChange={(e) => onNewTagNameChange(e.target.value)}
          placeholder="Nova tag"
          className="flex-1"
        />
        <Button
          type="button"
          onClick={() => {
            if (!reachedLimit) onCreate();
          }}
          className="h-10 px-4"
          disabled={reachedLimit}
        >
          Criar
        </Button>
      </div>
    </div>
  );
};

const HiddenTagsPopover = ({
  hidden,
  onToggle,
  chipClassName = "",
}: {
  hidden: Tag[];
  onToggle: (id: string) => void;
  chipClassName?: string;
}) => {
  if (!hidden.length) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "px-2 py-0.5 rounded-full border text-xs text-muted-foreground bg-muted/50 border-border hover:bg-muted",
            chipClassName,
          )}
          aria-label={`Mostrar mais ${hidden.length} tags`}
        >
          +{hidden.length}
        </button>
      </PopoverTrigger>
      <PopoverContentAny className="p-2 w-52" align="center">
        <div className="flex flex-wrap gap-1">
          {hidden.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggle(tag.id)}
              className="px-2 py-1 rounded border text-xs bg-card text-foreground border-border hover:bg-muted"
            >
              {tag.name}
            </button>
          ))}
        </div>
      </PopoverContentAny>
    </Popover>
  );
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

const getAssigneeIds = (task: Task) =>
  uniq([
    ...(task.assignees?.map((a) => a.user.id) ?? []),
    ...(task.assigneeId ? [task.assigneeId] : []),
  ]);

const AssigneePicker = ({
  users,
  selectedIds,
  onChange,
  align = "start",
  triggerClassName,
  emptyLabel = "Unassigned",
  single = false,
}: {
  users: User[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
  align?: "start" | "center" | "end";
  triggerClassName?: string;
  emptyLabel?: string;
  single?: boolean;
}) => {
  const selected = users.filter((u) => selectedIds.includes(u.id));
  const triggerTitle = selected.length
    ? selected.map((u) => u.name).join(", ")
    : emptyLabel;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "w-full justify-start h-10 px-3 bg-background border-border text-foreground",
            triggerClassName,
          )}
          title={triggerTitle}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {selected.length ? (
              <>
                {single ? (
                  <>
                    <UserAvatar
                      src={selected[0].image || undefined}
                      name={selected[0].name}
                      className="h-6 w-6 border-2 border-background"
                    />
                    <span className="text-sm truncate">{selected[0].name}</span>
                  </>
                ) : (
                  <>
                    <div className="flex -space-x-2">
                      {selected.slice(0, 3).map((u) => (
                        <UserAvatar
                          key={u.id}
                          src={u.image || undefined}
                          name={u.name}
                          className="h-6 w-6 border-2 border-background"
                        />
                      ))}
                      {selected.length > 3 && (
                        <span className="text-[11px] text-muted-foreground ml-2">
                          +{selected.length - 3}
                        </span>
                      )}
                    </div>
                    <span className="text-sm truncate">
                      {selected.map((u) => u.name).join(", ")}
                    </span>
                  </>
                )}
              </>
            ) : (
              <>
                <UserAvatar />
                <span className="text-sm text-muted-foreground">
                  {emptyLabel}
                </span>
              </>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContentAny className="w-72" align={align}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            Assignees
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onChange([])}
            disabled={!selectedIds.length}
          >
            Clear
          </Button>
        </div>
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => onChange([])}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded border text-left transition",
              selectedIds.length === 0
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "border-transparent hover:bg-muted/50",
            )}
          >
            <Check
              className={cn(
                "h-4 w-4 text-indigo-600",
                selectedIds.length === 0 ? "" : "opacity-0",
              )}
            />
            <UserAvatar />
            <span className="text-sm">{emptyLabel}</span>
          </button>
          {users.map((u) => {
            const checked = selectedIds.includes(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  const next = checked
                    ? selectedIds.filter((id) => id !== u.id)
                    : single
                      ? [u.id]
                      : uniq([...selectedIds, u.id]);
                  onChange(next);
                }}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded border text-left transition",
                  checked
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                    : "border-transparent hover:bg-muted/50",
                )}
              >
                <Check
                  className={cn(
                    "h-4 w-4 text-indigo-600",
                    checked ? "" : "opacity-0",
                  )}
                />
                <UserAvatar src={u.image || undefined} name={u.name} />
                <span className="text-sm">{u.name}</span>
              </button>
            );
          })}
          {!users.length && (
            <span className="text-sm text-muted-foreground">
              No users available
            </span>
          )}
        </div>
      </PopoverContentAny>
    </Popover>
  );
};

const TASK_GRID =
  "grid gap-x-3 gap-y-3 grid-cols-[minmax(260px,1.5fr)_150px_110px_220px_180px_140px_140px_60px] items-center";
const TABLE_MIN_WIDTH = "min-w-[1250px] xl:min-w-[1350px]";

export default function DashboardPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    null,
  );
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatusIds, setFilterStatusIds] = useState<string[]>([]);
  const [filterPriorities, setFilterPriorities] = useState<string[]>([]);
  const [filterAssigneeIds, setFilterAssigneeIds] = useState<string[]>([]);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [boardLoading, setBoardLoading] = useState(true);
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
  const [newTaskTagIds, setNewTaskTagIds] = useState<string[]>([]);
  const [newTaskAssigneeIds, setNewTaskAssigneeIds] = useState<string[]>([]);
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskStartDate, setNewTaskStartDate] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDesc, setEditTaskDesc] = useState("");
  const [editTaskStatusId, setEditTaskStatusId] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState<Task["priority"]>("medium");
  const [editTaskTagIds, setEditTaskTagIds] = useState<string[]>([]);
  const [editTaskAssigneeIds, setEditTaskAssigneeIds] = useState<string[]>([]);
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
  const [showTagManager, setShowTagManager] = useState(false);
  const [deletedTags, setDeletedTags] = useState<Tag[]>([]);
  const [tagManagerLoading, setTagManagerLoading] = useState(false);
  const [tagActionLoading, setTagActionLoading] = useState(false);
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
  );

const toggleNewTagSelection = (id: string) => {
  setTagSelection("new", id);
};

const toggleEditTagSelection = (id: string) => {
  setTagSelection("edit", id);
};

  const setTagSelection = (mode: "new" | "edit", id: string) => {
    const currentRaw = mode === "new" ? newTaskTagIds : editTaskTagIds;
    const updater = mode === "new" ? setNewTaskTagIds : setEditTaskTagIds;
    const current = uniq(currentRaw);
    const isSelected = current.includes(id);

    if (!isSelected && current.length >= TAG_LIMIT) {
      toast.error(`You can add up to ${TAG_LIMIT} tags per task.`);
      return;
    }

    updater((prev) => {
      const base = uniq(prev);
      return base.includes(id)
        ? base.filter((t) => t !== id)
        : uniq([...base, id]);
    });
  };

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
    setBoardLoading(true);
    try {
      const res = await fetch(`/api/boards?workspace_id=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setBoards(data);
        if (data.length > 0 && !selectedBoard) {
          setSelectedBoard(data[0]);
        } else if (data.length === 0) {
          setBoardLoading(false);
        }
      }
    } catch {
      toast.error("Failed to load boards");
      setBoardLoading(false);
    }
  }, []);

  // Fetch board data (statuses, tags, tasks)
  const fetchBoardData = useCallback(async (boardId: string, workspaceId?: string) => {
    setBoardLoading(true);
    try {
      const [statusRes, taskRes] = await Promise.all([
        fetch(`/api/statuses?board_id=${boardId}`),
        fetch(`/api/tasks?board_id=${boardId}`),
      ]);

      if (statusRes.ok) setStatuses(await statusRes.json());
      if (workspaceId) {
        const tagRes = await fetch(`/api/tags?workspace_id=${workspaceId}`);
        if (tagRes.ok) setTags(uniqTags(await tagRes.json()));
        else setTags([]);
      } else {
        setTags([]);
      }
      if (taskRes.ok) setTasks((await taskRes.json()).map(normalizeTask));
    } catch {
      toast.error("Failed to load board data");
    } finally {
      setBoardLoading(false);
    }
  }, []);

  const handleCreateTag = useCallback(async () => {
    if (!selectedWorkspace || !newTagName.trim()) return;
    const trimmed = newTagName.trim();
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          workspaceId: selectedWorkspace.id,
        }),
      });
      const tryAttachExisting = async () => {
        const findExisting = (list: Tag[]) =>
          list.find(
            (t) =>
              t.workspaceId === selectedWorkspace.id &&
              t.name.toLowerCase() === trimmed.toLowerCase(),
          ) || null;

        let tagToAdd = findExisting(tags);

        if (!tagToAdd) {
          const refetch = await fetch(
            `/api/tags?workspace_id=${selectedWorkspace.id}`,
          );
          if (refetch.ok) {
            const refreshed = await refetch.json();
            setTags(uniqTags(refreshed));
            tagToAdd = findExisting(refreshed);
          }
        }

        if (!tagToAdd) return false;

        const currentSelected = editingTask ? editTaskTagIds : newTaskTagIds;
        if (currentSelected.length >= TAG_LIMIT) {
          toast.warning(`Tag exists, but limit of ${TAG_LIMIT} tags reached.`);
          return true;
        }

        const selectFn = editingTask ? setEditTaskTagIds : setNewTaskTagIds;
        selectFn((prev) =>
          prev.includes(tagToAdd.id) ? uniq(prev) : uniq([...prev, tagToAdd.id]),
        );
        setNewTagName("");
        toast.success("Tag added");
        return true;
      };

      if (res.ok) {
        const tag = await res.json();
        setTags((prev) => uniqTags([...prev, tag]));
        const currentSelected = editingTask ? editTaskTagIds : newTaskTagIds;
        if (currentSelected.length >= TAG_LIMIT) {
          toast.warning(`Tag created, but limit of ${TAG_LIMIT} tags reached.`);
        } else {
          const selectFn = editingTask ? setEditTaskTagIds : setNewTaskTagIds;
          selectFn((prev) =>
            prev.includes(tag.id) ? uniq(prev) : uniq([...prev, tag.id]),
          );
        }
        setNewTagName("");
        toast.success("Tag created");
      } else {
        const data = await res.json().catch(() => null);
        const duplicate =
          res.status === 409 ||
          (res.status === 400 &&
            (data?.error || "")
              .toString()
              .toLowerCase()
              .includes("unique constraint"));
        if (duplicate) {
          const attached = await tryAttachExisting();
          if (!attached) toast.error("Tag already exists in this workspace");
        } else {
          toast.error(data?.error || "Failed to create tag");
        }
      }
    } catch {
      toast.error("Failed to create tag");
    }
  }, [newTagName, selectedWorkspace, tags, editingTask, editTaskTagIds, newTaskTagIds]);

  const refreshDeletedTags = useCallback(async () => {
    if (!selectedWorkspace) return;
    setTagManagerLoading(true);
    try {
      const res = await fetch(
        `/api/tags?workspace_id=${selectedWorkspace.id}&deleted=true`,
      );
      if (res.ok) {
        setDeletedTags(await res.json());
      } else {
        setDeletedTags([]);
      }
    } catch {
      toast.error("Failed to load tag trash");
      setDeletedTags([]);
    } finally {
      setTagManagerLoading(false);
    }
  }, [selectedWorkspace]);

  const handleSoftDeleteTag = async (tagId: string) => {
    if (!selectedWorkspace) return;
    try {
      setTagActionLoading(true);
      const res = await fetch(`/api/tags/${tagId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Failed to move tag to trash");
        return;
      }

      setTags((prev) => prev.filter((t) => t.id !== tagId));
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          tags: (t.tags ?? []).filter((tag) => tag.id !== tagId),
        })),
      );
      setNewTaskTagIds((prev) => prev.filter((id) => id !== tagId));
      setEditTaskTagIds((prev) => prev.filter((id) => id !== tagId));
      setFilterTagIds((prev) => prev.filter((id) => id !== tagId));
      toast.success("Tag enviada para a lixeira");
      await refreshDeletedTags();
    } catch {
      toast.error("Failed to move tag to trash");
    } finally {
      setTagActionLoading(false);
    }
  };

  const handleRestoreTag = async (tagId: string) => {
    if (!selectedWorkspace) return;
    try {
      setTagActionLoading(true);
      const res = await fetch(`/api/tags/${tagId}`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Failed to restore tag");
        return;
      }
      const data = await res.json().catch(() => null);
      const restored = (data as any)?.tag ?? data;
      if (restored) {
        setDeletedTags((prev) => prev.filter((t) => t.id !== tagId));
        setTags((prev) => uniqTags([...prev, restored as Tag]));
        toast.success("Tag restaurada");
      }
    } catch {
      toast.error("Failed to restore tag");
    } finally {
      setTagActionLoading(false);
    }
  };

  const handleHardDeleteTag = async (tagId: string) => {
    if (!selectedWorkspace) return;
    try {
      setTagActionLoading(true);
      const res = await fetch(`/api/tags/${tagId}?hard=true`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Failed to delete tag permanently");
        return;
      }
      setDeletedTags((prev) => prev.filter((t) => t.id !== tagId));
      toast.success("Tag removida permanentemente");
    } catch {
      toast.error("Failed to delete tag permanently");
    } finally {
      setTagActionLoading(false);
    }
  };

  const handlePurgeDeletedTags = async () => {
    if (!selectedWorkspace) return;
    try {
      setTagActionLoading(true);
      const res = await fetch(
        `/api/tags?workspace_id=${selectedWorkspace.id}&purge=true`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Failed to empty trash");
        return;
      }
      setDeletedTags([]);
      toast.success("Lixeira esvaziada");
    } catch {
      toast.error("Failed to empty trash");
    } finally {
      setTagActionLoading(false);
    }
  };

  useEffect(() => {
    if (showTagManager) {
      refreshDeletedTags();
    }
  }, [showTagManager, refreshDeletedTags]);

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
      "moodlr.com",
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

      // moodlr
      "moodler.com": "moodlr.com",
      "modlr.com": "moodlr.com",

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

  // Keep a ref so the board-data effect always reads the latest workspace
  // without needing it as a dependency (which caused a spurious re-fetch).
  const workspaceRef = useRef(selectedWorkspace);
  workspaceRef.current = selectedWorkspace;

  useEffect(() => {
    if (selectedWorkspace) {
      setSelectedBoard(null);
      setBoards([]);
      fetchBoards(selectedWorkspace.id);
    }
  }, [selectedWorkspace, fetchBoards]);

  useEffect(() => {
    if (selectedBoard) {
      setBoardLoading(true);
      setTasks([]);
      fetchBoardData(selectedBoard.id, workspaceRef.current?.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBoard, fetchBoardData]);

  useEffect(() => {
    setDeletedTags([]);
    setShowTagManager(false);
  }, [selectedWorkspace?.id]);

  useEffect(() => {
    setFilterStatusIds([]);
    setFilterPriorities([]);
    setFilterAssigneeIds([]);
    setFilterTagIds([]);
  }, [selectedBoard?.id]);

  useEffect(() => {
    const used = new Set(
      tasks.flatMap((t) => (t.tags ? t.tags.map((tag) => tag.id) : [])),
    );
    setFilterTagIds((prev) => prev.filter((id) => used.has(id)));
  }, [tasks]);

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
          setTags([]);
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
          setTags([]);
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
          groupId: null,
          assigneeIds: newTaskAssigneeIds,
          startDate: newTaskStartDate || null,
          dueDate: newTaskDueDate || null,
          tagIds: newTaskTagIds.slice(0, TAG_LIMIT),
        }),
      });
      if (res.ok) {
        const task = normalizeTask(await res.json());
        setTasks((prev) => [...prev, task]);
        setNewTaskTitle("");
        setNewTaskDesc("");
        setNewTaskPriority("medium");
        setNewTaskStatusId("");
        setNewTaskTagIds([]);
        setNewTaskAssigneeIds([]);
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
        const updated = normalizeTask(await res.json());
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)),
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

  const handleUpdateTaskAssignees = async (
    taskId: string,
    assigneeIds: string[],
  ) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeIds }),
      });
      if (res.ok) {
        const updated = normalizeTask(await res.json());
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)),
        );
        toast.success("Assignees updated");
      }
    } catch {
      toast.error("Failed to update assignees");
    }
  };

  // Backward-compatible alias to match previous prop name
  const handleUpdateTaskAssignee = handleUpdateTaskAssignees;

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
        const updated = normalizeTask(await res.json());
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
        const updated = normalizeTask(await res.json());
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
    setEditTaskTagIds(
      uniq(task.tags?.map((t) => t.id).slice(0, TAG_LIMIT) || []),
    );
    setEditTaskAssigneeIds(getAssigneeIds(task));
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
          tagIds: editTaskTagIds.slice(0, TAG_LIMIT),
          assigneeIds: editTaskAssigneeIds,
          startDate: editTaskStartDate || null,
          dueDate: editTaskDueDate || null,
        }),
      });
      if (res.ok) {
        const updated = normalizeTask(await res.json());
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
        const updated = normalizeTask(await res.json());
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

  const hasActiveFilters =
    filterStatusIds.length > 0 ||
    filterPriorities.length > 0 ||
    filterAssigneeIds.length > 0 ||
    filterTagIds.length > 0;

  const usedTagIds = new Set(
    tasks.flatMap((t) => (t.tags ? t.tags.map((tag) => tag.id) : [])),
  );
  const filterableTags = tags.filter((tag) => usedTagIds.has(tag.id));

  const toggleStatusFilter = (id: string) =>
    setFilterStatusIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );

  const togglePriorityFilter = (id: string) =>
    setFilterPriorities((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );

  const toggleTagFilter = (id: string) =>
    setFilterTagIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );

  const clearFilters = () => {
    setFilterStatusIds([]);
    setFilterPriorities([]);
    setFilterAssigneeIds([]);
    setFilterTagIds([]);
  };

  const filteredTasks = [...tasks]
    .sort((a, b) => a.order - b.order)
    .filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (filterStatusIds.length) {
        if (!t.statusId || !filterStatusIds.includes(t.statusId)) return false;
      }
      if (filterPriorities.length) {
        if (!filterPriorities.includes(t.priority)) return false;
      }
      if (filterAssigneeIds.length) {
        const ids = getAssigneeIds(t);
        if (!ids.some((id) => filterAssigneeIds.includes(id))) return false;
      }
      if (filterTagIds.length) {
        const taskTagIds = (t.tags ?? []).map((tag) => tag.id);
        if (!taskTagIds.some((id) => filterTagIds.includes(id))) return false;
      }

      return true;
    });

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
                alt="Moodlr Tasks"
                width={24}
                height={24}
                className="h-6 w-6"
                priority
              />
            </div>
            <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Moodlr Tasks
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
            <DialogDescription className="sr-only">
              Update the selected task details.
            </DialogDescription>
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
              <TagListSelect
                tags={tags}
                selectedIds={editTaskTagIds}
                onToggle={toggleEditTagSelection}
                onRemove={(id) =>
                  setEditTaskTagIds((prev) => prev.filter((t) => t !== id))
                }
                limit={TAG_LIMIT}
                newTagName={newTagName}
                onNewTagNameChange={setNewTagName}
                onCreate={handleCreateTag}
                onTrash={(id) => handleSoftDeleteTag(id)}
              />
              <div>
                <Label>Assignees (optional)</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {users.map((u) => {
                    const checked = editTaskAssigneeIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() =>
                          setEditTaskAssigneeIds((prev) =>
                            prev.includes(u.id)
                              ? prev.filter((id) => id !== u.id)
                              : [...prev, u.id],
                          )
                        }
                        className={cn(
                          "px-2 py-1 rounded border text-sm",
                          checked
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-card text-foreground",
                        )}
                      >
                        {u.name}
                      </button>
                    );
                  })}
                  {editTaskAssigneeIds.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditTaskAssigneeIds([])}
                    >
                      Clear
                    </Button>
                  )}
                </div>
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
                  <PopoverContentAny className="p-0" align="start">
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
                  </PopoverContentAny>
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
                  <PopoverContentAny className="p-0" align="start">
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
                  </PopoverContentAny>
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
                    <DialogDescription className="sr-only">
                      Create a new task for the selected board.
                    </DialogDescription>
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
              <TagListSelect
                tags={tags}
                selectedIds={newTaskTagIds}
                onToggle={toggleNewTagSelection}
                onRemove={(id) =>
                  setNewTaskTagIds((prev) => prev.filter((t) => t !== id))
                }
                limit={TAG_LIMIT}
                newTagName={newTagName}
                onNewTagNameChange={setNewTagName}
                onCreate={handleCreateTag}
                onTrash={(id) => handleSoftDeleteTag(id)}
              />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Assignees (optional)</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {users.map((u) => {
                            const checked = newTaskAssigneeIds.includes(u.id);
                            return (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() =>
                                  setNewTaskAssigneeIds((prev) =>
                                    prev.includes(u.id)
                                      ? prev.filter((id) => id !== u.id)
                                      : [...prev, u.id],
                                  )
                                }
                                className={cn(
                                  "px-2 py-1 rounded border text-sm",
                                  checked
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    : "bg-card text-foreground",
                                )}
                              >
                                {u.name}
                              </button>
                            );
                          })}
                          {newTaskAssigneeIds.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setNewTaskAssigneeIds([])}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
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
                            <PopoverContentAny className="p-0" align="start">
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
                </PopoverContentAny>
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
                            <PopoverContentAny className="p-0" align="start">
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
                </PopoverContentAny>
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

        {selectedBoard && (
          <div className="border-b border-border bg-card/50 px-4 py-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase font-semibold text-muted-foreground">
              Filters
            </span>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  Status{filterStatusIds.length ? ` (${filterStatusIds.length})` : ""}
                </Button>
              </PopoverTrigger>
              <PopoverContentAny className="w-60" align="start">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Status
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setFilterStatusIds([])}
                    disabled={!filterStatusIds.length}
                  >
                    Clear
                  </Button>
                </div>
                <div className="flex flex-col gap-1">
                  {statuses.map((s) => {
                    const checked = filterStatusIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStatusFilter(s.id)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded border text-left transition",
                          checked
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                            : "border-transparent hover:bg-muted/50",
                        )}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 text-indigo-600",
                            checked ? "" : "opacity-0",
                          )}
                        />
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="text-sm">{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContentAny>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  Priority{filterPriorities.length ? ` (${filterPriorities.length})` : ""}
                </Button>
              </PopoverTrigger>
              <PopoverContentAny className="w-56" align="start">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Priority
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setFilterPriorities([])}
                    disabled={!filterPriorities.length}
                  >
                    Clear
                  </Button>
                </div>
                <div className="flex flex-col gap-1">
                  {Object.entries(priorityConfig).map(([key, cfg]) => {
                    const checked = filterPriorities.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => togglePriorityFilter(key)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded border text-left transition",
                          checked
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                            : "border-transparent hover:bg-muted/50",
                        )}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 text-indigo-600",
                            checked ? "" : "opacity-0",
                          )}
                        />
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: cfg.color }}
                        />
                        <span className="text-sm">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContentAny>
            </Popover>

            <div className="min-w-[220px] max-w-[280px]">
              <AssigneePicker
                users={users}
                selectedIds={filterAssigneeIds}
                onChange={(next) => setFilterAssigneeIds(next)}
                triggerClassName="h-9"
                single
                emptyLabel="Any assignee"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  Tags{filterTagIds.length ? ` (${filterTagIds.length})` : ""}
                </Button>
              </PopoverTrigger>
              <PopoverContentAny className="w-64" align="start">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Tags
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setFilterTagIds([])}
                    disabled={!filterTagIds.length}
                  >
                    Clear
                  </Button>
                </div>
                <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
                  {filterableTags.map((tag) => {
                    const checked = filterTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTagFilter(tag.id)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded border text-left transition",
                          checked
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                            : "border-transparent hover:bg-muted/50",
                        )}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 text-indigo-600",
                            checked ? "" : "opacity-0",
                          )}
                        />
                        <span className="text-sm">{tag.name}</span>
                      </button>
                    );
                  })}
                  {!filterableTags.length && (
                    <span className="text-sm text-muted-foreground">
                      No tags on tasks
                    </span>
                  )}
                </div>
              </PopoverContentAny>
            </Popover>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              onClick={() => setShowTagManager(true)}
              disabled={!selectedWorkspace}
            >
              <Trash2 className="h-4 w-4" />
              Lixeira de tags
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
            >
              Clear filters
            </Button>
          </div>
        )}

        <Dialog open={showTagManager} onOpenChange={setShowTagManager}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Gerenciar tags</DialogTitle>
              <DialogDescription>
                Envie tags para a lixeira, restaure-as ou esvazie a lixeira do workspace.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Tags ativas</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshDeletedTags}
                    disabled={tagManagerLoading}
                  >
                    Atualizar lixeira
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {tags.length ? (
                    tags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between gap-2 rounded border border-border px-3 py-2"
                      >
                        <span className="text-sm truncate">{tag.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleSoftDeleteTag(tag.id)}
                          disabled={tagActionLoading}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Lixeira
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma tag ativa neste workspace.
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Lixeira</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePurgeDeletedTags}
                    disabled={!deletedTags.length || tagActionLoading}
                  >
                    Esvaziar lixeira
                  </Button>
                </div>

                {tagManagerLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando tags removidas...
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {deletedTags.length ? (
                      deletedTags.map((tag) => (
                        <div
                          key={tag.id}
                          className="flex items-center justify-between gap-2 rounded border border-border px-3 py-2"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{tag.name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestoreTag(tag.id)}
                              disabled={tagActionLoading}
                            >
                              Restaurar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleHardDeleteTag(tag.id)}
                              disabled={tagActionLoading}
                            >
                              Apagar
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma tag na lixeira.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Board Content */}
        <div className="flex-1 overflow-auto p-1 sm:p-2 md:p-3 lg:p-4">
          {selectedBoard ? (
            <div className="w-full px-0">
              {/* Tabela com scroll controlado (>=1200px) */}
              <div className="task-table-view">
                <div className="relative bg-card border border-border rounded-lg shadow-sm w-full overflow-x-auto overflow-y-hidden nice-scrollbar tasks-scroll min-h-[60vh] px-1 sm:px-2">
                  {/* Progress bar during loading */}
                  {boardLoading && (
                    <div className="absolute top-0 left-0 right-0 z-20 h-1 overflow-hidden rounded-t-lg bg-primary/10">
                      <div className="h-full w-1/3 bg-primary rounded-full animate-[progress_1.2s_ease-in-out_infinite]" />
                    </div>
                  )}

                  <div
                    className={`${TASK_GRID} ${TABLE_MIN_WIDTH} px-3 py-3 xl:px-5 xl:py-3.5 text-[11px] font-medium tracking-wide text-muted-foreground border-b border-white/5 items-center`}
                  >
                    <span>Task</span>
                    <span>Status</span>
                    <span className="text-center">Priority</span>
                    <span className="text-center">Tags</span>
                    <span>Assignee</span>
                    <span>Start date</span>
                    <span>Due date</span>
                    <span className="justify-self-end pr-2 text-right">
                      Actions
                    </span>
                  </div>

                  {(loading || boardLoading) && filteredTasks.length === 0 ? (
                    <div className="py-10 flex flex-col items-center gap-4 text-sm text-primary">
                      <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-primary/40 bg-primary/5 shadow-lg">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="font-semibold tracking-wide">
                          Carregando tasks...
                        </span>
                      </div>
                      <div className="space-y-2 w-full">
                        {[...Array(5)].map((_, idx) => (
                          <div
                            key={idx}
                            className="animate-pulse rounded-md border border-border/60 bg-muted/40 shadow-sm"
                            style={{ animationDelay: `${idx * 100}ms` }}
                          >
                            <div className={`${TASK_GRID} ${TABLE_MIN_WIDTH} px-3 py-3 xl:px-5 xl:py-3.5 items-center`}>
                              <div className="h-3 w-52 rounded bg-primary/15" />
                              <div className="h-3 w-24 rounded bg-primary/12 justify-self-center" />
                              <div className="h-3 w-20 rounded bg-primary/12 justify-self-center" />
                              <div className="h-3 w-24 rounded bg-primary/12 justify-self-center" />
                              <div className="h-3 w-24 rounded bg-primary/12" />
                              <div className="h-3 w-24 rounded bg-primary/12" />
                              <div className="h-3 w-24 rounded bg-primary/12" />
                              <div className="h-3 w-16 rounded bg-primary/12 justify-self-end" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                      No tasks found. Create one to get started.
                    </div>
                  ) : (
                    <div className={cn("transition-opacity duration-200", boardLoading && "opacity-50 pointer-events-none")}>
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
                              users={users}
                              onStatusChange={handleUpdateTaskStatus}
                              onDelete={handleDeleteTask}
                              onAssigneeChange={handleUpdateTaskAssignee}
                              onStartDateChange={handleUpdateTaskStartDate}
                              onDueDateChange={handleUpdateTaskDueDate}
                              onPriorityChange={handleUpdateTaskPriority}
                              onEditTask={beginEditTask}
                              tagFilters={filterTagIds}
                              onTagFilter={toggleTagFilter}
                              assigneeMode="multi"
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                    </div>
                  )}
                </div>
              </div>

              {/* Card view para telas menores (<1200px) */}
              <div className="task-card-view space-y-3">
                {boardLoading && filteredTasks.length === 0 ? (
                  <div className="py-8 flex items-center justify-center text-muted-foreground text-sm">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Carregando tasks...
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    No tasks found. Create one to get started.
                  </div>
                ) : (
                  filteredTasks.map((task) => {
                    const priority = priorityConfig[task.priority];
                    const assigneeIds = getAssigneeIds(task);

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
                            Tags
                          </Label>
                          <div className="flex flex-wrap gap-1">
                            {task.tags && task.tags.length > 0 ? (
                              <>
                                {task.tags.slice(0, 4).map((tag) => {
                                  const active = filterTagIds.includes(tag.id);
                                  return (
                                    <button
                                      key={tag.id}
                                      type="button"
                                        onClick={() => toggleTagFilter(tag.id)}
                                        className={cn(
                                          "px-2 py-0.5 rounded-full border text-xs",
                                          active
                                            ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                            : "bg-muted/50 border-border text-foreground",
                                        )}
                                    >
                                      {tag.name}
                                    </button>
                                  );
                                })}
                                <HiddenTagsPopover
                                  hidden={task.tags.slice(4)}
                                  onToggle={toggleTagFilter}
                                />
                              </>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                  -
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Label className="text-[11px] text-muted-foreground">
                              Assignees
                            </Label>
                            <div className="flex-1">
                              <AssigneePicker
                                users={users}
                                selectedIds={assigneeIds}
                                onChange={(next) =>
                                  handleUpdateTaskAssignees(task.id, next)
                                }
                                triggerClassName="max-w-[240px]"
                                align="end"
                              />
                            </div>
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
  users: User[];
  assigneeMode?: "single" | "multi";
  onStatusChange: (taskId: string, statusId: string) => void;
  onDelete: (taskId: string) => void;
  onAssigneeChange: (taskId: string, assigneeIds: string[]) => void;
  onStartDateChange: (taskId: string, startDate: string) => void;
  onDueDateChange: (taskId: string, dueDate: string) => void;
  onPriorityChange: (taskId: string, priority: Task["priority"]) => void;
  onEditTask: (task: Task) => void;
  tagFilters: string[];
  onTagFilter: (tagId: string) => void;
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
      <PopoverContentAny className="p-2 w-auto" align="start">
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
      </PopoverContentAny>
    </Popover>
  );
};

function SortableTaskRow({
  rowIndex: _rowIndex,
  task,
  statuses,
  users,
  assigneeMode = "multi",
  onStatusChange,
  onDelete,
  onAssigneeChange,
  onStartDateChange,
  onDueDateChange,
  onPriorityChange,
  onEditTask,
  tagFilters,
  onTagFilter,
}: RowProps) {
  const priority = priorityConfig[task.priority];
  const assigneeIds = getAssigneeIds(task);
  const tagsList = task.tags ?? [];
  const visibleTags = tagsList.slice(0, 4);
  const hiddenTags = tagsList.slice(4);

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

      <div className="flex items-center justify-center min-w-0">
        {tagsList.length > 0 ? (
          <div className="flex flex-wrap gap-1 justify-center">
            {visibleTags.map((tag) => {
              const active = tagFilters.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onTagFilter(tag.id)}
                  className={cn(
                    "px-2 py-0.5 rounded-full border text-xs transition",
                    active
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-muted/40 border-border text-foreground hover:bg-muted",
                  )}
                >
                  {tag.name}
                </button>
              );
            })}
            <HiddenTagsPopover hidden={hiddenTags} onToggle={onTagFilter} />
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )}
      </div>

      <div className="flex items-center justify-center min-w-0">
        <AssigneePicker
          users={users}
          selectedIds={assigneeIds}
          onChange={(next) => onAssigneeChange(task.id, next)}
          single={assigneeMode === "single"}
          triggerClassName="max-w-[240px]"
        />
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
