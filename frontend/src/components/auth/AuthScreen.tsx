import { Shield } from "lucide-react";
import type { FormEvent } from "react";

import { Field, ThemeToggle } from "@/components/data-room/DataRoomPrimitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AuthMode, Theme } from "@/types/data-room";

export function AuthScreen({
  authMode,
  authNotice,
  email,
  loading,
  name,
  password,
  theme,
  onAuthModeChange,
  onEmailChange,
  onGoogleOAuth,
  onNameChange,
  onPasswordChange,
  onSubmit,
  onThemeToggle,
}: {
  authMode: AuthMode;
  authNotice: string;
  email: string;
  loading: boolean;
  name: string;
  password: string;
  theme: Theme;
  onAuthModeChange: (mode: AuthMode) => void;
  onEmailChange: (value: string) => void;
  onGoogleOAuth: () => void;
  onNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onThemeToggle: () => void;
}) {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex justify-end p-4">
        <ThemeToggle theme={theme} onToggle={onThemeToggle} />
      </div>
      <section className="mx-auto grid min-h-[calc(100vh-80px)] max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <div className="inline-flex rounded-sm bg-emerald-100 px-2 py-1 text-xs font-semibold uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
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
          onSubmit={onSubmit}
          className="rounded-md border border-slate-200 bg-white/95 p-5 shadow-xl shadow-slate-200/60 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-black/30"
        >
          <Button className="mb-4 w-full" variant="outline" type="button" onClick={onGoogleOAuth}>
            <span className="flex size-5 items-center justify-center rounded-sm border border-slate-200 bg-white text-sm font-semibold text-slate-950 dark:border-slate-700">
              G
            </span>
            Continue with Google
          </Button>
          <div className="mb-4 flex items-center gap-3 text-xs font-medium uppercase text-slate-400 dark:text-slate-500">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            or use email
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="mb-5 flex rounded-md bg-slate-100 p-1 dark:bg-slate-800">
            <button
              className={cn(
                "h-9 flex-1 rounded-sm text-sm font-medium text-slate-600 dark:text-slate-300",
                authMode === "login" && "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white",
              )}
              type="button"
              onClick={() => onAuthModeChange("login")}
            >
              Login
            </button>
            <button
              className={cn(
                "h-9 flex-1 rounded-sm text-sm font-medium text-slate-600 dark:text-slate-300",
                authMode === "register" && "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white",
              )}
              type="button"
              onClick={() => onAuthModeChange("register")}
            >
              Register
            </button>
          </div>
          <div className="space-y-3">
            {authMode === "register" && <Field label="Name" value={name} onChange={onNameChange} autoComplete="name" />}
            <Field label="Email" value={email} onChange={onEmailChange} type="email" autoComplete="email" />
            <Field
              label="Password"
              value={password}
              onChange={onPasswordChange}
              type="password"
              autoComplete={authMode === "login" ? "current-password" : "new-password"}
            />
          </div>
          <Button className="mt-5 w-full" type="submit" disabled={loading}>
            <Shield className="size-4" />
            {authMode === "login" ? "Login" : "Create account"}
          </Button>
          {authNotice && <p className="mt-4 text-sm text-red-700 dark:text-red-300">{authNotice}</p>}
        </form>
      </section>
    </main>
  );
}
