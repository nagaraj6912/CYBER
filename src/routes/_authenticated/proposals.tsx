import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getWorkspace, createProposal, decideProposal } from "@/lib/track.functions";
import type { RoadmapChange } from "@/lib/roadmap";
import { applyChanges } from "@/lib/roadmap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Check, X, CheckCheck, XCircle, Hourglass } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/proposals")({
  head: () => ({
    meta: [
      { title: "AI Change Proposals — CyberTrack" },
      {
        name: "description",
        content: "Ask AI to adjust your SOC learning roadmap, then review each change before it applies.",
      },
      { property: "og:title", content: "AI Change Proposals — CyberTrack" },
      {
        property: "og:description",
        content: "Ask AI to adjust your roadmap, then review each change before it applies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProposalsPage,
});

function describeChange(change: RoadmapChange | null | undefined, modulesList: ReturnType<typeof applyChanges>) {
  if (!change?.ops?.length) return "No changes included.";
  const modTitle = (id?: string) => {
    const m = modulesList.find((x) => x.id === id);
    return m ? `Month ${m.month} (${m.title})` : "an unknown module";
  };
  return change.ops
    .map((op) => {
      if (op.type === "add_task") return `Add task "${op.title}" to ${modTitle(op.module_id)}`;
      if (op.type === "remove_task") return `Remove the task with ID ${op.task_id}`;
      if (op.type === "add_module") return `Add a new module "${op.title}"`;
      return "Unknown change";
    })
    .join(" · ");
}

function ProposalsPage() {
  const getWs = useServerFn(getWorkspace);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["workspace"], queryFn: () => getWs() });

  const [request, setRequest] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["workspace"] });

  const createFn = useServerFn(createProposal);
  const decideFn = useServerFn(decideProposal);

  const createMutation = useMutation({
    mutationFn: (vars: { request: string }) => createFn({ data: vars }),
    onSuccess: () => {
      toast.success("Proposal ready — review it below");
      setRequest("");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create proposal"),
  });

  const decideMutation = useMutation({
    mutationFn: (vars: { proposalId: string; decision: "applied" | "rejected" }) => decideFn({ data: vars }),
    onSuccess: (_d, vars) => {
      toast.success(vars.decision === "applied" ? "Change applied to your roadmap" : "Proposal rejected");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update proposal"),
  });

  if (error) {
    return <p className="py-20 text-center text-sm text-destructive">{(error as Error).message}</p>;
  }
  if (isLoading || !data) {
    return <p className="py-20 text-center font-display text-xs tracking-widest text-primary">LOADING PROPOSALS…</p>;
  }

  const modulesList = applyChanges(data.changes.map((c) => ({ id: c.id, change: c.change })));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl tracking-wide">AI change proposals</h1>
        <p className="text-sm text-muted-foreground">
          Ask for a change; review it before your roadmap changes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base tracking-wide">
            <Sparkles className="h-4 w-4 text-accent" /> New proposal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={3}
            placeholder={'e.g. "Add one beginner phishing triage lab before the SOC analyst module."'}
            value={request}
            onChange={(e) => setRequest(e.target.value)}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Nothing changes until you approve it.</p>
            <Button
              disabled={createMutation.isPending || request.trim().length < 5}
              onClick={() => createMutation.mutate({ request: request.trim() })}
            >
              {createMutation.isPending ? (
                <>
                  <Hourglass className="mr-1.5 h-4 w-4 animate-pulse" /> Thinking…
                </>
              ) : (
                "Create proposal"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {data.proposals.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No proposals yet. Try asking for something like more hands-on labs, or a lighter week.
        </p>
      ) : (
        <div className="space-y-4">
          {data.proposals.map((p) => {
            const change = p.proposal as RoadmapChange;
            return (
              <Card key={p.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-sm font-medium leading-snug">"{p.request}"</CardTitle>
                    <Badge
                      variant="secondary"
                      className={
                        p.status === "pending"
                          ? "bg-primary/15 text-primary"
                          : p.status === "applied"
                            ? "bg-accent/15 text-accent"
                            : "text-muted-foreground"
                      }
                    >
                      {p.status === "pending" && <Hourglass className="mr-1 h-3 w-3" />}
                      {p.status === "applied" && <CheckCheck className="mr-1 h-3 w-3" />}
                      {p.status === "rejected" && <XCircle className="mr-1 h-3 w-3" />}
                      {p.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">{change?.summary}</p>
                  <p className="rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground">
                    {describeChange(change, modulesList)}
                  </p>
                  {p.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={decideMutation.isPending}
                        onClick={() => decideMutation.mutate({ proposalId: p.id, decision: "applied" })}
                      >
                        <Check className="mr-1 h-4 w-4" /> Apply change
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={decideMutation.isPending}
                        onClick={() => decideMutation.mutate({ proposalId: p.id, decision: "rejected" })}
                      >
                        <X className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
