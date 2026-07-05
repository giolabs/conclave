import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type BoardTheme = {
  companyName: string | null;
  logoPath: string | null;
  primaryColor: string;
  accentColor: string;
};

const DEFAULT_PRIMARY = "#4f46e5";
const DEFAULT_ACCENT = "#14b8a6";
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// conclave-board/ is a sibling of conclave/ (spec §5) — resolve relative to
// wherever this app's process is actually run from, not import.meta.url,
// since Next.js bundles this file.
function boardMdPath(): string {
  return path.join(process.cwd(), "..", "conclave", "team", "board.md");
}

function resolveValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase() === "TBD") return null;
  return trimmed;
}

function resolveColor(value: unknown, fallback: string): string {
  const resolved = resolveValue(value);
  if (resolved && HEX_RE.test(resolved)) return resolved;
  return fallback;
}

// Read live on every call (server component / build time) — board.md
// changes should show up on the board's next hot reload with no
// regeneration step, unlike story data (see board.template.md).
export function readBoardTheme(): BoardTheme {
  const filePath = boardMdPath();

  if (!fs.existsSync(filePath)) {
    return {
      companyName: null,
      logoPath: null,
      primaryColor: DEFAULT_PRIMARY,
      accentColor: DEFAULT_ACCENT,
    };
  }

  try {
    const { data } = matter(fs.readFileSync(filePath, "utf8"));
    return {
      companyName: resolveValue(data.company_name),
      logoPath: resolveValue(data.logo_path),
      primaryColor: resolveColor(data.primary_color, DEFAULT_PRIMARY),
      accentColor: resolveColor(data.accent_color, DEFAULT_ACCENT),
    };
  } catch {
    // Malformed board.md must never crash the board (spec §9 Errores) —
    // fall back to the generic default brand.
    return {
      companyName: null,
      logoPath: null,
      primaryColor: DEFAULT_PRIMARY,
      accentColor: DEFAULT_ACCENT,
    };
  }
}
