import { ActiveAction, Habit } from "@/lib/types";
import { IconEdit } from "@tabler/icons-react";
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
      {/* Use aria-label to provide an accessible name for this button for screen readers as it lacks a visible text label */}
      {/* Only clickable when nothing else is active - if a different habit is being edited, or
      the add-habit form is open, this disables. If *this* habit is the one being edited,
      HabitSection renders UpdateHabitForm instead of this component entirely, so that case
      never reaches this button at all. */}
      <button
        disabled={activeAction.type !== "none"}
        aria-label="Edit habit"
        type="button"
        className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => setActiveAction({ type: "editing", habitId: habit.id })}
      >
        <IconEdit stroke={2} color="#7aaad4" size={17} />
      </button>
    </li>
  );
}
