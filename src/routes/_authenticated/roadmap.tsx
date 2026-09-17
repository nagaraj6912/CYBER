import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getWorkspace, toggleTask } from "@/lib/track.functions";
import { applyChanges } from "@/lib/roadmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ExternalLink, BookOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({
    meta: [
      { title: "Six-Month Roadmap — CyberTrack" },
      {
        name: "description",
        content:
          "The beginner-first six-month roadmap to SOC and blue-team readiness: modules, tasks and curated resources.",
      },
      { property: "og:title", content: "Six-Month Roadmap — CyberTrack" },
      {
        property: "og:description",
        content: "The beginner-first six-month roadmap to SOC and blue-team readiness.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoadmapPage,
});

function RoadmapPage() {
  const getWs = useServerFn(getWorkspace);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["workspace"], queryFn: () => getWs() });

  const toggleFn = useServerFn(toggleTask);
  const toggleMutation = useMutation({
    mutationFn: (vars: { itemId: string; done: boolean }) => toggleFn({ data: vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workspace"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update"),
  });

  if (error) {
    return <p className="py-20 text-center text-sm text-destructive">{(error as Error).message}</p>;
  }
  if (isLoading || !data) {
    return <p className="py-20 text-center font-display text-xs tracking-widest text-primary">LOADING ROADMAP…</p>;
  }

  const modules = applyChanges(data.changes.map((c) => ({ id: c.id, change: c.change })));
  const completedIds = new Set(data.completions.map((c) => c.item_id));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl tracking-wide">Six-month roadmap</h1>
        <p className="text-sm text-muted-foreground">
          One module at a time. Tick tasks off as you finish them — progress syncs to your account.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {modules.map((m) => {
          const done = m.tasks.filter((t) => completedIds.has(t.id)).length;
          const mp = m.tasks.length === 0 ? 0 : Math.round((done / m.tasks.length) * 100);
          return (
            <Card key={m.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider text-primary">
                        Month {m.month}
                      </Badge>
                      {m.ai && (
                        <Badge className="border-accent/40 bg-accent/15 text-[10px] uppercase tracking-wider text-accent">
                          AI added
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="font-display text-base tracking-wide">{m.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
                  </div>
                  <span className="font-display text-lg text-primary">{mp}%</span>
                </div>
                <Progress value={mp} className="mt-2 h-1.5" />
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2.5">
                  {m.tasks.map((t) => {
                    const isDone = completedIds.has(t.id);
                    return (
                      <li key={t.id} className="flex items-start gap-3">
                        <button
                          aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                          disabled={toggleMutation.isPending}
                          onClick={() => toggleMutation.mutate({ itemId: t.id, done: !isDone })}
                          className="mt-0.5 text-primary transition-transform hover:scale-110 disabled:opacity-50"
                        >
                          {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                        </button>
                        <div>
                          <p className={`text-sm leading-snug ${isDone ? "text-muted-foreground line-through" : ""}`}>
                            {t.title}
                            {t.ai && <span className="ml-2 text-[10px] uppercase tracking-wider text-accent">AI</span>}
                          </p>
                          {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
                        </div>
                      </li>
                    );
                  })}
                  {m.tasks.length === 0 && <li className="text-xs text-muted-foreground">No tasks yet.</li>}
                </ul>

                {m.resources.length > 0 && (
                  <div className="border-t border-border pt-3">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <BookOpen className="h-3.5 w-3.5" /> Resources
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {m.resources.map((r) => (
                        <a
                          key={r.url}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          {r.title}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
