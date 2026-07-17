import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { disciplineMeta, priorityMeta, avatarColor } from "@/lib/board-visuals";
import type { BoardStory } from "@/lib/board-data";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function StoryCard({ story }: { story: BoardStory }) {
  const discipline = disciplineMeta(story.discipline);
  const priority = priorityMeta(story.priority);
  const DisciplineIcon = discipline?.icon;
  const PriorityIcon = priority?.icon;

  return (
    <div className="group flex cursor-default flex-col gap-2 rounded-[3px] border border-neutral-200 bg-white p-3 shadow-[0_1px_1px_rgba(9,30,66,0.15)] transition-shadow hover:shadow-[0_2px_4px_rgba(9,30,66,0.2)]">
      <p className="text-[13px] leading-snug font-normal text-neutral-800">{story.title}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {discipline && DisciplineIcon && (
            <span
              className="flex size-5 items-center justify-center rounded-[3px]"
              style={{ backgroundColor: `${discipline.color}1a` }}
              title={discipline.label}
            >
              <DisciplineIcon className="size-3.5" style={{ color: discipline.color }} strokeWidth={2.5} />
            </span>
          )}
          <span className="font-mono text-[11px] text-neutral-400">{story.id}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {story.estimate && (
            <span className="flex size-5 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-600">
              {story.estimate}
            </span>
          )}
          {priority && PriorityIcon && (
            <PriorityIcon className="size-4" style={{ color: priority.color }} strokeWidth={2.5} title={priority.label} />
          )}
          {story.assignee ? (
            <Avatar>
              <AvatarFallback
                style={{ backgroundColor: avatarColor(story.assignee.name), color: "white" }}
              >
                {initials(story.assignee.name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="flex size-6 items-center justify-center rounded-full border border-dashed border-neutral-300 text-[9px] text-neutral-400">
              —
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
