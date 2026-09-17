import type { RoadmapOp } from "./roadmap";
import { z } from "zod";

const opsSchema = z.array(
  z.object({
    type: z.string(),
    module_id: z.string().optional(),
    task_id: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    tasks: z.array(z.object({ title: z.string(), description: z.string().optional() })).optional(),
  }),
);

const resultSchema = z.object({
  summary: z.string().min(1),
  ops: opsSchema.min(1),
});

function parseAiJson(raw: string): unknown {
  const cleaned = raw.replace(/```json/gi, "```").split("```").join("\n").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI returned an unreadable response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function callRoadmapAI(
  userRequest: string,
  roadmapSummary: unknown,
): Promise<{ summary: string; ops: RoadmapOp[] }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured yet — please try again later");

  const system = [
    "You are CyberTrack's roadmap advisor for a beginner learning SOC / blue-team skills over six months.",
    "You propose small, concrete changes to the learner's roadmap based on their request.",
    'Respond with ONLY a JSON object: {"summary": string, "ops": [...]}',
    "Each op is one of:",
    '{"type":"add_task","module_id":"<existing module id>","title":"...","description":"..."}',
    '{"type":"remove_task","task_id":"<existing task id>"}',
    '{"type":"add_module","title":"...","description":"...","tasks":[{"title":"...","description":"..."}]}',
    "Rules: keep tasks beginner-friendly and specific; 1-4 ops max; reference existing module_id/task_id exactly as given;",
    "do not remove the fundamentals unless the learner explicitly asks; summary is one friendly sentence.",
  ].join("\n");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-3.8-flash",
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Current roadmap:\n${JSON.stringify(roadmapSummary)}\n\nLearner's request: ${userRequest}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`AI request failed (${res.status}) — please try again`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "";
  const parsed = resultSchema.safeParse(parseAiJson(content));

  if (!parsed.success) {
    throw new Error(
      "The assistant couldn't turn that into a roadmap change. Try rephrasing it, e.g. \"add a beginner task about reading firewall logs\".",
    );
  }

  return {
    summary: parsed.data.summary,
    ops: parsed.data.ops as RoadmapOp[],
  };
}
