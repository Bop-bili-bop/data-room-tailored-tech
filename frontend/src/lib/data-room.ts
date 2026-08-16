import type { FolderNode } from "@/types/data-room";

export const API_URL = (
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:3000"
).replace(/\/$/, "");
export const TOKEN_KEY = "data-room-token";
export const THEME_KEY = "data-room-theme";

type ApiOptions = RequestInit & {
  token?: string | null;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
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

export function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function flattenFolders(folders: FolderNode[]): FolderNode[] {
  return folders.flatMap((folder) => [folder, ...flattenFolders(folder.children)]);
}

export function findFolderPath(folders: FolderNode[], folderId: string | null): FolderNode[] {
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
