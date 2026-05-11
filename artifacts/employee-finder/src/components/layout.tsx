import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Clock, BarChart3, Users, Settings, X, Eye, EyeOff, KeyRound, CheckCircle2, Menu } from "lucide-react";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { useApiKeys, API_KEY_FIELDS } from "@/hooks/use-api-keys";

const NAV_ITEMS = [
  { href: "/", label: "Search", icon: Search },
  { href: "/bulk", label: "Bulk Processing", icon: Users },
  { href: "/history", label: "Search History", icon: Clock },
  { href: "/stats", label: "Analytics", icon: BarChart3 },
];

function ApiKeysPanel({ onClose }: { onClose: () => void }) {
  const { keys, setKey, filledCount } = useApiKeys();
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  const toggle = (k: string) => setVisible((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-96 h-full bg-background border-l border-border flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">API Configuration</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            Configure your external search and extraction providers. Keys are stored securely in your browser's local storage.
          </p>
          <div className="space-y-4">
            {API_KEY_FIELDS.map(({ key, label, placeholder }) => {
              const val = keys[key] ?? "";
              const isSet = !!val;
              const show = visible[key];
              return (
                <div key={key} className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    {label}
                    {isSet && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                  </label>
                  <div className="relative group">
                    <input
                      type={show ? "text" : "password"}
                      value={val}
                      onChange={(e) => setKey(key, e.target.value)}
                      placeholder={placeholder}
                      className={cn(
                        "w-full h-10 pl-3 pr-10 text-sm rounded-md bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all",
                        isSet && "border-green-500/20"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1"
                    >
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="p-6 border-t border-border bg-secondary/30">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Configuration Status</span>
            <span className="font-medium">
              {filledCount} of {API_KEY_FIELDS.length} active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [keysOpen, setKeysOpen] = useState(false);
  const { filledCount } = useApiKeys();

  return (
    <ThemeProvider defaultTheme="light" storageKey="app-theme">
      <div className="flex min-h-screen bg-background font-sans selection:bg-primary/10">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-card flex flex-col fixed inset-y-0 left-0 z-20">
          <div className="h-16 flex items-center px-6 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mr-3 shadow-sm">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">
              N.E.L.F. <span className="text-primary font-medium text-xs ml-1 px-1.5 py-0.5 bg-primary/10 rounded">v1.1</span>
            </h1>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/");
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer group",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4 mr-3", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border space-y-3">
            <button
              onClick={() => setKeysOpen(true)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-xs font-medium transition-all duration-200 border",
                filledCount > 0
                  ? "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                  : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>API Settings</span>
              {filledCount > 0 && (
                <span className="ml-auto bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                  {filledCount}
                </span>
              )}
            </button>
            <div className="px-3 py-2 rounded-md bg-secondary/50 border border-border/50">
              <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                SYSTEM OPERATIONAL
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 pl-64 flex flex-col">
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10 flex items-center px-8 justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              {NAV_ITEMS.find(i => i.href === location)?.label || "Dashboard"}
            </div>
            <div className="flex items-center gap-4">
              {/* Optional header actions */}
            </div>
          </header>
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-5xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* API Keys Panel */}
      {keysOpen && <ApiKeysPanel onClose={() => setKeysOpen(false)} />}
    </ThemeProvider>
  );
}
