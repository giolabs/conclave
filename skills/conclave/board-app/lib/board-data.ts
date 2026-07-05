import fs from "node:fs";
import path from "node:path";

export type StoryStatus = "backlog" | "ready" | "in-progress" | "review" | "verified" | "done";

export type BoardStory = {
  id: string;
  title: string;
  status: StoryStatus | null;
  discipline: string | null;
  assignee: { name: string; handle: string | null } | null;
  priority: string | null;
  estimate: string | null;
};

export type BoardSprint = {
  id: string;
  title: string;
  status: string | null;
  stories: BoardStory[];
};

export type BoardData = {
  generatedAt: string;
  sprints: BoardSprint[];
  warnings: string[];
};

const DATA_PATH = path.join(process.cwd(), "data", "board-data.generated.json");

// Missing file is a normal, expected state — before the first
// /conclave-board run's data-generation step, or if the hook hasn't fired
// yet. Never throws; the page renders its own empty state instead (spec §9).
export function readBoardData(): BoardData | null {
  if (!fs.existsSync(DATA_PATH)) return null;

  try {
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    return JSON.parse(raw) as BoardData;
  } catch {
    return null;
  }
}
