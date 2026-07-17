import { StoryCard } from "@/components/board/story-card";
import type { BoardStory, StoryStatus } from "@/lib/board-data";

const COLUMN_META: Record<StoryStatus, { label: string; dot: string }> = {
  backlog: { label: "Backlog", dot: "#94a3b8" },
  ready: { label: "Ready", dot: "#38bdf8" },
  "in-progress": { label: "In Progress", dot: "#f59e0b" },
  review: { label: "Review", dot: "#a855f7" },
  verified: { label: "Verified", dot: "#22c55e" },
  done: { label: "Done", dot: "#16a34a" },
};

export function KanbanColumn({ status, stories }: { status: StoryStatus; stories: BoardStory[] }) {
  const meta = COLUMN_META[status];

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-md bg-neutral-100/70 p-2">
      <div className="flex items-center gap-2 px-1.5 pt-1">
        <span className="size-2 rounded-full" style={{ backgroundColor: meta.dot }} />
        <h2 className="text-[11px] font-semibold tracking-wide text-neutral-500 uppercase">
          {meta.label}
        </h2>
        <span className="ml-auto rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">
          {stories.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 px-0.5 pb-1">
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
        {stories.length === 0 && (
          <div className="rounded-md border border-dashed border-neutral-300 p-4 text-center text-[11px] text-neutral-400">
            No stories
          </div>
        )}
      </div>
    </div>
  );
}
