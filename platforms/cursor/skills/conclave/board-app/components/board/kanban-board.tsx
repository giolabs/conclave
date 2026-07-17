"use client";

import { useState } from "react";

import { KanbanColumn } from "@/components/board/kanban-column";
import { EmptyState } from "@/components/board/empty-state";
import { cn } from "@/lib/utils";
import type { BoardSprint, StoryStatus } from "@/lib/board-data";

const STATUSES: StoryStatus[] = ["backlog", "ready", "in-progress", "review", "verified", "done"];

export function KanbanBoard({
  sprints,
  accentColor,
}: {
  sprints: BoardSprint[];
  accentColor: string;
}) {
  const [selectedSprintId, setSelectedSprintId] = useState(sprints[0]?.id);
  const selectedSprint = sprints.find((sprint) => sprint.id === selectedSprintId) ?? sprints[0];

  if (!selectedSprint) {
    return (
      <EmptyState message="No sprints yet — run /conclave-spec and /conclave-planning to get data, then this board picks it up on the next reload." />
    );
  }

  const total = selectedSprint.stories.length;
  const done = selectedSprint.stories.filter((story) => story.status === "done").length;

  return (
    <div className="flex flex-1 flex-col gap-4 px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-1">
          {sprints.map((sprint) => (
            <button
              key={sprint.id}
              type="button"
              onClick={() => setSelectedSprintId(sprint.id)}
              className={cn(
                "rounded-t-md border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
                sprint.id === selectedSprint.id
                  ? "border-current text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-800",
              )}
              style={sprint.id === selectedSprint.id ? { color: accentColor, borderColor: accentColor } : undefined}
            >
              {sprint.title}
              <span className="ml-1.5 text-[11px] font-normal text-neutral-400">
                ({sprint.status ?? "unknown"})
              </span>
            </button>
          ))}
        </div>

        {total > 0 && (
          <div className="flex items-center gap-2 text-[12px] text-neutral-500">
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full"
                style={{ width: `${(done / total) * 100}%`, backgroundColor: accentColor }}
              />
            </div>
            <span>
              {done}/{total} done
            </span>
          </div>
        )}
      </div>

      <div className="grid flex-1 grid-cols-6 items-start gap-3 pb-4">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            stories={selectedSprint.stories.filter((story) => story.status === status)}
          />
        ))}
      </div>
    </div>
  );
}
