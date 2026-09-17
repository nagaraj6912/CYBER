import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callRoadmapAI } from "./ai.server";
import { roadmapSummaryForAI, type RoadmapChange } from "./roadmap";

// The generated Database types lag behind newly migrated tables; queries are
// validated at runtime and every table is protected by RLS.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;

export type Workspace = {
  completions: { item_id: string; completed_at: string }[];
  sessions: { id: string; minutes: number; topic: string | null; studied_at: string }[];
  notes: { id: string; title: string; content: string; created_at: string; updated_at: string }[];
  changes: { id: string; change: RoadmapChange; created_at: string }[];
  proposals: {
    id: string;
    request: string;
    proposal: RoadmapChange;
    status: string;
    created_at: string;
  }[];
};

export const getWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Workspace> => {
    const db = context.supabase as Db;
    const userId = context.userId;

    await db
      .from("profiles")
      .upsert({ id: userId, email: context.claims.email ?? null }, { onConflict: "id" });

    const [completions, sessions, notes, changes, proposals] = await Promise.all([
      db.from("task_completions").select("item_id, completed_at").eq("user_id", userId).order("completed_at"),
      db.from("study_sessions").select("id, minutes, topic, studied_at").eq("user_id", userId).order("studied_at", { ascending: false }),
      db.from("notes").select("id, title, content, created_at, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }),
      db.from("roadmap_changes").select("id, change, created_at").eq("user_id", userId).order("created_at"),
      db.from("proposals").select("id, request, proposal, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);

    if (completions.error) throw new Error(completions.error.message);
    if (sessions.error) throw new Error(sessions.error.message);
    if (notes.error) throw new Error(notes.error.message);
    if (changes.error) throw new Error(changes.error.message);
    if (proposals.error) throw new Error(proposals.error.message);

    return {
      completions: completions.data ?? [],
      sessions: sessions.data ?? [],
      notes: notes.data ?? [],
      changes: changes.data ?? [],
      proposals: proposals.data ?? [],
    };
  });

export const toggleTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ itemId: z.string().min(1), done: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const db = context.supabase as Db;
    if (data.done) {
      const { error } = await db
        .from("task_completions")
        .upsert({ user_id: context.userId, item_id: data.itemId }, { onConflict: "user_id,item_id" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db
        .from("task_completions")
        .delete()
        .eq("user_id", context.userId)
        .eq("item_id", data.itemId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const logSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ minutes: z.number().int().min(1).max(1440), topic: z.string().max(200).optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase as Db;
    const { error } = await db.from("study_sessions").insert({
      user_id: context.userId,
      minutes: data.minutes,
      topic: data.topic ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        title: z.string().max(200).default(""),
        content: z.string().max(10000).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase as Db;
    if (data.id) {
      const { error } = await db
        .from("notes")
        .update({ title: data.title, content: data.content })
        .eq("id", data.id)
        .eq("user_id", context.userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db.from("notes").insert({
        user_id: context.userId,
        title: data.title,
        content: data.content,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const db = context.supabase as Db;
    const { error } = await db.from("notes").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ request: z.string().min(5).max(600) }).parse(data))
  .handler(async ({ data, context }) => {
    const db = context.supabase as Db;

    const result = await callRoadmapAI(data.request, roadmapSummaryForAI());

    const { data: row, error } = await db
      .from("proposals")
      .insert({
        user_id: context.userId,
        request: data.request,
        proposal: { summary: result.summary, ops: result.ops },
        status: "pending",
      })
      .select("id, request, proposal, status, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const decideProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ proposalId: z.string().uuid(), decision: z.enum(["applied", "rejected"]) }).parse(data))
  .handler(async ({ data, context }) => {
    const db = context.supabase as Db;

    const { data: proposal, error: fetchError } = await db
      .from("proposals")
      .select("id, proposal, status")
      .eq("id", data.proposalId)
      .eq("user_id", context.userId)
      .single();
    if (fetchError) throw new Error(fetchError.message);
    if (!proposal || proposal.status !== "pending") throw new Error("This proposal was already handled");

    if (data.decision === "applied") {
      const { error: insertError } = await db
        .from("roadmap_changes")
        .insert({ user_id: context.userId, change: proposal.proposal });
      if (insertError) throw new Error(insertError.message);
    }

    const { error: updateError } = await db
      .from("proposals")
      .update({ status: data.decision })
      .eq("id", data.proposalId)
      .eq("user_id", context.userId);
    if (updateError) throw new Error(updateError.message);

    return { ok: true };
  });
