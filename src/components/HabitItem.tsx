import { ActiveAction, Habit } from "@/lib/types";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { Dispatch, SetStateAction } from "react";

export function HabitItem({
  habit,
  activeAction,
  setActiveAction,
}: {
  habit: Habit;
  activeAction: ActiveAction;
  setActiveAction: Dispatch<SetStateAction<ActiveAction>>;
}) {
  return (
    <li className="px-5 py-4 bg-white border-line rounded-[14px] border-[1.5px] font-semibold text-[17px] text-heading flex justify-between items-center">
      <span>{habit.name}</span>
      <div className="flex gap-2.5">
        {/* Use aria-label on each button to provide an accessible name for screen readers, since
        neither has visible text - only an icon. Both buttons are only clickable when nothing else
        is active: if a different habit is being edited/deleted, or the add-habit form is open,
        both disable. If *this* habit is the one being edited or deleted, HabitSection renders
        UpdateHabitForm/DeleteHabitForm instead of this component entirely, so that case never
        reaches these buttons at all. */}
        <button
          disabled={activeAction.type !== "none"}
          aria-label="Edit habit"
          type="button"
          className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => setActiveAction({ type: "editing", habitId: habit.id })}
        >
          <IconEdit stroke={2} size={17} className="text-action-icon" />
        </button>
        <button
          disabled={activeAction.type !== "none"}
          aria-label="Delete habit"
          type="button"
          className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => setActiveAction({ type: "deleting", habitId: habit.id })}
        >
          <IconTrash stroke={2} size={17} className="text-action-icon" />
        </button>
      </div>
    </li>
  );
}
