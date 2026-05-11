import React, { useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Search, ShieldCheck, Users, X } from "lucide-react";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { useApiKeys, API_KEY_FIELDS } from "@/hooks/use-api-keys";

function ApiKeysPanel({ onClose }: { onClose: () => void }) {
  const { keys, setKey, filledCount } = useApiKeys();
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  const toggle = (k: string) => setVisible((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-md border-l border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <KeyRound className="h-4 w-4" />
              Provider keys
            </div>
            <h2 className="mt-1 text-xl font-bold tracking-tight">Search configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close API settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="h-[calc(100%-8.5rem)] overflow-y-auto p-6">
          <p className="text-sm leading-6 text-muted-foreground">
            Add the providers you want the lookup to use. Keys stay in this browser's local storage and are passed only when you run a search.
          </p>

          <div className="mt-6 space-y-4">
            {API_KEY_FIELDS.map(({ key, label, placeholder }) => {
              const val = keys[key] ?? "";
              const isSet = !!val;
              const show = visible[key];
              return (
                <div key={key} className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {label}
                    {isSet && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  </label>
                  <div className="relative">
                    <input
                      type={show ? "text" : "password"}
                      value={val}
                      onChange={(e) => setKey(key, e.target.value)}
                      placeholder={placeholder}
                      className={cn(
                        "h-11 w-full rounded-xl border border-border bg-secondary/40 px-3 pr-11 text-sm outline-none transition-all focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10",
                        isSet && "border-emerald-500/30 bg-emerald-500/5"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                      aria-label={show ? "Hide key" : "Show key"}
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border bg-secondary/40 p-6">
          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm">
            <span className="text-muted-foreground">Configured providers</span>
            <span className="font-semibold">{filledCount} of {API_KEY_FIELDS.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [keysOpen, setKeysOpen] = useState(false);
  const { filledCount } = useApiKeys();

  return (
    <ThemeProvider defaultTheme="light" storageKey="app-theme">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_34rem),linear-gradient(180deg,hsl(var(--secondary)/0.55),hsl(var(--background))_22rem)] font-sans text-foreground">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight sm:text-xl">Employee Lookup</h1>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">Focused</span>
                </div>
                <p className="hidden text-sm text-muted-foreground sm:block">Company, roles, master search, contact results.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 sm:flex">
                <ShieldCheck className="h-4 w-4" />
                Ready
              </div>
              <button
                onClick={() => setKeysOpen(true)}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all",
                  filledCount > 0
                    ? "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15"
                    : "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <KeyRound className="h-4 w-4" />
                <span className="hidden sm:inline">API Keys</span>
                {filledCount > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{filledCount}</span>}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
          <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            <Search className="h-4 w-4" />
            One-page lookup workflow
          </div>
          {children}
        </main>
      </div>

      {keysOpen && <ApiKeysPanel onClose={() => setKeysOpen(false)} />}
    </ThemeProvider>
  );
}
