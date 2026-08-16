import { Folder, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FolderNode } from "@/types/data-room";

export function FolderTree({
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
