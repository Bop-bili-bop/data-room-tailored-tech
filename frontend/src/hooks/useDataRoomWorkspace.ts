import { type FormEvent, useEffect, useMemo, useState } from "react";

import { useOAuthCallbackToken } from "@/hooks/useOAuthCallbackToken";
import { API_URL, apiRequest, findFolderPath, flattenFolders, THEME_KEY, TOKEN_KEY } from "@/lib/data-room";
import { cn } from "@/lib/utils";
import type {
  AuthMode,
  DataRoom,
  DeleteConfirmation,
  FolderNode,
  Member,
  Role,
  Share,
  ShareFlow,
  ShareMode,
  SharedPayload,
  ShareTarget,
  StoredFile,
  Theme,
  UploadQueueItem,
  User,
} from "@/types/data-room";

export function useDataRoomWorkspace() {
  const sharedToken = window.location.pathname.match(/^\/shared\/([^/]+)/)?.[1] ?? null;
  const { getInitialToken, hasMissingOAuthToken } = useOAuthCallbackToken();
  const [sharedPayload, setSharedPayload] = useState<SharedPayload | null>(null);
  const [sharedError, setSharedError] = useState("");
  const [token, setToken] = useState(getInitialToken);
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
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);
  const [shareFlow, setShareFlow] = useState<ShareFlow>("LINK");
  const [shareMode, setShareMode] = useState<ShareMode>("PUBLIC");
  const [shareRecipientUserId, setShareRecipientUserId] = useState("");
  const [inviteRecipientUserId, setInviteRecipientUserId] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<Role, "OWNER">>("VIEWER");
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
  const [authNotice, setAuthNotice] = useState(
    hasMissingOAuthToken ? "Google sign-in did not return a session" : "",
  );
  const [deleteError, setDeleteError] = useState("");
  const [shareError, setShareError] = useState("");
  const [isDeleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;
  const flatFolders = useMemo(() => flattenFolders(folders), [folders]);
  const selectedFolder = flatFolders.find((folder) => folder.id === selectedFolderId) ?? null;
  const currentMember = members.find((member) => member.userId === user?.id);
  const canManage = currentMember?.role === "OWNER" || currentMember?.role === "EDITOR";
  const canManageMembers = currentMember?.role === "OWNER";
  const fileCount = flatFolders.reduce((total, folder) => total + folder.files.length, 0);
  const selectedFolderPath = useMemo(() => findFolderPath(folders, selectedFolderId), [folders, selectedFolderId]);
  const inviteCandidates = useMemo(() => {
    const memberUserIds = new Set(members.map((member) => member.userId));

    return users.filter((candidate) => !memberUserIds.has(candidate.id));
  }, [members, users]);
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

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => setNotice(""), 3000);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

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
      setAuthNotice(error instanceof Error ? error.message : "Session expired");
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
    setAuthNotice("");

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
      setAuthNotice(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  function startGoogleOAuth() {
    setAuthNotice("");
    window.location.href = `${API_URL}/auth/google`;
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

    const room = rooms.find((candidate) => candidate.id === roomId);

    if (!room) {
      return;
    }

    setDeleteError("");
    setDeleteConfirmation({
      type: "ROOM",
      roomId,
      name: room.name,
      folderCount: flatFolders.length,
      fileCount,
      memberCount: members.length,
    });
  }

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedRoom || !folderName.trim()) {
      return;
    }

    const requestedName = folderName.trim();
    const folder = await apiRequest<FolderNode>(`/data-rooms/${selectedRoom.id}/folders`, {
      method: "POST",
      token,
      body: JSON.stringify({
        name: requestedName,
        parentId: selectedFolderId,
      }),
    });

    setFolderName("");
    setFolderModalOpen(false);
    setSelectedFolderId(folder.id);
    await loadRoomDetails(selectedRoom.id);
    setNotice(folder.name === requestedName ? "Folder created" : `Folder created as ${folder.name}`);
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

    const folder = flatFolders.find((candidate) => candidate.id === folderId);
    const impact = await apiRequest<{ folderCount: number; fileCount: number }>(
      `/data-rooms/${selectedRoom.id}/folders/${folderId}/delete-impact`,
      { token },
    );

    if (!folder) {
      return;
    }

    setDeleteError("");
    setDeleteConfirmation({
      type: "FOLDER",
      folderId,
      name: folder.name,
      folderCount: impact.folderCount,
      fileCount: impact.fileCount,
    });
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

  function deleteFile(file: StoredFile) {
    if (!token || !selectedRoom) {
      return;
    }

    setDeleteError("");
    setDeleteConfirmation({
      type: "FILE",
      fileId: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
    });
  }

  function closeDeleteConfirmation() {
    if (isDeleting) {
      return;
    }

    setDeleteConfirmation(null);
    setDeleteError("");
  }

  async function confirmDelete() {
    if (!token || !deleteConfirmation) {
      return;
    }

    try {
      setDeleting(true);
      setDeleteError("");

      if (deleteConfirmation.type === "ROOM") {
        await apiRequest<{ message: string }>(`/data-rooms/${deleteConfirmation.roomId}`, {
          method: "DELETE",
          token,
        });

        setRooms((current) => current.filter((room) => room.id !== deleteConfirmation.roomId));
        setSelectedRoomId((current) => (current === deleteConfirmation.roomId ? null : current));
        setDeleteConfirmation(null);
        setNotice("Data room deleted");
        return;
      }

      if (!selectedRoom) {
        return;
      }

      if (deleteConfirmation.type === "FOLDER") {
        await apiRequest<{ message: string }>(
          `/data-rooms/${selectedRoom.id}/folders/${deleteConfirmation.folderId}`,
          {
            method: "DELETE",
            token,
          },
        );

        await loadRoomDetails(selectedRoom.id);
        setDeleteConfirmation(null);
        setNotice("Folder deleted");
        return;
      }

      await apiRequest<{ message: string }>(`/data-rooms/${selectedRoom.id}/files/${deleteConfirmation.fileId}`, {
        method: "DELETE",
        token,
      });

      await loadRoomDetails(selectedRoom.id);
      setDeleteConfirmation(null);
      setNotice("File deleted");
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete this item");
    } finally {
      setDeleting(false);
    }
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
    setShareFlow(target.type === "DATA_ROOM" ? "INVITE" : "LINK");
    setShareMode("PUBLIC");
    setShareRecipientUserId("");
    setInviteRecipientUserId("");
    setInviteRole("VIEWER");
    setShareError("");
    setShareModalOpen(true);
  }

  async function createShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedRoom || !shareTarget) {
      return;
    }

    try {
      setShareError("");
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
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Could not create share link");
    }
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedRoom || !inviteRecipientUserId) {
      return;
    }

    try {
      setShareError("");
      await apiRequest<Member>(`/data-rooms/${selectedRoom.id}/members`, {
        method: "POST",
        token,
        body: JSON.stringify({
          userId: inviteRecipientUserId,
          role: inviteRole,
        }),
      });

      await loadRoomDetails(selectedRoom.id);
      setInviteRecipientUserId("");
      setInviteRole("VIEWER");
      setNotice(`Member invited as ${inviteRole.toLowerCase()}`);
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Could not invite this member");
    }
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


  return {
    addFilesToUploadQueue,
    addMember,
    authMode,
    authNotice,
    canManage,
    canManageMembers,
    changeMemberRole,
    closeDeleteConfirmation,
    closePreviewModal,
    confirmDelete,
    contentGridClass,
    copyShareLink,
    createFolder,
    createRoom,
    createShare,
    currentMember,
    deleteConfirmation,
    deleteError,
    deleteFile,
    deleteFolder,
    deleteRoom,
    destinationFolderId,
    downloadFile,
    email,
    fileCount,
    fileName,
    filePreviewUrl,
    flatFolders,
    folderName,
    folders,
    handleAuth,
    inviteCandidates,
    inviteRecipientUserId,
    inviteMember,
    inviteRole,
    isDeleting,
    isDraggingUpload,
    isFileManageModalOpen,
    isFolderModalOpen,
    isMemberModalOpen,
    isMembersOpen,
    isPreviewModalOpen,
    isProjectsOpen,
    isRoomModalOpen,
    isShareModalOpen,
    isUploadModalOpen,
    loadRoomDetails,
    loading,
    logout,
    memberSearch,
    members,
    name,
    notice,
    openFileManageModal,
    openShareModal,
    password,
    previewFile,
    removeMember,
    renameFolder,
    revokeShare,
    roomDescription,
    roomName,
    rooms,
    searchUsers,
    selectedFile,
    selectedFolder,
    selectedFolderId,
    selectedFolderPath,
    selectedRole,
    selectedRoom,
    selectedRoomId,
    selectedUserId,
    setAuthMode,
    setDraggingUpload,
    setDestinationFolderId,
    setEmail,
    setFileManageModalOpen,
    setFileName,
    setFolderModalOpen,
    setFolderName,
    setInviteRecipientUserId,
    setInviteRole,
    setMemberModalOpen,
    setMemberSearch,
    setMembersOpen,
    setName,
    setPassword,
    setPreviewModalOpen,
    setProjectsOpen,
    setRoomDescription,
    setRoomModalOpen,
    setRoomName,
    setSelectedFolderId,
    setSelectedRole,
    setSelectedRoomId,
    setSelectedUserId,
    setShareError,
    setShareFlow,
    setShareMode,
    setShareModalOpen,
    setShareRecipientUserId,
    setUploadModalOpen,
    setUploadQueue,
    setTheme,
    setUser,
    shareError,
    shareFlow,
    shareMode,
    shareRecipientUserId,
    shares,
    shareTarget,
    shellGridClass,
    sharedError,
    sharedPayload,
    sharedToken,
    startGoogleOAuth,
    theme,
    token,
    uploadQueue,
    uploadSelectedFiles,
    updateSelectedFile,
    user,
    users,
  };
}
