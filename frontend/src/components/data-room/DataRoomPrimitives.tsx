import * as SelectPrimitive from "@radix-ui/react-select";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Moon,
  PanelLeftOpen,
  PanelRightOpen,
  Sun,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DataRoom, FolderNode, Theme } from "@/types/data-room";

export function Field({
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

export function SelectControl<TValue extends string>({
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

export function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-emerald-700 dark:text-emerald-300" />
      <h3 className="text-sm font-semibold uppercase tracking-normal text-slate-700 dark:text-slate-300">{title}</h3>
    </div>
  );
}

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <Button variant="outline" size="icon-sm" onClick={onToggle} title="Toggle theme" type="button">
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

export function ImpactStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-xs font-medium uppercase tracking-normal text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{value}</p>
    </div>
  );
}

export function Breadcrumbs({
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
      <button className={itemClassName} disabled={!room} onClick={onRoomClick} title="Project level" type="button">
        {room?.name ?? "No room"}
      </button>
      {folderPath.map((folder) => (
        <span className="contents" key={folder.id}>
          <ChevronRight className="size-4 text-slate-300 dark:text-slate-700" />
          <button className={itemClassName} onClick={() => onFolderClick(folder.id)} title={`Open ${folder.name}`} type="button">
            {folder.name}
          </button>
        </span>
      ))}
    </nav>
  );
}

export function Modal({
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
      <div className={cn("p-5", size === "preview" ? "overflow-hidden" : "max-h-[calc(86vh-88px)] overflow-y-auto")}>
        {children}
      </div>
    </dialog>
  );
}

export function CollapsedRail({
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

export function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
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
