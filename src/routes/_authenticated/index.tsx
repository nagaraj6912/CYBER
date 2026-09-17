import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getWorkspace, logSession, toggleTask } from "@/lib/track.functions";
import { applyChanges, computeStreak, findNextUp, totalTaskCount } from "@/lib/roadmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Flame, Map, StickyNote, Sparkles, Timer } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Your Learning Command Center — CyberTrack" },
      {
        name: "description",
        content:
          "Track your six-month SOC roadmap progress, log study sessions, review notes and AI roadmap proposals.",
      },
      { property: "og:title", content: "Your Learning Command Center — CyberTrack" },
      {
        property: "og:description",
        content: "Track your six-month SOC roadmap progress, log study sessions, review notes and AI roadmap proposals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const getWs = useServerFn(getWorkspace);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["workspace"], queryFn: () => getWs() });
  const [sessionTopic, setSessionTopic] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["workspace"] });

  const toggleFn = useServerFn(toggleTask);
  const logFn = useServerFn(logSession);

  const toggleMutation = useMutation({
    mutationFn: (vars: { itemId: string; done: boolean }) => toggleFn({ data: vars }),
    onSuccess: refresh,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update"),
  });

  const logMutation = useMutation({
    mutationFn: (vars: { minutes: number; topic?: string }) => logFn({ data: vars }),
    onSuccess: () => {
      toast.success("Study session logged");
      setSessionTopic("");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to log session"),
  });

  if (error) {
    return <p className="py-20 text-center text-sm text-destructive">{(error as Error).message}</p>;
  }
  if (isLoading || !data) {
    return <p className="py-20 text-center font-display text-xs tracking-widest text-primary">LOADING WORKSPACE…</p>;
  }

  const modules = applyChanges(data.changes.map((c) => ({ id: c.id, change: c.change })));
  const completedIds = new Set(data.completions.map((c) => c.item_id));
  const total = totalTaskCount(modules);
  const done = data.completions.filter((c) => modules.some((m) => m.tasks.some((t) => t.id === c.item_id))).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const nextUp = findNextUp(modules, completedIds);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const weekMinutes = data.sessions
    .filter((s) => new Date(s.studied_at) >= weekAgo)
    .reduce((acc, s) => acc + s.minutes, 0);
  const totalMinutes = data.sessions.reduce((acc, s) => acc + s.minutes, 0);
  const streak = computeStreak(data.sessions.map((s) => new Date(s.studied_at).toISOString().slice(0, 10)));

  const pendingProposals = data.proposals.filter((p) => p.status === "pending");

  const circumference = 2 * Math.PI * 42;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl tracking-wide text-foreground">Your learning command center</h1>
        <p className="text-sm text-muted-foreground">Beginner-first path to SOC / blue-team readiness</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Roadmap progress — large card */}
        <Card className="md:col-span-2">
          <CardHeader className="flex-row items-center gap-5 space-y-0">
            <div className="relative h-28 w-28 shrink-0">
              <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-muted)" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - pct / 100)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-xl text-primary glow-text">{pct}%</span>
                <span className="text-[10px] text-muted-foreground">
                  {done}/{total} tasks
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 font-display text-base tracking-wide">
                <Map className="h-4 w-4 text-primary" /> Roadmap progress
              </CardTitle>
              <div className="mt-3 space-y-2">
                {modules.slice(0, 6).map((m) => {
                  const md = m.tasks.filter((t) => completedIds.has(t.id)).length;
                  const mp = m.tasks.length === 0 ? 0 : Math.round((md / m.tasks.length) * 100);
                  return (
                    <div key={m.id}>
                      <div className="mb-0.5 flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-muted-foreground">
                          Month {m.month}: {m.title}
                        </span>
                        <span className={mp === 100 ? "text-primary" : ""}>{mp}%</span>
                      </div>
                      <Progress value={mp} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
              <Button asChild variant="secondary" size="sm" className="mt-4">
                <Link to="/roadmap">Open full roadmap</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Next up */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base tracking-wide">Next up</CardTitle>
          </CardHeader>
          <CardContent>
            {nextUp ? (
              <div className="flex items-start gap-3">
                <button
                  aria-label="Mark complete"
                  onClick={() => toggleMutation.mutate({ itemId: nextUp.task.id, done: true })}
                  className="mt-0.5 text-primary transition-transform hover:scale-110"
                >
                  <Circle className="h-5 w-5" />
                </button>
                <div>
                  <p className="text-sm font-medium leading-snug">{nextUp.task.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Month {nextUp.module.month} · {nextUp.module.title}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-primary">All tasks complete. Legend status unlocked. 🏆</p>
            )}
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              {streak > 0 ? (
                <span className="inline-flex items-center gap-1 text-primary">
                  <Flame className="h-3.5 w-3.5" /> {streak}-day streak — keep it alive
                </span>
              ) : (
                "Log a session today to start a streak"
              )}
            </p>
          </CardContent>
        </Card>

        {/* Study log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base tracking-wide">
              <Timer className="h-4 w-4 text-primary" /> Log study time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {Math.floor(weekMinutes / 60)}h {weekMinutes % 60}m this week ·{" "}
              {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m total
            </p>
            <div className="flex flex-wrap gap-2">
              {[15, 30, 45, 60].map((mins) => (
                <Button
                  key={mins}
                  size="sm"
                  variant="secondary"
                  disabled={logMutation.isPending}
                  onClick={() =>
                    logMutation.mutate(
                      sessionTopic.trim() ? { minutes: mins, topic: sessionTopic.trim() } : { minutes: mins },
                    )
                  }
                >
                  +{mins}m
                </Button>
              ))}
            </div>
            <Input
              placeholder="What did you study? (optional)"
              value={sessionTopic}
              onChange={(e) => setSessionTopic(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base tracking-wide">
              <StickyNote className="h-4 w-4 text-primary" /> Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.notes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No notes yet. Save commands, lab evidence, and questions here.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.notes.slice(0, 3).map((n) => (
                  <li key={n.id} className="truncate text-sm">
                    <span className="font-medium">{n.title || "Untitled note"}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {n.content.slice(0, 40)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="secondary" size="sm" className="mt-4">
              <Link to="/notes">Open notes</Link>
            </Button>
          </CardContent>
        </Card>

        {/* AI proposals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base tracking-wide">
              <Sparkles className="h-4 w-4 text-accent" /> AI change proposals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingProposals.length > 0 ? (
              <p className="text-sm">
                <span className="font-display text-primary">{pendingProposals.length}</span> pending{" "}
                {pendingProposals.length === 1 ? "proposal" : "proposals"} awaiting your review.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Ask for a change; review it before your roadmap changes.
              </p>
            )}
            <Button asChild variant="secondary" size="sm" className="mt-4">
              <Link to="/proposals">Review proposals</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
