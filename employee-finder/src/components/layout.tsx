import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Clock, BarChart3, ShieldAlert, Layers, Settings, X, Eye, EyeOff, KeyRound, CheckCircle2 } from "lucide-react";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { useApiKeys, API_KEY_FIELDS } from "@/hooks/use-api-keys";

const NAV_ITEMS = [
  { href: "/", label: "Search", icon: Search },
  { href: "/bulk", label: "Bulk", icon: Layers },
  { href: "/history", label: "History", icon: Clock },
  { href: "/stats", label: "Stats", icon: BarChart3 },
];

function ApiKeysPanel({ onClose }: { onClose: () => void }) {
  const { keys, setKey, filledCount } = useApiKeys();
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  const toggle = (k: string) => setVisible((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="w-80 h-full glass-sidebar border-l border-white/[0.07] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold tracking-widest text-primary font-mono">API KEYS</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground font-mono">
              {filledCount}/{API_KEY_FIELDS.length} SET
            </span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1.5">
          {API_KEY_FIELDS.map(({ key, label, placeholder }) => {
            const val = keys[key] ?? "";
            const isSet = !!val;
            const show = visible[key];
            return (
              <div key={key} className="group">
                <label className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground mb-1 tracking-wider">
                  {isSet && <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />}
                  {!isSet && <span className="w-3 h-3 shrink-0" />}
                  {label}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type={show ? "text" : "password"}
                    value={val}
                    onChange={(e) => setKey(key, e.target.value)}
                    placeholder={placeholder}
                    className={cn(
                      "flex-1 h-7 px-2 text-[11px] font-mono rounded bg-white/[0.03] border transition-all outline-none",
                      "placeholder:text-muted-foreground/40 text-foreground",
                      isSet
                        ? "border-green-500/20 focus:border-green-500/40"
                        : "border-white/[0.07] focus:border-primary/40"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    className="text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1"
                  >
                    {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-4 py-3 border-t border-white/[0.06] text-[10px] text-muted-foreground/50 font-mono leading-relaxed">
          Keys saved locally in browser. Never sent to any third-party.
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
    <ThemeProvider defaultTheme="dark" storageKey="app-theme">
      {/* Animated background */}
      <div className="nelf-bg">
        <div className="nelf-orb nelf-orb-1" />
        <div className="nelf-orb nelf-orb-2" />
        <div className="nelf-orb nelf-orb-3" />
        <div className="nelf-orb nelf-orb-4" />
        <div className="nelf-ripple nelf-ripple-1" />
        <div className="nelf-ripple nelf-ripple-2" />
        <div className="nelf-ripple nelf-ripple-3" />
        <div className="nelf-ripple nelf-ripple-4" />
        <div className="nelf-noise" />
      </div>

      <div className="nelf-app-root flex min-h-[100dvh] w-full text-foreground font-mono selection:bg-primary/30">
        {/* Sidebar */}
        <aside className="glass-sidebar w-64 flex flex-col fixed inset-y-0 left-0 z-20">
          <div className="h-16 flex items-center px-6 border-b border-white/[0.06]">
            <ShieldAlert className="w-5 h-5 mr-3 glow-primary" style={{ color: "hsl(217 91% 65%)" }} />
            <h1 className="font-bold text-sm tracking-tight glow-text" style={{ color: "hsl(217 91% 70%)" }}>
              N.E.L.F. <span className="text-muted-foreground ml-1 font-normal text-xs" style={{ textShadow: "none" }}>v1.0</span>
            </h1>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/");
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group",
                      isActive
                        ? "glass-card text-primary border-primary/20"
                        : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground border border-transparent"
                    )}
                    style={isActive ? { boxShadow: "0 0 16px hsla(217,91%,60%,0.15), inset 0 1px 0 rgba(255,255,255,0.07)" } : {}}
                  >
                    <item.icon className={cn("w-4 h-4 mr-3 transition-transform group-hover:scale-110", isActive ? "text-primary" : "text-muted-foreground")} />
                    {item.label}
                    {isActive && <div className="ml-auto w-1 h-4 rounded-full" style={{ background: "hsl(217 91% 65%)", boxShadow: "0 0 8px hsla(217,91%,60%,0.8)" }} />}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/[0.06] space-y-3">
            <button
              onClick={() => setKeysOpen(true)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200",
                "border hover:bg-white/[0.06]",
                filledCount > 0
                  ? "border-green-500/20 text-green-400 bg-green-500/5 hover:bg-green-500/10"
                  : "border-white/[0.07] text-muted-foreground hover:text-foreground"
              )}
            >
              <KeyRound className="w-3.5 h-3.5 shrink-0" />
              <span>API KEYS</span>
              {filledCount > 0 && (
                <span className="ml-auto text-[10px] bg-green-500/20 text-green-400 rounded px-1.5 py-0.5">
                  {filledCount} SET
                </span>
              )}
            </button>
            <div className="text-xs text-muted-foreground/70">
              OSINT Module Active<br />
              <span style={{ color: "hsl(217 91% 65%)", textShadow: "0 0 8px hsla(217,91%,60%,0.7)" }}>●</span>{" "}
              <span className="animate-pulse">Connection Secure</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 pl-64 flex flex-col relative">
          <div className="flex-1 p-8 h-[100dvh] overflow-y-auto">
            <div className="max-w-6xl mx-auto">
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
