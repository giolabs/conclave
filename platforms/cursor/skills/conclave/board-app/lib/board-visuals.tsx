import {
  ChevronsUp,
  ChevronUp,
  ChevronDown,
  ChevronsDown,
  Minus,
  MonitorSmartphone,
  Server,
  ShieldCheck,
  Palette,
  Wrench,
  Smartphone,
  Layers,
  type LucideIcon,
} from "lucide-react";

// Jira-style "issue type" icon + color per Conclave discipline — a small
// colored square with an icon, the same visual role Jira's story/task/bug
// icons play, keyed to a concept the team already has (discipline) instead
// of inventing a new one.
export const DISCIPLINE_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  frontend: { label: "Frontend", icon: MonitorSmartphone, color: "#2563eb" },
  backend: { label: "Backend", icon: Server, color: "#7c3aed" },
  qa: { label: "QA", icon: ShieldCheck, color: "#16a34a" },
  design: { label: "Design", icon: Palette, color: "#db2777" },
  devops: { label: "DevOps", icon: Wrench, color: "#ea580c" },
  mobile: { label: "Mobile", icon: Smartphone, color: "#0d9488" },
  multi: { label: "Multi", icon: Layers, color: "#64748b" },
};

export function disciplineMeta(discipline: string | null) {
  if (!discipline) return null;
  return DISCIPLINE_META[discipline] ?? { label: discipline, icon: Layers, color: "#64748b" };
}

// Jira-style priority chevrons — MoSCoW mapped onto the same visual grammar
// (double-up/up/down/double-down) so the priority reads at a glance without
// needing to parse the word itself.
export const PRIORITY_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  must: { label: "Must", icon: ChevronsUp, color: "#dc2626" },
  should: { label: "Should", icon: ChevronUp, color: "#ea580c" },
  could: { label: "Could", icon: ChevronDown, color: "#2563eb" },
  wont: { label: "Won't", icon: ChevronsDown, color: "#64748b" },
};

export function priorityMeta(priority: string | null) {
  if (!priority) return null;
  return PRIORITY_META[priority] ?? { label: priority, icon: Minus, color: "#94a3b8" };
}

// Deterministic avatar background color per person — same input always
// gets the same color, so a teammate's avatar looks the same everywhere
// on the board without needing to store a color anywhere.
const AVATAR_PALETTE = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#0d9488",
  "#4f46e5",
  "#c026d3",
];

export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
