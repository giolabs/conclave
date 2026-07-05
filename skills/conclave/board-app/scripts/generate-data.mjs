#!/usr/bin/env node
// Deterministic, non-LLM markdown -> JSON snapshot for the Kanban board.
// Reads conclave/sprints/**, conclave/team/roster.md and writes
// conclave-board/data/board-data.generated.json. Never throws on a single
// malformed file (spec §11 Edge cases) — logs a warning and skips it so one
// bad story never blanks the whole board.
//
// Run from conclave-board/ (process.cwd()): conclave/ is its sibling.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const REPO_ROOT = path.join(process.cwd(), "..");
const CONCLAVE_DIR = path.join(REPO_ROOT, "conclave");
const SPRINTS_DIR = path.join(CONCLAVE_DIR, "sprints");
const ROSTER_PATH = path.join(CONCLAVE_DIR, "team", "roster.md");
const OUT_DIR = path.join(process.cwd(), "data");
const OUT_PATH = path.join(OUT_DIR, "board-data.generated.json");

const KNOWN_STATUSES = ["backlog", "ready", "in-progress", "review", "verified", "done"];

const warnings = [];

function warn(message) {
  warnings.push(message);
  console.warn(`[conclave-board] ${message}`);
}

function readFrontmatter(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return matter(raw).data ?? {};
  } catch (error) {
    warn(`Could not read/parse ${path.relative(REPO_ROOT, filePath)}: ${error.message}`);
    return null;
  }
}

function parseRoster() {
  // Map both the bare name and the handle (without "@") to a display record,
  // so a story's `assignee` field resolves whether it stores a name or a
  // handle. Best-effort: any parsing failure here degrades to an empty map,
  // never crashes the run.
  const byKey = new Map();

  if (!fs.existsSync(ROSTER_PATH)) return byKey;

  let raw;
  try {
    raw = fs.readFileSync(ROSTER_PATH, "utf8");
  } catch (error) {
    warn(`Could not read roster.md: ${error.message}`);
    return byKey;
  }

  const lines = raw.split("\n").filter((line) => line.trim().startsWith("|"));
  if (lines.length < 2) return byKey;

  const headerCells = lines[0]
    .split("|")
    .map((cell) => cell.trim().toLowerCase())
    .filter(Boolean);
  const memberIdx = headerCells.findIndex((cell) => cell === "member");
  const handleIdx = headerCells.findIndex((cell) => cell.includes("handle"));
  if (memberIdx === -1) return byKey;

  for (const line of lines.slice(1)) {
    const cells = line.split("|").map((cell) => cell.trim());
    // Leading/trailing empty cells come from the leading/trailing "|".
    const dataCells = cells.slice(1, -1);
    if (dataCells.every((cell) => /^-+$/.test(cell) || cell === "")) continue; // separator row

    const name = dataCells[memberIdx];
    const handleRaw = handleIdx !== -1 ? dataCells[handleIdx] : "";
    const handle = handleRaw ? handleRaw.replace(/^@/, "") : null;
    if (!name || name.toUpperCase() === "TBD") continue;

    const record = { name, handle };
    byKey.set(name.toLowerCase(), record);
    if (handle) byKey.set(handle.toLowerCase(), record);
  }

  return byKey;
}

function resolveAssignee(rawAssignee, roster) {
  if (!rawAssignee || typeof rawAssignee !== "string" || !rawAssignee.trim()) return null;
  const key = rawAssignee.trim().replace(/^@/, "").toLowerCase();
  const match = roster.get(key);
  if (match) return { name: match.name, handle: match.handle };
  // Unresolved: still show the raw string rather than dropping the field
  // (spec §11 — "renders the card with the raw handle string ... never a
  // blank/undefined assignee field").
  return { name: rawAssignee.trim(), handle: null };
}

function parseStory(filePath, roster, sprintIdFallback) {
  const data = readFrontmatter(filePath);
  if (!data) return null;

  const status = typeof data.status === "string" ? data.status : null;
  if (!status || !KNOWN_STATUSES.includes(status)) {
    warn(
      `${path.relative(REPO_ROOT, filePath)} has missing/unknown status "${status}" — excluded from the board.`,
    );
    return null;
  }

  if (!data.id || !data.title) {
    warn(`${path.relative(REPO_ROOT, filePath)} is missing id/title — excluded from the board.`);
    return null;
  }

  return {
    id: String(data.id),
    title: String(data.title),
    status,
    discipline: typeof data.discipline === "string" && data.discipline ? data.discipline : null,
    assignee: resolveAssignee(data.assignee, roster),
    priority: typeof data.priority === "string" && data.priority ? data.priority : null,
    estimate: typeof data.estimate === "string" && data.estimate ? data.estimate : null,
    sprint: typeof data.sprint === "string" && data.sprint ? data.sprint : sprintIdFallback,
  };
}

function parseSprint(sprintDirPath, roster) {
  const sprintDirName = path.basename(sprintDirPath);
  const metaPath = path.join(sprintDirPath, "meta.md");
  const metaData = fs.existsSync(metaPath) ? readFrontmatter(metaPath) : null;

  const sprintId = (metaData && metaData.id) || sprintDirName;
  const sprintTitle = (metaData && metaData.title) || sprintDirName;
  const sprintStatus = (metaData && metaData.status) || null;

  const storiesDir = path.join(sprintDirPath, "stories");
  const stories = [];

  if (fs.existsSync(storiesDir)) {
    for (const entry of fs.readdirSync(storiesDir)) {
      if (!entry.endsWith(".md")) continue;
      const story = parseStory(path.join(storiesDir, entry), roster, sprintId);
      if (story) stories.push(story);
    }
  }

  return { id: sprintId, title: sprintTitle, status: sprintStatus, stories };
}

function main() {
  const roster = parseRoster();
  const sprints = [];

  if (fs.existsSync(SPRINTS_DIR)) {
    for (const entry of fs.readdirSync(SPRINTS_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      sprints.push(parseSprint(path.join(SPRINTS_DIR, entry.name), roster));
    }
  }

  sprints.sort((a, b) => a.id.localeCompare(b.id));

  const output = {
    generatedAt: new Date().toISOString(),
    sprints,
    warnings,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));

  const storyCount = sprints.reduce((sum, sprint) => sum + sprint.stories.length, 0);
  console.log(
    `[conclave-board] Regenerated board data: ${storyCount} stories across ${sprints.length} sprint(s).`,
  );
}

main();
