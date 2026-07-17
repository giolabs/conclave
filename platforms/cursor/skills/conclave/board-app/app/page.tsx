import { KanbanBoard } from "@/components/board/kanban-board";
import { EmptyState } from "@/components/board/empty-state";
import { readBoardData } from "@/lib/board-data";
import { readBoardTheme } from "@/lib/theme";

// Without this, `next build && next start` would prerender this page once
// and never re-read board-data.generated.json again — defeating the whole
// "stays current via the regeneration hook" design (spec §5, §9). `next dev`
// re-renders per request regardless, but this keeps `npm start` correct too.
export const dynamic = "force-dynamic";

export default function BoardPage() {
  const data = readBoardData();
  const theme = readBoardTheme();

  if (!data) {
    return (
      <EmptyState message="No board data yet — run /conclave-board from Claude Code, or check that conclave/sprints/ has at least one sprint." />
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <KanbanBoard sprints={data.sprints} accentColor={theme.accentColor} />
      {data.warnings.length > 0 && (
        <div className="mx-6 mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="font-medium">{data.warnings.length} file(s) skipped while building this board:</p>
          <ul className="mt-1 list-inside list-disc">
            {data.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
