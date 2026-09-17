import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Terminal, LayoutDashboard, Map, StickyNote, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

type AuthState = "loading" | "authed" | "anonymous";

function AuthenticatedLayout() {
  const [state, setState] = useState<AuthState>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let cancelled = false;

    async function ensureSession() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setState("authed");
        setEmail(data.session.user.email ?? null);
        return;
      }
      // No sign-in required: start a silent guest session so data still saves.
      const { error } = await supabase.auth.signInAnonymously();
      if (cancelled) return;
      setState(error ? "anonymous" : "authed");
    }

    void ensureSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) return;
      setState("authed");
      setEmail(session.user.email ?? null);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (state !== "authed") {
    return (
      <div className="scan-grid flex min-h-screen items-center justify-center bg-background">
        <p className="font-display text-sm tracking-widest text-primary glow-text">ESTABLISHING SESSION…</p>
      </div>
    );
  }

  const nav = [
    { to: "/", label: "Command Center", icon: LayoutDashboard, exact: true },
    { to: "/roadmap", label: "Roadmap", icon: Map },
    { to: "/notes", label: "Notes", icon: StickyNote },
    { to: "/proposals", label: "AI Proposals", icon: Sparkles },
  ];

  return (
    <div className="scan-grid min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <span className="font-display text-sm tracking-wide text-foreground">
              CYBER<span className="text-primary">//</span>TRACK
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-primary/15 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {email ?? "guest mode"}
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs ${
                  active ? "bg-primary/15 font-medium text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
