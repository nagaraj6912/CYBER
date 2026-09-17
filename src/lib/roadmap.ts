// Static six-month roadmap, recovered from the original CyberTrack app.
// User-specific AI changes are merged on top via applyChanges().

export type RoadmapResource = {
  title: string;
  url: string;
  provider: string;
};

export type RoadmapTask = {
  id: string;
  title: string;
  description?: string;
  ai?: boolean;
};

export type RoadmapModule = {
  id: string;
  month: number;
  title: string;
  description: string;
  tasks: RoadmapTask[];
  resources: RoadmapResource[];
  ai?: boolean;
};

export type RoadmapOp =
  | { type: "add_task"; module_id: string; title: string; description?: string }
  | { type: "remove_task"; task_id: string }
  | { type: "add_module"; title: string; description?: string; tasks?: { title: string; description?: string }[] };

export type RoadmapChange = {
  summary: string;
  ops: RoadmapOp[];
};

export const ROADMAP: RoadmapModule[] = [
  {
    id: "m1",
    month: 1,
    title: "Security fundamentals",
    description: "Understand threats, vulnerabilities, identity, encryption and the incident lifecycle.",
    tasks: [
      { id: "m1-t1", title: "Finish the TryHackMe: Pre Security path", description: "Covers the basics every SOC role assumes you know." },
      { id: "m1-t2", title: "Study the CIA triad, threats and vulnerabilities", description: "Write a one-page summary in your notes." },
      { id: "m1-t3", title: "Start the ISC2 Certified in Cybersecurity course", description: "Free entry-level certification — good résumé signal." },
    ],
    resources: [
      { title: "TryHackMe: Pre Security", url: "https://tryhackme.com/path/outline/presecurity", provider: "TryHackMe" },
      { title: "ISC2 Certified in Cybersecurity", url: "https://www.isc2.org/certifications/cc", provider: "ISC2" },
    ],
  },
  {
    id: "m2",
    month: 2,
    title: "Networking essentials",
    description: "Read basic network traffic and troubleshoot TCP/IP, ports, DNS and DHCP.",
    tasks: [
      { id: "m2-t1", title: "Work through the Professor Messer Network+ playlist", description: "One section per study session." },
      { id: "m2-t2", title: "Complete TryHackMe: Network Fundamentals", description: "Hands-on packets, ports and protocols." },
      { id: "m2-t3", title: "Practice subnetting until it clicks", description: "20 problems, then check your answers." },
    ],
    resources: [
      { title: "Professor Messer: Network+ playlist", url: "https://www.professormesser.com/network-plus/n10-009/n10-009-video/n10-009-training-course/", provider: "Professor Messer" },
      { title: "TryHackMe: Network Fundamentals", url: "https://tryhackme.com/module/network-fundamentals", provider: "TryHackMe" },
    ],
  },
  {
    id: "m3",
    month: 3,
    title: "Cisco networking basics",
    description: "Build and inspect small networks: switches, routers, VLANs and routing basics.",
    tasks: [
      { id: "m3-t1", title: "Complete the Cisco Networking Basics course", description: "Free on Cisco Networking Academy." },
      { id: "m3-t2", title: "Build a two-router lab in Packet Tracer", description: "Screenshot it into your notes as lab evidence." },
      { id: "m3-t3", title: "Explain DNS and DHCP lookups out loud", description: "If you can teach it, you know it." },
    ],
    resources: [
      { title: "Cisco Networking Basics", url: "https://www.netacad.com/courses/networking-basics", provider: "Cisco NetAcad" },
    ],
  },
  {
    id: "m4",
    month: 4,
    title: "Systems: Linux & Windows",
    description: "Navigate Linux, understand Windows accounts, files, services and logs.",
    tasks: [
      { id: "m4-t1", title: "Get comfortable in a Linux shell", description: "Files, permissions, processes, logs." },
      { id: "m4-t2", title: "Complete Microsoft Learn: Windows security", description: "Accounts, event logs, services." },
      { id: "m4-t3", title: "Read real Windows Event Log entries", description: "Find logon events (4624) and explain them." },
    ],
    resources: [
      { title: "Microsoft Learn: Windows security", url: "https://learn.microsoft.com/en-us/windows/security/", provider: "Microsoft Learn" },
      { title: "TryHackMe: Linux Fundamentals", url: "https://tryhackme.com/module/linux-fundamentals", provider: "TryHackMe" },
    ],
  },
  {
    id: "m5",
    month: 5,
    title: "SOC analyst core skills",
    description: "Triage alerts, use common log fields and write a clear investigation summary.",
    tasks: [
      { id: "m5-t1", title: "Work through TryHackMe: SOC Level 1", description: "The core SOC analyst path." },
      { id: "m5-t2", title: "Run your first LetsDefend SOC alerts", description: "Triage real simulated alerts end to end." },
      { id: "m5-t3", title: "Write three investigation summaries", description: "Keep them in your notes — interview gold." },
    ],
    resources: [
      { title: "TryHackMe: SOC Level 1", url: "https://tryhackme.com/path/outline/soclevel1", provider: "TryHackMe" },
      { title: "LetsDefend SOC Analyst", url: "https://letsdefend.io/", provider: "LetsDefend" },
    ],
  },
  {
    id: "m6",
    month: 6,
    title: "Detection & investigation labs",
    description: "Investigate phishing, authentication and endpoint scenarios; document evidence.",
    tasks: [
      { id: "m6-t1", title: "Add a phishing investigation practice", description: "Dissect a real phishing email header by header." },
      { id: "m6-t2", title: "Solve CyberDefenders blue-team challenges", description: "PCAP and log-based investigations." },
      { id: "m6-t3", title: "Start Security Blue Team: BTL1", description: "The certification most junior SOC roles ask for." },
    ],
    resources: [
      { title: "CyberDefenders", url: "https://cyberdefenders.org/", provider: "CyberDefenders" },
      { title: "Security Blue Team: BTL1", url: "https://www.securityblue.team/why-btl1", provider: "Security Blue Team" },
    ],
  },
];

export function applyChanges(changes: { id: string; change: RoadmapChange | null }[]): RoadmapModule[] {
  const mods: RoadmapModule[] = structuredClone(ROADMAP);
  for (const ch of changes) {
    const ops = ch.change?.ops ?? [];
    ops.forEach((op, i) => {
      const tag = `ai-${String(ch.id).slice(0, 8)}`;
      if (op.type === "add_task" && op.module_id) {
        const m = mods.find((x) => x.id === op.module_id);
        if (m) {
          m.tasks.push({
            id: `${tag}-t${i}`,
            title: op.title,
            ...(op.description ? { description: op.description } : {}),
            ai: true,
          });
        }
      } else if (op.type === "remove_task" && op.task_id) {
        for (const m of mods) m.tasks = m.tasks.filter((t) => t.id !== op.task_id);
      } else if (op.type === "add_module") {
        mods.push({
          id: `${tag}-m${i}`,
          month: mods.length + 1,
          title: op.title,
          description: op.description ?? "",
          ai: true,
          tasks: (op.tasks ?? []).map((t, j) => ({
            id: `${tag}-m${i}-t${j}`,
            title: t.title,
            ...(t.description ? { description: t.description } : {}),
            ai: true,
          })),
          resources: [],
        });
      }
    });
  }
  return mods;
}

export function roadmapSummaryForAI() {
  return ROADMAP.map((m) => ({
    module_id: m.id,
    title: m.title,
    tasks: m.tasks.map((t) => ({ task_id: t.id, title: t.title })),
  }));
}

export function totalTaskCount(modules: RoadmapModule[]) {
  return modules.reduce((acc, m) => acc + m.tasks.length, 0);
}

export function findNextUp(modules: RoadmapModule[], completedIds: Set<string>) {
  for (const m of modules) {
    for (const t of m.tasks) {
      if (!completedIds.has(t.id)) return { task: t, module: m };
    }
  }
  return null;
}

export function computeStreak(sessionDates: string[]) {
  const days = new Set(sessionDates);
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  let streak = 0;
  const cursor = new Date(today);
  if (!days.has(fmt(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(fmt(cursor))) return 0;
  }
  while (days.has(fmt(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
