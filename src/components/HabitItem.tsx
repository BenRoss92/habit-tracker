import { Habit } from "@/lib/types";
import { IconEdit } from "@tabler/icons-react";
import { Dispatch, SetStateAction } from "react";

export function HabitItem({
  habit,
  setIsUpdating,
}: {
  habit: Habit;
  setIsUpdating: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <li className="px-5 py-4 bg-white border-line rounded-[14px] border-[1.5px] font-semibold text-[17px] text-heading flex justify-between items-center">
      <span>{habit.name}</span>
      {/* Use aria-label to provide an accessible name for this button for screen readers as it lacks a visible text label */}
      <button
        aria-label="Edit habit"
        type="button"
        className="cursor-pointer"
        onClick={() => setIsUpdating(true)}
      >
        <IconEdit stroke={2} color="#7aaad4" size={17} />
      </button>
    </li>
  );
}
