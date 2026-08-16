import { type ChangeEvent } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  FileImage,
  FileText,
  Folder,
  FolderPlus,
  Link2,
  LogOut,
  MoveRight,
  PanelLeftClose,
  PanelRightClose,
  Plus,
  Search,
  Share2,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";

import { PdfViewer } from "@/components/PdfViewer";
import {
  Breadcrumbs,
  CollapsedRail,
  EmptyState,
  Field,
  ImpactStat,
  Metric,
  Modal,
  SectionTitle,
  SelectControl,
  ThemeToggle,
} from "@/components/data-room/DataRoomPrimitives";
import { FolderTree } from "@/components/data-room/FolderTree";
import { Button } from "@/components/ui/button";
import type { useDataRoomWorkspace } from "@/hooks/useDataRoomWorkspace";
import { findFolderPath, formatBytes } from "@/lib/data-room";
import { cn } from "@/lib/utils";
import type { Role, ShareMode } from "@/types/data-room";

type WorkspaceController = ReturnType<typeof useDataRoomWorkspace>;

export function WorkspaceScreen({ controller }: { controller: WorkspaceController }) {
  const {
    addFilesToUploadQueue,
    addMember,
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
    fileCount,
    fileName,
    filePreviewUrl,
    flatFolders,
    folderName,
    folders,
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
    logout,
    memberSearch,
    members,
    notice,
    openFileManageModal,
    openShareModal,
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
    setDraggingUpload,
    setDestinationFolderId,
    setFileManageModalOpen,
    setFileName,
    setFolderModalOpen,
    setFolderName,
    setInviteRecipientUserId,
    setInviteRole,
    setMemberModalOpen,
    setMemberSearch,
    setMembersOpen,
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
    theme,
    shareError,
    shareFlow,
    shareMode,
    shareRecipientUserId,
    shares,
    shareTarget,
    shellGridClass,
    uploadQueue,
    uploadSelectedFiles,
    users,
    updateSelectedFile,
    user,
  } = controller;

  if (!user) {
    return null;
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
                          <Button variant="ghost" size="icon-sm" onClick={() => deleteFile(file)} title="Delete">
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
        <div className="fixed top-4 left-1/2 z-50 flex max-w-[min(92vw,520px)] -translate-x-1/2 items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Bell className="size-4" />
          </span>
          <span className="min-w-0 truncate">{notice}</span>
        </div>
      )}

      <Modal
        description="This action cannot be undone."
        isOpen={Boolean(deleteConfirmation)}
        title={
          deleteConfirmation?.type === "ROOM"
            ? "Delete data room?"
            : deleteConfirmation?.type === "FOLDER"
              ? "Delete folder?"
              : "Delete file?"
        }
        onClose={closeDeleteConfirmation}
      >
        {deleteConfirmation && (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-red-950 dark:border-red-950/70 dark:bg-red-950/30 dark:text-red-100">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-red-700 shadow-sm dark:bg-red-950/70 dark:text-red-300">
                <AlertTriangle className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">
                  {deleteConfirmation.type === "ROOM"
                    ? `Delete "${deleteConfirmation.name}" and all its content?`
                    : deleteConfirmation.type === "FOLDER"
                      ? `Delete "${deleteConfirmation.name}" and everything inside?`
                      : `Delete "${deleteConfirmation.name}"?`}
                </p>
                <p className="mt-1 text-sm text-red-800 dark:text-red-200">
                  {deleteConfirmation.type === "ROOM"
                    ? "All folders, files, members, and share links in this room will be removed."
                    : deleteConfirmation.type === "FOLDER"
                      ? "Nested folders and files in this folder will be removed."
                      : "The original file will be removed from this data room."}
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {deleteConfirmation.type === "ROOM" && (
                <>
                  <ImpactStat label="Folders" value={deleteConfirmation.folderCount} />
                  <ImpactStat label="Files" value={deleteConfirmation.fileCount} />
                  <ImpactStat label="Members" value={deleteConfirmation.memberCount} />
                </>
              )}
              {deleteConfirmation.type === "FOLDER" && (
                <>
                  <ImpactStat label="Folders" value={deleteConfirmation.folderCount} />
                  <ImpactStat label="Files" value={deleteConfirmation.fileCount} />
                </>
              )}
              {deleteConfirmation.type === "FILE" && (
                <>
                  <ImpactStat label="Type" value={deleteConfirmation.mimeType} />
                  <ImpactStat label="Size" value={formatBytes(deleteConfirmation.size)} />
                </>
              )}
            </div>

            {deleteError && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-950/70 dark:bg-red-950/30 dark:text-red-200">
                {deleteError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" disabled={isDeleting} onClick={closeDeleteConfirmation}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                type="button"
                disabled={isDeleting}
                onClick={() => void confirmDelete()}
                className="bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:border-red-700 focus-visible:ring-red-200 dark:bg-red-600 dark:text-white dark:hover:bg-red-500"
              >
                <Trash2 className="size-4" />
                {isDeleting ? "Deleting..." : "Delete permanently"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

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
          <div className="h-[58vh] min-h-[360px] overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
            {!filePreviewUrl ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                Loading preview
              </div>
            ) : selectedFile?.mimeType.startsWith("image/") ? (
              <div className="flex h-full items-center justify-center bg-slate-950/5 p-4 dark:bg-black/20">
                <img className="max-h-full w-full object-contain" src={filePreviewUrl} alt={selectedFile.name} />
              </div>
            ) : selectedFile?.mimeType === "application/pdf" ? (
              <PdfViewer
                fileName={selectedFile.name}
                url={filePreviewUrl}
                onDownload={() => void downloadFile(selectedFile)}
                onOpenOriginal={() => window.open(filePreviewUrl, "_blank", "noopener,noreferrer")}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-500 dark:text-slate-400">
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
        description={shareTarget ? `Share ${shareTarget.label}` : "Invite people or create read-only links"}
        isOpen={isShareModalOpen}
        title="Share access"
        onClose={() => {
          setShareModalOpen(false);
          setShareError("");
        }}
      >
        <div className="space-y-4">
          {shareTarget?.type === "DATA_ROOM" && (
            <div className="grid grid-cols-2 rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950/60">
              <button
                className={cn(
                  "h-9 rounded-sm text-sm font-medium transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-emerald-200",
                  shareFlow === "INVITE"
                    ? "bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:text-slate-50"
                    : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100",
                )}
                type="button"
                onClick={() => setShareFlow("INVITE")}
              >
                Invite member
              </button>
              <button
                className={cn(
                  "h-9 rounded-sm text-sm font-medium transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-emerald-200",
                  shareFlow === "LINK"
                    ? "bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:text-slate-50"
                    : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100",
                )}
                type="button"
                onClick={() => setShareFlow("LINK")}
              >
                Read-only link
              </button>
            </div>
          )}

          {shareTarget?.type === "DATA_ROOM" && shareFlow === "INVITE" ? (
            <form onSubmit={inviteMember} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Invite user</span>
                <SelectControl ariaLabel="Invite user" value={inviteRecipientUserId} onChange={setInviteRecipientUserId}>
                  <option value="">Select user</option>
                  {inviteCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} · {candidate.email}
                    </option>
                  ))}
                </SelectControl>
              </label>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Access level</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    {
                      role: "VIEWER" as const,
                      title: "Viewer",
                      description: "Can view, preview, and download files.",
                    },
                    {
                      role: "EDITOR" as const,
                      title: "Editor",
                      description: "Can upload, rename, move, and delete content.",
                    },
                  ].map((option) => (
                    <button
                      key={option.role}
                      className={cn(
                        "rounded-md border p-3 text-left transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-emerald-200",
                        inviteRole === option.role
                          ? "border-emerald-400 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-50"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800",
                      )}
                      type="button"
                      onClick={() => setInviteRole(option.role)}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-semibold">{option.title}</span>
                        {inviteRole === option.role && <Check className="size-4 text-emerald-700 dark:text-emerald-300" />}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{option.description}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <Button type="submit" disabled={!inviteRecipientUserId}>
                <Users className="size-4" />
                Invite as {inviteRole === "EDITOR" ? "editor" : "viewer"}
              </Button>
            </form>
          ) : (
            <form onSubmit={createShare} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Link visibility</span>
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
          )}

          {shareError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-950/70 dark:bg-red-950/30 dark:text-red-200">
              {shareError}
            </p>
          )}

          {shareTarget?.type === "DATA_ROOM" && (
            <div className="rounded-md border border-slate-200 dark:border-slate-800">
              <div className="border-b border-slate-200 px-3 py-2 text-sm font-medium dark:border-slate-800">
                People with access
              </div>
              <div className="max-h-44 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{member.user.name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{member.user.email}</p>
                    </div>
                    <span className="rounded-sm bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
