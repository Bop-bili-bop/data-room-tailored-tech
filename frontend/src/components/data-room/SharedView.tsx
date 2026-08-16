import { AlertTriangle, Download, Eye, FileImage, FileText, Folder, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { API_URL, formatBytes } from "@/lib/data-room";
import type { SharedFile, SharedFolderNode, SharedPayload } from "@/types/data-room";

import { EmptyState, SectionTitle } from "./DataRoomPrimitives";

export function SharedView({ payload, error }: { payload: SharedPayload | null; error: string }) {
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
