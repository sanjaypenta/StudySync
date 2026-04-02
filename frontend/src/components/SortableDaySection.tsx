import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Todo } from "@/lib/api";
import { patchTodo, rebalanceTodos } from "@/lib/api";
import { subjectChipClass } from "@/lib/subjectColors";

function tagLabel(tag: Todo["priority_tag"]): string {
  if (tag === "must_do") return "Must-do";
  if (tag === "suggested") return "Suggested";
  return "Flexible";
}

function tagClass(tag: Todo["priority_tag"]): string {
  if (tag === "must_do") return "bg-red-100 text-red-900 border-red-200";
  if (tag === "suggested") return "bg-sky-100 text-sky-900 border-sky-200";
  return "bg-zinc-100 text-zinc-700 border-zinc-200";
}

function SortableRow({
  t,
  onSkip,
}: {
  t: Todo;
  onSkip: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: t.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm flex flex-wrap items-start justify-between gap-3"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-zinc-400 hover:text-zinc-700 px-1"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ::
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded border ${tagClass(
              t.priority_tag
            )}`}
          >
            {tagLabel(t.priority_tag)}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded ${subjectChipClass(t.subject)}`}
          >
            {t.subject}
          </span>
          {t.status === "skipped" && (
            <span className="text-xs text-zinc-400">Skipped</span>
          )}
          {t.status === "completed" && (
            <span className="text-xs text-emerald-700">Done</span>
          )}
        </div>
        <p className="mt-1 font-medium text-zinc-900 text-sm">{t.task_title}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {t.hours}h
          {t.slot_start && t.slot_end && (
            <>
              {" "}
              · {t.slot_start}–{t.slot_end}
            </>
          )}
        </p>
      </div>
      {t.status === "pending" && (
        <button
          type="button"
          onClick={() => onSkip(t.id)}
          className="text-xs text-zinc-600 hover:text-zinc-900 underline"
        >
          Skip
        </button>
      )}
    </li>
  );
}

export function SortableDaySection({
  date,
  isToday,
  initialItems,
  onMergeDay,
}: {
  date: string;
  isToday: boolean;
  initialItems: Todo[];
  onMergeDay: (date: string, dayTodos: Todo[]) => void;
}) {
  const [items, setItems] = useState(initialItems);
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((t) => t.id === active.id);
    const newIndex = items.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    try {
      const refreshed = await rebalanceTodos(
        date,
        next.map((t) => t.id)
      );
      onMergeDay(date, refreshed);
    } catch {
      setItems(initialItems);
    }
  }

  async function skipTask(id: string) {
    const { todo: updated } = await patchTodo(id, { status: "skipped" });
    const next = items.map((t) => (t.id === id ? updated : t));
    setItems(next);
    onMergeDay(date, next);
  }

  const ids = items.map((t) => t.id);

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {isToday ? "Today" : date}
      </h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="mt-3 space-y-2">
            {items.map((t) => (
              <SortableRow key={t.id} t={t} onSkip={(id) => void skipTask(id)} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  );
}
