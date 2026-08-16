import {
  AlertTriangle,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Copy,
  Download,
  Eye,
  FileImage,
  FileText,
  Folder,
  FolderPlus,
  Link2,
  LogOut,
  Moon,
  MoveRight,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Share2,
  Shield,
  Sun,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  Children,
  type ChangeEvent,
  type FormEvent,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { PdfViewer } from "@/components/PdfViewer";
import { cn } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:3000";
const TOKEN_KEY = "data-room-token";
const THEME_KEY = "data-room-theme";

type Role = "OWNER" | "EDITOR" | "VIEWER";

type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type DataRoom = {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner?: Pick<User, "id" | "name" | "email">;
};

type Member = {
  id: string;
  dataRoomId: string;
  userId: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  user: Pick<User, "id" | "name" | "email">;
};

type StoredFile = {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  version: number;
  storageKey: string;
  folderId: string;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
};

type SharedFile = StoredFile & {
  previewUrl: string;
  downloadUrl: string;
};

type FolderNode = {
  id: string;
  name: string;
  dataRoomId: string;
  parentId: string | null;
  files: StoredFile[];
  children: FolderNode[];
  createdAt: string;
  updatedAt: string;
};

type SharedFolderNode = Omit<FolderNode, "files" | "children"> & {
  files: SharedFile[];
  children: SharedFolderNode[];
};

type AuthMode = "login" | "register";
type Theme = "light" | "dark";
type ShareTargetType = "DATA_ROOM" | "FOLDER" | "FILE";
type ShareMode = "PUBLIC" | "PERMISSIONED";

type Share = {
  id: string;
  dataRoomId: string;
  targetType: ShareTargetType;
  targetId: string;
  mode: ShareMode;
  token: string;
  recipientUserId?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  recipientUser?: Pick<User, "id" | "name" | "email"> | null;
};

type UploadQueueItem = {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
};

type ShareTarget = {
  type: ShareTargetType;
  id: string;
  label: string;
};

type SharedPayload = {
  share: Share;
  target:
    | { type: "DATA_ROOM"; room: Pick<DataRoom, "id" | "name" | "description">; folders: SharedFolderNode[] }
    | { type: "FOLDER"; folder: SharedFolderNode }
    | { type: "FILE"; file: SharedFile };
};

type ApiOptions = RequestInit & {
  token?: string | null;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers, ...requestOptions } = options;
  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers: {
      ...(requestOptions.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(payload?.message ?? "Request failed", response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function flattenFolders(folders: FolderNode[]): FolderNode[] {
  return folders.flatMap((folder) => [folder, ...flattenFolders(folder.children)]);
}

function findFolderPath(folders: FolderNode[], folderId: string | null): FolderNode[] {
  if (!folderId) {
    return [];
  }

  for (const folder of folders) {
    if (folder.id === folderId) {
      return [folder];
    }

    const childPath = findFolderPath(folder.children, folderId);

    if (childPath.length) {
      return [folder, ...childPath];
    }
  }

  return [];
}

function App() {
  const sharedToken = window.location.pathname.match(/^\/shared\/([^/]+)/)?.[1] ?? null;
  const [sharedPayload, setSharedPayload] = useState<SharedPayload | null>(null);
  const [sharedError, setSharedError] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);

    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<DataRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("123456");
  const [name, setName] = useState("Test User");
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [folderName, setFolderName] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("VIEWER");
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<StoredFile | null>(null);
  const [fileName, setFileName] = useState("");
  const [destinationFolderId, setDestinationFolderId] = useState("");
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const [shares, setShares] = useState<Share[]>([]);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [shareMode, setShareMode] = useState<ShareMode>("PUBLIC");
  const [shareRecipientUserId, setShareRecipientUserId] = useState("");
  const [isDraggingUpload, setDraggingUpload] = useState(false);
  const [isRoomModalOpen, setRoomModalOpen] = useState(false);
  const [isFolderModalOpen, setFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isMemberModalOpen, setMemberModalOpen] = useState(false);
  const [isPreviewModalOpen, setPreviewModalOpen] = useState(false);
  const [isFileManageModalOpen, setFileManageModalOpen] = useState(false);
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [isProjectsOpen, setProjectsOpen] = useState(true);
  const [isMembersOpen, setMembersOpen] = useState(true);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;
  const flatFolders = useMemo(() => flattenFolders(folders), [folders]);
  const selectedFolder = flatFolders.find((folder) => folder.id === selectedFolderId) ?? null;
  const currentMember = members.find((member) => member.userId === user?.id);
  const canManage = currentMember?.role === "OWNER" || currentMember?.role === "EDITOR";
  const canManageMembers = currentMember?.role === "OWNER";
  const fileCount = flatFolders.reduce((total, folder) => total + folder.files.length, 0);
  const selectedFolderPath = useMemo(() => findFolderPath(folders, selectedFolderId), [folders, selectedFolderId]);
  const shellGridClass = cn(
    "grid min-h-[calc(100vh-65px)] grid-cols-1 transition-[grid-template-columns]",
    isProjectsOpen && isMembersOpen && "lg:grid-cols-[300px_minmax(360px,1fr)_380px]",
    !isProjectsOpen && isMembersOpen && "lg:grid-cols-[72px_minmax(360px,1fr)_380px]",
    isProjectsOpen && !isMembersOpen && "lg:grid-cols-[300px_minmax(360px,1fr)_72px]",
    !isProjectsOpen && !isMembersOpen && "lg:grid-cols-[72px_minmax(360px,1fr)_72px]",
  );
  const contentGridClass = "mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]";

  useEffect(() => {
    if (!sharedToken) {
      return;
    }

    void apiRequest<SharedPayload>(`/shares/${sharedToken}`)
      .then(setSharedPayload)
      .catch((error: unknown) => {
        setSharedError(error instanceof Error ? error.message : "Share link unavailable");
      });
  }, [sharedToken]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  async function bootstrapSession(activeToken: string) {
    try {
      setLoading(true);
      const [me, roomList] = await Promise.all([
        apiRequest<User>("/users/me", { token: activeToken }),
        apiRequest<DataRoom[]>("/data-rooms", { token: activeToken }),
      ]);

      setUser(me);
      setRooms(roomList);
      setSelectedRoomId((current) => current ?? roomList[0]?.id ?? null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Session expired");
      logout();
    } finally {
      setLoading(false);
    }
  }

  async function loadRoomDetails(roomId: string, activeToken = token) {
    if (!activeToken) {
      return;
    }

    const [memberList, folderTree] = await Promise.all([
      apiRequest<Member[]>(`/data-rooms/${roomId}/members`, { token: activeToken }),
      apiRequest<FolderNode[]>(`/data-rooms/${roomId}/folders/tree`, { token: activeToken }),
    ]);

    setMembers(memberList);
    setFolders(folderTree);
    const currentUserMember = memberList.find((member) => member.userId === user?.id);
    if (currentUserMember?.role === "OWNER") {
      void loadShares(roomId, activeToken);
    } else {
      setShares([]);
    }
    setSelectedFolderId((current) => {
      const foldersFlat = flattenFolders(folderTree);
      return current && foldersFlat.some((folder) => folder.id === current)
        ? current
        : foldersFlat[0]?.id ?? null;
    });
  }

  async function loadShares(roomId: string, activeToken = token) {
    if (!activeToken) {
      return;
    }

    try {
      const result = await apiRequest<Share[]>(`/data-rooms/${roomId}/shares`, {
        token: activeToken,
      });
      setShares(result);
    } catch {
      setShares([]);
    }
  }

  useEffect(() => {
    if (!token) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void bootstrapSession(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || !selectedRoomId) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRoomDetails(selectedRoomId, token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId, token]);

  useEffect(() => {
    if (!token || (!isMemberModalOpen && !isShareModalOpen) || users.length) {
      return;
    }

    void apiRequest<User[]>("/users", { token })
      .then((result) => {
        setUsers(result);
        setSelectedUserId(result[0]?.id ?? "");
      })
      .catch((error: unknown) => {
        setNotice(error instanceof Error ? error.message : "Could not load users");
      });
  }, [isMemberModalOpen, isShareModalOpen, token, users.length]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setNotice("");

    try {
      const payload =
        authMode === "login"
          ? { email, password }
          : {
              email,
              password,
              name,
            };
      const response = await apiRequest<{ accessToken: string; user: User }>(`/auth/${authMode}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      localStorage.setItem(TOKEN_KEY, response.accessToken);
      setToken(response.accessToken);
      setUser(response.user);
      setNotice("Signed in");
      await bootstrapSession(response.accessToken);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setRooms([]);
    setMembers([]);
    setFolders([]);
    setSelectedRoomId(null);
    setSelectedFolderId(null);
  }

  if (sharedToken) {
    return <SharedView error={sharedError} payload={sharedPayload} />;
  }

  async function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !roomName.trim()) {
      return;
    }

    const room = await apiRequest<DataRoom>("/data-rooms", {
      method: "POST",
      token,
      body: JSON.stringify({
        name: roomName.trim(),
        description: roomDescription.trim() || undefined,
      }),
    });

    setRooms((current) => [room, ...current]);
    setSelectedRoomId(room.id);
    setRoomName("");
    setRoomDescription("");
    setRoomModalOpen(false);
    setNotice("Data room created");
  }

  async function deleteRoom(roomId: string) {
    if (!token) {
      return;
    }

    await apiRequest<{ message: string }>(`/data-rooms/${roomId}`, {
      method: "DELETE",
      token,
    });

    setRooms((current) => current.filter((room) => room.id !== roomId));
    setSelectedRoomId((current) => (current === roomId ? null : current));
    setNotice("Data room deleted");
  }

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedRoom || !folderName.trim()) {
      return;
    }

    await apiRequest<FolderNode>(`/data-rooms/${selectedRoom.id}/folders`, {
      method: "POST",
      token,
      body: JSON.stringify({
        name: folderName.trim(),
        parentId: selectedFolderId,
      }),
    });

    setFolderName("");
    setFolderModalOpen(false);
    await loadRoomDetails(selectedRoom.id);
    setNotice("Folder created");
  }

  async function renameFolder(folder: FolderNode) {
    if (!token || !selectedRoom) {
      return;
    }

    const nextName = window.prompt("Folder name", folder.name)?.trim();
    if (!nextName) {
      return;
    }

    await apiRequest<FolderNode>(`/data-rooms/${selectedRoom.id}/folders/${folder.id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ name: nextName }),
    });

    await loadRoomDetails(selectedRoom.id);
  }

  async function deleteFolder(folderId: string) {
    if (!token || !selectedRoom) {
      return;
    }

    const impact = await apiRequest<{ folderCount: number; fileCount: number }>(
      `/data-rooms/${selectedRoom.id}/folders/${folderId}/delete-impact`,
      { token },
    );
    const confirmed = window.confirm(
      `Delete this folder and everything inside it?\n\nThis will delete ${impact.folderCount} folder(s) and ${impact.fileCount} file(s).`,
    );

    if (!confirmed) {
      return;
    }

    await apiRequest<{ message: string }>(`/data-rooms/${selectedRoom.id}/folders/${folderId}`, {
      method: "DELETE",
      token,
    });

    await loadRoomDetails(selectedRoom.id);
    setNotice("Folder deleted");
  }

  function addFilesToUploadQueue(files: File[]) {
    setUploadQueue((current) => [
      ...current,
      ...files.map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        progress: 0,
        status: "queued" as const,
      })),
    ]);
  }

  async function uploadSelectedFiles(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedRoom || !selectedFolder || !uploadQueue.length) {
      return;
    }

    const queuedItems = uploadQueue.filter((item) => item.status !== "done");

    let hasUploadError = false;
    await Promise.all(
      queuedItems.map((item) =>
        uploadFileWithProgress(item, selectedRoom.id, selectedFolder.id).catch((error: unknown) => {
          hasUploadError = true;
          setUploadQueue((current) =>
            current.map((candidate) =>
              candidate.id === item.id
                ? {
                    ...candidate,
                    status: "error",
                    error: error instanceof Error ? error.message : "Upload failed",
                  }
                : candidate,
            ),
          );
        }),
      ),
    );

    await loadRoomDetails(selectedRoom.id);
    if (!hasUploadError) {
      setUploadQueue([]);
      setUploadModalOpen(false);
    }
    setNotice("Upload complete");
  }

  function uploadFileWithProgress(item: UploadQueueItem, dataRoomId: string, folderId: string) {
    if (!token) {
      return Promise.reject(new Error("Missing session"));
    }

    setUploadQueue((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, status: "uploading", progress: 0 } : candidate,
      ),
    );

    return new Promise<void>((resolve, reject) => {
      const formData = new FormData();
      formData.append("files", item.file);
      const request = new XMLHttpRequest();

      request.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          return;
        }

        const progress = Math.round((event.loaded / event.total) * 100);
        setUploadQueue((current) =>
          current.map((candidate) => (candidate.id === item.id ? { ...candidate, progress } : candidate)),
        );
      };

      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          setUploadQueue((current) =>
            current.map((candidate) =>
              candidate.id === item.id ? { ...candidate, progress: 100, status: "done" } : candidate,
            ),
          );
          resolve();
          return;
        }

        reject(new Error(request.responseText || "Upload failed"));
      };
      request.onerror = () => reject(new Error("Upload failed"));
      request.open("POST", `${API_URL}/data-rooms/${dataRoomId}/folders/${folderId}/files/bulk`);
      request.setRequestHeader("Authorization", `Bearer ${token}`);
      request.send(formData);
    });
  }

  async function deleteFile(fileId: string) {
    if (!token || !selectedRoom) {
      return;
    }

    if (!window.confirm("Delete this file? This action cannot be undone.")) {
      return;
    }

    await apiRequest<{ message: string }>(`/data-rooms/${selectedRoom.id}/files/${fileId}`, {
      method: "DELETE",
      token,
    });

    await loadRoomDetails(selectedRoom.id);
    setNotice("File deleted");
  }

  async function downloadFile(file: StoredFile) {
    if (!token || !selectedRoom) {
      return;
    }

    const response = await fetch(`${API_URL}/data-rooms/${selectedRoom.id}/files/${file.id}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      setNotice("Download failed");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.originalName;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  async function previewFile(file: StoredFile) {
    if (!token || !selectedRoom) {
      return;
    }

    const response = await fetch(`${API_URL}/data-rooms/${selectedRoom.id}/files/${file.id}/preview`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      setNotice("Preview failed");
      return;
    }

    if (filePreviewUrl) {
      window.URL.revokeObjectURL(filePreviewUrl);
    }

    const blob = await response.blob();
    setSelectedFile(file);
    setFilePreviewUrl(window.URL.createObjectURL(blob));
    setPreviewModalOpen(true);
  }

  function closePreviewModal() {
    if (filePreviewUrl) {
      window.URL.revokeObjectURL(filePreviewUrl);
    }

    setFilePreviewUrl("");
    setPreviewModalOpen(false);
  }

  function openFileManageModal(file: StoredFile) {
    setSelectedFile(file);
    setFileName(file.name);
    setDestinationFolderId(file.folderId);
    setFileManageModalOpen(true);
  }

  async function updateSelectedFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedRoom || !selectedFile) {
      return;
    }

    await apiRequest<StoredFile>(`/data-rooms/${selectedRoom.id}/files/${selectedFile.id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({
        name: fileName.trim(),
        folderId: destinationFolderId,
      }),
    });

    setFileManageModalOpen(false);
    await loadRoomDetails(selectedRoom.id);
    setNotice("File updated");
  }

  function openShareModal(target: ShareTarget) {
    setShareTarget(target);
    setShareMode("PUBLIC");
    setShareRecipientUserId("");
    setShareModalOpen(true);
  }

  async function createShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedRoom || !shareTarget) {
      return;
    }

    await apiRequest<Share>(`/data-rooms/${selectedRoom.id}/shares`, {
      method: "POST",
      token,
      body: JSON.stringify({
        targetType: shareTarget.type,
        targetId: shareTarget.id,
        mode: shareMode,
        recipientUserId: shareMode === "PERMISSIONED" ? shareRecipientUserId : undefined,
      }),
    });

    await loadShares(selectedRoom.id);
    setNotice("Share link created");
  }

  async function revokeShare(shareId: string) {
    if (!token || !selectedRoom) {
      return;
    }

    await apiRequest<Share>(`/data-rooms/${selectedRoom.id}/shares/${shareId}`, {
      method: "DELETE",
      token,
    });

    await loadShares(selectedRoom.id);
    setNotice("Share revoked");
  }

  async function copyShareLink(share: Share) {
    const link = `${window.location.origin}/shared/${share.token}`;
    await navigator.clipboard.writeText(link);
    setNotice("Share link copied");
  }

  async function searchUsers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    const result = await apiRequest<User[]>(`/users?search=${encodeURIComponent(memberSearch)}`, {
      token,
    });
    setUsers(result);
    setSelectedUserId(result[0]?.id ?? "");
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedRoom || !selectedUserId) {
      return;
    }

    await apiRequest<Member>(`/data-rooms/${selectedRoom.id}/members`, {
      method: "POST",
      token,
      body: JSON.stringify({
        userId: selectedUserId,
        role: selectedRole,
      }),
    });

    await loadRoomDetails(selectedRoom.id);
    setMemberModalOpen(false);
    setMemberSearch("");
    setSelectedUserId("");
    setNotice("Member added");
  }

  async function changeMemberRole(member: Member, role: Role) {
    if (!token || !selectedRoom) {
      return;
    }

    await apiRequest<Member>(`/data-rooms/${selectedRoom.id}/members/${member.id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify({ role }),
    });

    await loadRoomDetails(selectedRoom.id);
  }

  async function removeMember(memberId: string) {
    if (!token || !selectedRoom) {
      return;
    }

    await apiRequest<{ message: string }>(`/data-rooms/${selectedRoom.id}/members/${memberId}`, {
      method: "DELETE",
      token,
    });

    await loadRoomDetails(selectedRoom.id);
  }

  if (!token || !user) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dff6e8_0%,transparent_35%),linear-gradient(135deg,#f8fafc_0%,#eef6f1_45%,#f6f1e8_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top_left,#064e3b_0%,transparent_30%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#111827_100%)] dark:text-slate-50">
        <div className="fixed right-4 top-4 z-10">
          <ThemeToggle theme={theme} onToggle={() => setTheme((current) => (current === "dark" ? "light" : "dark"))} />
        </div>
        <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-5 py-8 lg:grid-cols-[1fr_420px]">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-white/75 px-3 py-1 text-sm font-medium text-emerald-800 shadow-sm backdrop-blur dark:border-emerald-800 dark:bg-slate-900/70 dark:text-emerald-200">
              <Shield className="size-4" />
              Secure Data Room MVP
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-normal text-slate-950 dark:text-white lg:text-6xl">
                Data Room
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-700 dark:text-slate-300">
                Auth, role-based rooms, nested folders, PDF and image uploads, member management,
                downloads, and delete flows in one focused workspace.
              </p>
            </div>
            <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
              {["OWNER controls members", "EDITOR manages content", "VIEWER reads only"].map((item) => (
                <div
                  key={item}
                  className="rounded-md border border-slate-200 bg-white/80 p-4 text-sm text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleAuth}
            className="rounded-md border border-slate-200 bg-white/95 p-5 shadow-xl shadow-slate-200/60 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-black/30"
          >
            <div className="mb-5 flex rounded-md bg-slate-100 p-1 dark:bg-slate-800">
              <button
                className={cn(
                  "h-9 flex-1 rounded-sm text-sm font-medium text-slate-600 dark:text-slate-300",
                  authMode === "login" && "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white",
                )}
                type="button"
                onClick={() => setAuthMode("login")}
              >
                Login
              </button>
              <button
                className={cn(
                  "h-9 flex-1 rounded-sm text-sm font-medium text-slate-600 dark:text-slate-300",
                  authMode === "register" && "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white",
                )}
                type="button"
                onClick={() => setAuthMode("register")}
              >
                Register
              </button>
            </div>
            <div className="space-y-3">
              {authMode === "register" && (
                <Field label="Name" value={name} onChange={setName} autoComplete="name" />
              )}
              <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
              <Field
                label="Password"
                value={password}
                onChange={setPassword}
                type="password"
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
              />
            </div>
            <Button className="mt-5 w-full" type="submit" disabled={loading}>
              <Shield className="size-4" />
              {authMode === "login" ? "Login" : "Create account"}
            </Button>
            {notice && <p className="mt-4 text-sm text-red-700 dark:text-red-300">{notice}</p>}
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4 lg:px-6">
          <div>
            <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">Data Room</p>
            <h1 className="text-lg font-semibold">Secure workspace</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm sm:block">
              <p className="font-medium">{user.name}</p>
              <p className="text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
            <ThemeToggle theme={theme} onToggle={() => setTheme((current) => (current === "dark" ? "light" : "dark"))} />
            <Button variant="outline" size="sm" onClick={() => selectedRoomId && void loadRoomDetails(selectedRoomId)}>
              <RefreshCcw className="size-4" />
              Refresh
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={logout} title="Logout">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className={shellGridClass}>
        <aside
          className={cn(
            "border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:border-b-0 lg:border-r",
            isProjectsOpen ? "p-4" : "p-2",
          )}
          aria-label="Projects navigation"
        >
          {isProjectsOpen ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <SectionTitle icon={Building2} title="Projects" />
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" type="button" onClick={() => setRoomModalOpen(true)} title="Create data room">
                    <Plus className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" type="button" onClick={() => setProjectsOpen(false)} title="Collapse projects">
                    <PanelLeftClose className="size-4" />
                  </Button>
                </div>
              </div>
              <Button className="mt-4 w-full" size="sm" type="button" onClick={() => setRoomModalOpen(true)}>
                <Plus className="size-4" />
                New data room
              </Button>

              <div className="mt-4 space-y-2">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    className={cn(
                      "w-full rounded-md border p-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-emerald-200",
                      selectedRoomId === room.id
                        ? "border-emerald-400 bg-emerald-50 text-emerald-950 shadow-sm ring-1 ring-emerald-200 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-50 dark:ring-emerald-900"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:bg-slate-800",
                    )}
                    onClick={() => setSelectedRoomId(room.id)}
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="block truncate font-medium">{room.name}</span>
                      {selectedRoomId === room.id && (
                        <span className="rounded-sm bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white dark:bg-emerald-500 dark:text-emerald-950">
                          Open
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">
                      {room.description || "No description"}
                    </span>
                    {selectedRoomId === room.id && currentMember && (
                      <span className="mt-2 inline-flex rounded-sm bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-slate-100 dark:text-slate-950">
                        YOUR ROLE: {currentMember.role}
                      </span>
                    )}
                  </button>
                ))}
                {!rooms.length && <EmptyState text="Create your first data room" compact />}
              </div>
            </>
          ) : (
            <CollapsedRail
              icon={Building2}
              label="Projects"
              meta={selectedRoom?.name ?? "No project"}
              onExpand={() => setProjectsOpen(true)}
            />
          )}
        </aside>

        <section className="min-w-0 border-b border-slate-200 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-950 lg:border-b-0 lg:border-r">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4">
              <Breadcrumbs
                folderPath={selectedFolderPath}
                label="Location"
                room={selectedRoom}
                showProjects
                onFolderClick={setSelectedFolderId}
                onRoomClick={() => setSelectedFolderId(null)}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-sm bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    Project
                  </span>
                  <span className="rounded-sm bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {currentMember?.role ?? "No role"}
                  </span>
                </div>
                <h2 className="text-2xl font-semibold">{selectedRoom?.name ?? "Select a data room"}</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                  {selectedRoom?.description || "No description for this room."}
                </p>
              </div>
              {selectedRoom && canManageMembers && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() =>
                      openShareModal({
                        type: "DATA_ROOM",
                        id: selectedRoom.id,
                        label: selectedRoom.name,
                      })
                    }
                  >
                    <Share2 className="size-4" />
                    Share room
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => void deleteRoom(selectedRoom.id)}>
                    <Trash2 className="size-4" />
                    Delete room
                  </Button>
                </div>
              )}
            </div>
            <details className="room-snapshot-disclosure mt-4 rounded-md border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/50">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-100 focus-visible:ring-3 focus-visible:ring-emerald-200 dark:text-slate-300 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden">
                <span>Room snapshot</span>
                <ChevronDown className="size-4 text-slate-400 transition-transform dark:text-slate-500" />
              </summary>
              <div className="grid gap-2 border-t border-slate-200 p-3 dark:border-slate-800 sm:grid-cols-3">
                <Metric label="Folders" value={flatFolders.length} />
                <Metric label="Files" value={fileCount} />
                <Metric label="Members" value={members.length} />
              </div>
            </details>
          </div>

          <div className={contentGridClass}>
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle icon={Folder} title="Index" />
                <div className="flex items-center gap-1">
                  {selectedFolder && (
                    <Button variant="ghost" size="xs" type="button" onClick={() => setSelectedFolderId(null)}>
                      Room level
                    </Button>
                  )}
                  {canManage && selectedRoom && (
                    <Button variant="ghost" size="icon-sm" type="button" onClick={() => setFolderModalOpen(true)} title="Create folder">
                      <FolderPlus className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
              {canManage && selectedRoom && (
                <Button className="mt-4 w-full" size="sm" type="button" onClick={() => setFolderModalOpen(true)}>
                  <FolderPlus className="size-4" />
                  New folder
                </Button>
              )}
              <div className="mt-4 space-y-1">
                {folders.length ? (
                  folders.map((folder) => (
                    <FolderTree
                      key={folder.id}
                      canManage={canManage}
                      folder={folder}
                      level={0}
                      selectedFolderId={selectedFolderId}
                      onDelete={deleteFolder}
                      onRename={renameFolder}
                      onSelect={setSelectedFolderId}
                    />
                  ))
                ) : (
                  <EmptyState text="No folders yet" />
                )}
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
                <div>
                  <SectionTitle icon={FileText} title={selectedFolder?.name ?? "Documents"} />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {selectedFolder
                      ? `${selectedFolder.files.length} item${selectedFolder.files.length === 1 ? "" : "s"} in this folder`
                      : "Select a folder in the index"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-sm bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    PDF/images
                  </span>
                  {canManage && selectedFolder && (
                    <Button size="sm" type="button" onClick={() => setUploadModalOpen(true)}>
                      <Upload className="size-4" />
                      Upload
                    </Button>
                  )}
                  {canManageMembers && selectedFolder && (
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() =>
                        openShareModal({
                          type: "FOLDER",
                          id: selectedFolder.id,
                          label: selectedFolder.name,
                        })
                      }
                    >
                      <Share2 className="size-4" />
                      Share
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <Breadcrumbs
                  folderPath={selectedFolderPath}
                  label="Path"
                  room={selectedRoom}
                  onFolderClick={setSelectedFolderId}
                  onRoomClick={() => setSelectedFolderId(null)}
                />
              </div>
              <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
                {selectedFolder?.files.length ? (
                  selectedFolder.files.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 py-3">
                      <div className="flex size-10 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {file.mimeType === "application/pdf" ? (
                          <FileText className="size-5" />
                        ) : (
                          <FileImage className="size-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatBytes(file.size)} · {file.mimeType}
                          {file.version > 1 ? ` · v${file.version}` : ""}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={() => void previewFile(file)} title="Preview">
                        <Eye className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => void downloadFile(file)} title="Download">
                        <Download className="size-4" />
                      </Button>
                      {canManage && (
                        <>
                          <Button variant="ghost" size="icon-sm" onClick={() => openFileManageModal(file)} title="Rename or move">
                            <MoveRight className="size-4" />
                          </Button>
                          {canManageMembers && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() =>
                                openShareModal({
                                  type: "FILE",
                                  id: file.id,
                                  label: file.name,
                                })
                              }
                              title="Share file"
                            >
                              <Share2 className="size-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon-sm" onClick={() => void deleteFile(file.id)} title="Delete">
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <EmptyState text={selectedFolder ? "No files in this folder" : "Select a folder"} />
                )}
              </div>
            </div>
          </div>
        </section>

        <aside
          className={cn("bg-white dark:bg-slate-900", isMembersOpen ? "p-4" : "p-2")}
          aria-label="Members panel"
        >
          {isMembersOpen ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <SectionTitle icon={Users} title="Members" />
                <div className="flex items-center gap-1">
                  {canManageMembers && (
                    <Button size="sm" type="button" onClick={() => setMemberModalOpen(true)}>
                      <Plus className="size-4" />
                      Add
                    </Button>
                  )}
                  <Button variant="ghost" size="icon-sm" type="button" onClick={() => setMembersOpen(false)} title="Collapse members">
                    <PanelRightClose className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Active room</p>
                <p className="mt-1 truncate text-sm font-semibold">{selectedRoom?.name ?? "No room selected"}</p>
              </div>

              <div className="mt-4 space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{member.user.name}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{member.user.email}</p>
                      </div>
                      <span className="rounded-sm bg-slate-100 px-2 py-1 text-xs font-medium dark:bg-slate-800 dark:text-slate-200">
                        {member.role}
                      </span>
                    </div>
                    {canManageMembers && member.role !== "OWNER" && (
                      <details className="mt-3 rounded-md border border-slate-200 dark:border-slate-800">
                        <summary className="cursor-pointer list-none px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 focus-visible:ring-3 focus-visible:ring-emerald-200 dark:text-slate-300 dark:hover:bg-slate-800">
                          Access controls
                        </summary>
                        <div className="flex gap-2 border-t border-slate-200 p-2 dark:border-slate-800">
                          <SelectControl<Role>
                            ariaLabel={`Role for ${member.user.name}`}
                            className="min-w-0 flex-1"
                            compact
                            value={member.role}
                            onChange={(role) => void changeMemberRole(member, role)}
                          >
                            <option value="VIEWER">VIEWER</option>
                            <option value="EDITOR">EDITOR</option>
                          </SelectControl>
                          <Button variant="ghost" size="icon-sm" onClick={() => void removeMember(member.id)} title="Remove member">
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <CollapsedRail
              icon={Users}
              label="Members"
              meta={`${members.length} people`}
              onExpand={() => setMembersOpen(true)}
              side="right"
            />
          )}
        </aside>
      </div>

      {notice && (
        <div className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          {notice}
        </div>
      )}

      <Modal
        description="Create a dedicated workspace for files, folders, members, and sharing."
        isOpen={isRoomModalOpen}
        title="New data room"
        onClose={() => setRoomModalOpen(false)}
      >
        <form onSubmit={createRoom} className="space-y-4">
          <Field label="Room name" value={roomName} onChange={setRoomName} />
          <Field label="Description" value={roomDescription} onChange={setRoomDescription} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setRoomModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!roomName.trim()}>
              <Plus className="size-4" />
              Create room
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        description={selectedFolder ? `Inside ${selectedFolder.name}` : "At room level"}
        isOpen={isFolderModalOpen}
        title="New folder"
        onClose={() => setFolderModalOpen(false)}
      >
        <form onSubmit={createFolder} className="space-y-4">
          <Field
            label={selectedFolder ? "Child folder name" : "Folder name"}
            value={folderName}
            onChange={setFolderName}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setFolderModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!folderName.trim() || !selectedRoom}>
              <FolderPlus className="size-4" />
              Create folder
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        description={
          selectedFolder
            ? `${selectedRoom?.name ?? "Data room"} / ${selectedFolderPath.map((folder) => folder.name).join(" / ")}`
            : "Select a folder before uploading"
        }
        isOpen={isUploadModalOpen}
        title="Upload file"
        onClose={() => setUploadModalOpen(false)}
      >
        <form onSubmit={uploadSelectedFiles} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Files</span>
            <span
              className={cn(
                "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 text-center text-sm transition",
                isDraggingUpload
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-100"
                  : "border-slate-300 bg-slate-50 text-slate-600 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-emerald-600",
              )}
              onDragLeave={() => setDraggingUpload(false)}
              onDragOver={(event) => {
                event.preventDefault();
                setDraggingUpload(true);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDraggingUpload(false);
                addFilesToUploadQueue(Array.from(event.dataTransfer.files));
              }}
            >
              <Upload className="size-5" />
              <span className="max-w-full truncate font-medium">Drop files here or choose from your device</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">PDF, JPG, PNG, WEBP, GIF · max 20 MB</span>
            </span>
            <input
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,application/pdf,image/jpeg,image/png,image/webp,image/gif"
              multiple
              type="file"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                addFilesToUploadQueue(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />
          </label>
          {uploadQueue.length > 0 && (
            <div className="space-y-2 rounded-md border border-slate-200 p-2 dark:border-slate-800">
              {uploadQueue.map((item) => (
                <div key={item.id} className="space-y-1 rounded-sm bg-slate-50 p-2 dark:bg-slate-950/70">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate font-medium">{item.file.name}</span>
                    <span className="shrink-0 text-slate-500 dark:text-slate-400">
                      {item.status === "error" ? "Failed" : `${item.progress}%`}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className={cn("h-full rounded-full bg-emerald-500 transition-all", item.status === "error" && "bg-red-500")}
                      style={{ width: `${item.status === "queued" ? 0 : item.progress}%` }}
                    />
                  </div>
                  {item.error && <p className="text-xs text-red-600 dark:text-red-300">{item.error}</p>}
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setUploadQueue([]);
                setUploadModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!uploadQueue.length || !selectedFolder}>
              <Upload className="size-4" />
              Upload {uploadQueue.length || ""}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        description={selectedRoom ? `Add people to ${selectedRoom.name}` : "Select a data room first"}
        isOpen={isMemberModalOpen}
        title="Add member"
        onClose={() => setMemberModalOpen(false)}
      >
        <div className="space-y-4">
          <form onSubmit={searchUsers} className="flex gap-2">
            <label className="sr-only" htmlFor="member-search">
              Search users
            </label>
            <input
              className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-3 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-emerald-950"
              id="member-search"
              placeholder="Search users by name or email"
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
            />
            <Button type="submit">
              <Search className="size-4" />
              Search
            </Button>
          </form>

          <form onSubmit={addMember} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">User</span>
              <SelectControl
                ariaLabel="User"
                value={selectedUserId}
                onChange={setSelectedUserId}
              >
                <option value="">Select user</option>
                {users.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} · {candidate.email}
                  </option>
                ))}
              </SelectControl>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Role</span>
              <SelectControl<Role>
                ariaLabel="Role"
                value={selectedRole}
                onChange={setSelectedRole}
              >
                <option value="VIEWER">Viewer · can view and download</option>
                <option value="EDITOR">Editor · can manage folders and files</option>
              </SelectControl>
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" type="button" onClick={() => setMemberModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!selectedUserId}>
                <Plus className="size-4" />
                Add member
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal
        description={selectedFile?.mimeType}
        isOpen={isPreviewModalOpen}
        size="preview"
        title={selectedFile?.name ?? "File preview"}
        onClose={closePreviewModal}
      >
        <div className="space-y-3">
          <div className="min-h-[420px] overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
            {!filePreviewUrl ? (
              <div className="flex min-h-[420px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                Loading preview
              </div>
            ) : selectedFile?.mimeType.startsWith("image/") ? (
              <div className="flex min-h-[62vh] items-center justify-center bg-slate-950/5 p-4 dark:bg-black/20">
                <img className="max-h-[72vh] w-full object-contain" src={filePreviewUrl} alt={selectedFile.name} />
              </div>
            ) : selectedFile?.mimeType === "application/pdf" ? (
              <PdfViewer
                fileName={selectedFile.name}
                url={filePreviewUrl}
                onDownload={() => void downloadFile(selectedFile)}
                onOpenOriginal={() => window.open(filePreviewUrl, "_blank", "noopener,noreferrer")}
              />
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                <FileText className="size-8" />
                Preview is not available for this file type.
              </div>
            )}
          </div>
          {selectedFile && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => void downloadFile(selectedFile)}>
                <Download className="size-4" />
                Download
              </Button>
              <Button type="button" onClick={closePreviewModal}>
                Close
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        description="Resolve naming conflicts automatically inside the destination folder"
        isOpen={isFileManageModalOpen}
        title="Rename or move file"
        onClose={() => setFileManageModalOpen(false)}
      >
        <form onSubmit={updateSelectedFile} className="space-y-4">
          <Field label="File name" value={fileName} onChange={setFileName} />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Destination folder</span>
            <SelectControl ariaLabel="Destination folder" value={destinationFolderId} onChange={setDestinationFolderId}>
              {flatFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {findFolderPath(folders, folder.id).map((item) => item.name).join(" / ")}
                </option>
              ))}
            </SelectControl>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setFileManageModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!fileName.trim() || !destinationFolderId}>
              <MoveRight className="size-4" />
              Save changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        description={shareTarget ? `Share ${shareTarget.label}` : "Create or revoke read-only access"}
        isOpen={isShareModalOpen}
        title="Share access"
        onClose={() => setShareModalOpen(false)}
      >
        <div className="space-y-4">
          <form onSubmit={createShare} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Mode</span>
              <SelectControl<ShareMode> ariaLabel="Share mode" value={shareMode} onChange={setShareMode}>
                <option value="PUBLIC">Public link · anyone with link can view</option>
                <option value="PERMISSIONED">Permissioned · selected user only</option>
              </SelectControl>
            </label>
            {shareMode === "PERMISSIONED" && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Recipient</span>
                <SelectControl ariaLabel="Share recipient" value={shareRecipientUserId} onChange={setShareRecipientUserId}>
                  <option value="">Select user</option>
                  {users.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} · {candidate.email}
                    </option>
                  ))}
                </SelectControl>
              </label>
            )}
            <Button type="submit" disabled={!shareTarget || (shareMode === "PERMISSIONED" && !shareRecipientUserId)}>
              <Link2 className="size-4" />
              Create read-only link
            </Button>
          </form>

          <div className="rounded-md border border-slate-200 dark:border-slate-800">
            <div className="border-b border-slate-200 px-3 py-2 text-sm font-medium dark:border-slate-800">
              Active links
            </div>
            <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {shares
                .filter((share) => !share.revokedAt)
                .map((share) => (
                  <div key={share.id} className="flex items-center gap-2 p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {share.targetType.replace("_", " ")} · {share.mode}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {share.recipientUser ? `${share.recipientUser.name} · ${share.recipientUser.email}` : "Anyone with the link"}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon-sm" type="button" onClick={() => void copyShareLink(share)} title="Copy link">
                      <Copy className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" type="button" onClick={() => void revokeShare(share.id)} title="Revoke">
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              {!shares.filter((share) => !share.revokedAt).length && <EmptyState text="No active links" compact />}
            </div>
          </div>
        </div>
      </Modal>
    </main>
  );
}

function SharedView({ payload, error }: { payload: SharedPayload | null; error: string }) {
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
        <div className="max-w-md rounded-md border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <SectionTitle icon={AlertTriangle} title="Share unavailable" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{error}</p>
        </div>
      </main>
    );
  }

  if (!payload) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          Loading shared content
        </div>
      </main>
    );
  }

  const title =
    payload.target.type === "DATA_ROOM"
      ? payload.target.room.name
      : payload.target.type === "FOLDER"
        ? payload.target.folder.name
        : payload.target.file.name;

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <section className="mx-auto max-w-5xl rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="mb-2 inline-flex items-center gap-2 rounded-sm bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            <Link2 className="size-3.5" />
            Read-only share
          </div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {payload.target.type.replace("_", " ")} shared via public link
          </p>
        </div>

        <div className="mt-4">
          {payload.target.type === "FILE" && <SharedFileRow file={payload.target.file} />}
          {payload.target.type === "FOLDER" && <SharedFolderTree folder={payload.target.folder} />}
          {payload.target.type === "DATA_ROOM" && (
            <div className="space-y-2">
              {payload.target.folders.map((folder) => (
                <SharedFolderTree key={folder.id} folder={folder} />
              ))}
              {!payload.target.folders.length && <EmptyState text="No shared folders yet" />}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function SharedFolderTree({ folder, level = 0 }: { folder: SharedFolderNode; level?: number }) {
  return (
    <div className="space-y-1">
      <div
        className="flex min-h-9 items-center gap-2 rounded-md bg-slate-50 px-2 text-sm dark:bg-slate-950/60"
        style={{ paddingLeft: `${8 + level * 16}px` }}
      >
        <Folder className="size-4 shrink-0 text-amber-600" />
        <span className="font-medium">{folder.name}</span>
        <span className="text-xs text-slate-400 dark:text-slate-500">{folder.files.length}</span>
      </div>
      <div className="space-y-1">
        {folder.files.map((file) => (
          <SharedFileRow key={file.id} file={file} level={level + 1} />
        ))}
        {folder.children.map((child) => (
          <SharedFolderTree key={child.id} folder={child} level={level + 1} />
        ))}
      </div>
    </div>
  );
}

function SharedFileRow({ file, level = 0 }: { file: SharedFile; level?: number }) {
  return (
    <div
      className="flex min-h-10 items-center gap-3 rounded-md px-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/70"
      style={{ paddingLeft: `${8 + level * 16}px` }}
    >
      {file.mimeType === "application/pdf" ? (
        <FileText className="size-4 shrink-0 text-slate-600 dark:text-slate-300" />
      ) : (
        <FileImage className="size-4 shrink-0 text-slate-600 dark:text-slate-300" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{file.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</p>
      </div>
      <Button variant="ghost" size="sm" type="button" onClick={() => window.open(`${API_URL}${file.previewUrl}`, "_blank")}>
        <Eye className="size-4" />
        Preview
      </Button>
      <Button variant="outline" size="sm" type="button" onClick={() => window.open(`${API_URL}${file.downloadUrl}`, "_blank")}>
        <Download className="size-4" />
        Download
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  compact?: boolean;
}) {
  return (
    <label className="block">
      <span className={cn("mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300", compact && "text-xs")}>
        {label}
      </span>
      <input
        autoComplete={autoComplete}
        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-3 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-emerald-500 dark:focus:ring-emerald-950"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectControl<TValue extends string>({
  ariaLabel,
  children,
  className,
  compact = false,
  value,
  onChange,
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  const options = Children.toArray(children)
    .filter((child): child is ReactElement<{ children: ReactNode; disabled?: boolean; value?: string }> => isValidElement(child))
    .map((child) => ({
      disabled: child.props.disabled,
      label: child.props.children,
      value: child.props.value ?? "",
    }));
  const selectedOption = options.find((option) => option.value === value);
  const emptyValue = "__empty_select_value__";
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  return (
    <SelectPrimitive.Root
      value={value || emptyValue}
      onOpenChange={(isOpen) => {
        if (isOpen) {
          setPortalContainer(document.querySelector("dialog[open]") ?? document.body);
        }
      }}
      onValueChange={(nextValue) => onChange((nextValue === emptyValue ? "" : nextValue) as TValue)}
    >
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white text-left text-slate-950 shadow-xs outline-none transition hover:border-slate-400 focus-visible:border-emerald-500 focus-visible:ring-3 focus-visible:ring-emerald-100 data-[placeholder]:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-600 dark:focus-visible:border-emerald-500 dark:focus-visible:ring-emerald-950 dark:disabled:bg-slate-900 dark:disabled:text-slate-500",
          compact ? "h-8 px-2 text-xs" : "h-10 px-3 text-sm",
          className,
        )}
      >
        <SelectPrimitive.Value>{selectedOption?.label}</SelectPrimitive.Value>
        <SelectPrimitive.Icon asChild>
          <ChevronsUpDown className={cn("shrink-0 text-slate-400 dark:text-slate-500", compact ? "size-3.5" : "size-4")} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal container={portalContainer ?? undefined}>
        <SelectPrimitive.Content
          className="z-[100000] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-slate-200 bg-white p-1 text-slate-950 shadow-xl data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
          position="popper"
        >
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-slate-400">
            <ChevronDown className="size-4 rotate-180" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value || emptyValue}
                className="relative flex min-h-9 cursor-pointer select-none items-center rounded-sm py-2 pr-3 pl-8 text-sm outline-none transition data-[disabled]:pointer-events-none data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-950 data-[disabled]:opacity-50 dark:data-[highlighted]:bg-emerald-950 dark:data-[highlighted]:text-emerald-100"
                disabled={option.disabled}
                value={option.value || emptyValue}
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
                  <Check className="size-4" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-slate-400">
            <ChevronDown className="size-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-emerald-700 dark:text-emerald-300" />
      <h3 className="text-sm font-semibold uppercase tracking-normal text-slate-700 dark:text-slate-300">{title}</h3>
    </div>
  );
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <Button variant="outline" size="icon-sm" onClick={onToggle} title="Toggle theme" type="button">
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function Breadcrumbs({
  room,
  folderPath,
  label = "Location",
  showProjects = false,
  onRoomClick,
  onFolderClick,
}: {
  room: DataRoom | null;
  folderPath: FolderNode[];
  label?: string;
  showProjects?: boolean;
  onRoomClick: () => void;
  onFolderClick: (folderId: string | null) => void;
}) {
  const itemClassName =
    "inline-flex h-8 max-w-[220px] items-center gap-1 truncate rounded-md border border-transparent px-2 font-medium text-slate-950 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-emerald-200 active:translate-y-px disabled:pointer-events-none disabled:text-slate-400 dark:text-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:disabled:text-slate-600";

  return (
    <nav
      aria-label="Current location"
      className="flex min-w-0 flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1.5 text-sm dark:border-slate-800 dark:bg-slate-950/60"
    >
      <span className="px-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</span>
      {showProjects && (
        <>
          <button
            className="inline-flex h-8 items-center gap-1 rounded-md border border-transparent px-2 text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-emerald-200 active:translate-y-px dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-50"
            onClick={onRoomClick}
            title="Back to project level"
            type="button"
          >
            <Building2 className="size-4" />
            Projects
          </button>
          <ChevronRight className="size-4 text-slate-300 dark:text-slate-700" />
        </>
      )}
      <button
        className={itemClassName}
        disabled={!room}
        onClick={onRoomClick}
        title="Project level"
        type="button"
      >
        {room?.name ?? "No room"}
      </button>
      {folderPath.map((folder) => (
        <span className="contents" key={folder.id}>
          <ChevronRight className="size-4 text-slate-300 dark:text-slate-700" />
          <button
            className={itemClassName}
            onClick={() => onFolderClick(folder.id)}
            title={`Open ${folder.name}`}
            type="button"
          >
            {folder.name}
          </button>
        </span>
      ))}
    </nav>
  );
}

function Modal({
  isOpen,
  title,
  description,
  children,
  size = "default",
  onClose,
}: {
  isOpen: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "default" | "preview";
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
    }

    if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${title.replace(/\s+/g, "-").toLowerCase()}-title`}
      className={cn(
        "m-auto max-h-[86vh] overflow-visible rounded-md border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50",
        size === "preview" ? "w-[min(96vw,1120px)]" : "w-[min(92vw,520px)]",
      )}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold" id={`${title.replace(/\s+/g, "-").toLowerCase()}-title`}>
              {title}
            </h2>
            {description && <p className="mt-1 max-w-full truncate text-sm text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          <Button variant="ghost" size="icon-sm" type="button" onClick={onClose} title="Close dialog">
            <X className="size-4" />
          </Button>
        </div>
      </div>
      <div className="max-h-[calc(86vh-88px)] overflow-y-auto p-5">{children}</div>
    </dialog>
  );
}

function CollapsedRail({
  label,
  onExpand,
  side = "left",
}: {
  icon: LucideIcon;
  label: string;
  meta: string;
  onExpand: () => void;
  side?: "left" | "right";
}) {
  return (
    <button
      aria-label={`Expand ${label}`}
      className="flex min-h-40 w-full flex-col items-center gap-3 px-2 py-3 text-slate-600 transition hover:text-slate-950 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-emerald-200 dark:text-slate-300 dark:hover:text-slate-50"
      onClick={onExpand}
      title={`Expand ${label}`}
      type="button"
    >
      {side === "right" ? <PanelRightOpen className="size-4" /> : <PanelLeftOpen className="size-4" />}
    </button>
  );
}

function FolderTree({
  folder,
  level,
  selectedFolderId,
  canManage,
  onSelect,
  onRename,
  onDelete,
}: {
  folder: FolderNode;
  level: number;
  selectedFolderId: string | null;
  canManage: boolean;
  onSelect: (folderId: string) => void;
  onRename: (folder: FolderNode) => Promise<void>;
  onDelete: (folderId: string) => Promise<void>;
}) {
  return (
    <div>
      <div
        className={cn(
          "group flex min-h-9 items-center gap-2 rounded-md border border-transparent px-2 text-sm transition focus-within:ring-3 focus-within:ring-emerald-200",
          selectedFolderId === folder.id
            ? "border-emerald-200 bg-emerald-50 text-emerald-950 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-50"
            : "hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-800",
        )}
        style={{ paddingLeft: `${8 + level * 16}px` }}
      >
        <button
          className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none"
          onClick={() => onSelect(folder.id)}
          title={`Open ${folder.name}`}
          type="button"
        >
          <Folder className="size-4 shrink-0 text-amber-600" />
          <span className="truncate">{folder.name}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">{folder.files.length}</span>
        </button>
        {canManage && (
          <div className="flex opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
            <Button variant="ghost" size="icon-xs" onClick={() => void onRename(folder)} title="Rename">
              <Pencil className="size-3" />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={() => void onDelete(folder.id)} title="Delete">
              <Trash2 className="size-3" />
            </Button>
          </div>
        )}
      </div>
      {folder.children.map((child) => (
        <FolderTree
          key={child.id}
          canManage={canManage}
          folder={child}
          level={level + 1}
          selectedFolderId={selectedFolderId}
          onDelete={onDelete}
          onRename={onRename}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-400",
        compact ? "min-h-16" : "min-h-28",
      )}
    >
      {text}
    </div>
  );
}

export default App;
