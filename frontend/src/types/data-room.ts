export type Role = "OWNER" | "EDITOR" | "VIEWER";

export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type DataRoom = {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner?: Pick<User, "id" | "name" | "email">;
};

export type Member = {
  id: string;
  dataRoomId: string;
  userId: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  user: Pick<User, "id" | "name" | "email">;
};

export type StoredFile = {
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

export type SharedFile = StoredFile & {
  previewUrl: string;
  downloadUrl: string;
};

export type FolderNode = {
  id: string;
  name: string;
  dataRoomId: string;
  parentId: string | null;
  files: StoredFile[];
  children: FolderNode[];
  createdAt: string;
  updatedAt: string;
};

export type SharedFolderNode = Omit<FolderNode, "files" | "children"> & {
  files: SharedFile[];
  children: SharedFolderNode[];
};

export type ShareTargetType = "DATA_ROOM" | "FOLDER" | "FILE";
export type ShareMode = "PUBLIC" | "PERMISSIONED";
export type ShareFlow = "INVITE" | "LINK";

export type Share = {
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

export type UploadQueueItem = {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
};

export type ShareTarget = {
  type: ShareTargetType;
  id: string;
  label: string;
};

export type DeleteConfirmation =
  | {
      type: "ROOM";
      roomId: string;
      name: string;
      folderCount: number;
      fileCount: number;
      memberCount: number;
    }
  | {
      type: "FOLDER";
      folderId: string;
      name: string;
      folderCount: number;
      fileCount: number;
    }
  | {
      type: "FILE";
      fileId: string;
      name: string;
      mimeType: string;
      size: number;
    };

export type SharedPayload = {
  share: Share;
  target:
    | { type: "DATA_ROOM"; room: Pick<DataRoom, "id" | "name" | "description">; folders: SharedFolderNode[] }
    | { type: "FOLDER"; folder: SharedFolderNode }
    | { type: "FILE"; file: SharedFile };
};

export type AuthMode = "login" | "register";
export type Theme = "light" | "dark";
