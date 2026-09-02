import { toggleCompletion } from "@/app/actions";
import { getTodaysDate } from "@/lib/dates";
import { ActiveAction, Habit } from "@/lib/types";
import {
  IconAlertCircle,
  IconCircle,
  IconCircleCheckFilled,
  IconEdit,
  IconInnerShadowBottomLeft,
  IconTrash,
} from "@tabler/icons-react";
import { Dispatch, SetStateAction, useState } from "react";
import { Streak } from "./Streak";

export function HabitItem({
  habit,
  activeAction,
  setActiveAction,
  wasDoneToday,
  streakCount,
}: {
  habit: Habit;
  activeAction: ActiveAction;
  setActiveAction: Dispatch<SetStateAction<ActiveAction>>;
  wasDoneToday: boolean;
  streakCount: number;
}) {
  const [error, setError] = useState<string | undefined>();
  // The value we're waiting for wasDoneToday to become, or undefined when nothing's in flight.
  // isPending is *derived* from comparing this against the current prop, computed fresh on every
  // render, rather than tracked as separate state kept in sync via an effect - revalidatePath's
  // data refresh is a separate, later round trip, so clearing a plain isPending flag the instant
  // the request resolves showed a flash of the pre-toggle icon before fresh data arrived. Deriving
  // it this way means pending only ever clears in the same render where the confirmed value has
  // actually landed - there's no gap for a stale icon to flash in.
  const [pendingTarget, setPendingTarget] = useState<boolean | undefined>(undefined);
  const isPending = pendingTarget !== undefined && pendingTarget !== wasDoneToday;

  // Shared by all three toggle button states below - hoisted once rather than repeated per
  // branch, since it's the exact same expression regardless of which button is showing.
  const toggleAriaDescribedBy = error ? "toggle-habit-completion-error" : undefined;

  function renderToggle() {
    if (isPending) {
      return (
        <button
          type="button"
          className="cursor-pointer"
          disabled
          aria-disabled
          aria-label="Updating habit completion"
          aria-describedby={toggleAriaDescribedBy}
        >
          <IconInnerShadowBottomLeft stroke={2} className="text-line animate-spin" />
        </button>
      );
    }

    if (wasDoneToday) {
      return (
        <button
          type="button"
          onClick={() => toggleComplete(false)}
          className="cursor-pointer"
          aria-label="Mark habit as not done"
          aria-describedby={toggleAriaDescribedBy}
        >
          <IconCircleCheckFilled className="text-brand" />
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => toggleComplete(true)}
        className="cursor-pointer"
        aria-label="Mark habit as done"
        aria-describedby={toggleAriaDescribedBy}
      >
        <IconCircle stroke={2} className="text-brand" />
      </button>
    );
  }

  async function toggleComplete(shouldMarkDone: boolean) {
    setError(undefined);
    setPendingTarget(shouldMarkDone);

    try {
      const todaysDate = getTodaysDate();

      const { message } = await toggleCompletion(habit.id, todaysDate, shouldMarkDone);

      if (message) {
        setError(message);
        // No data refresh coming on a failed request - nothing to wait for, so clear pending now
        // rather than leaving isPending stuck true forever waiting for a change that isn't coming.
        setPendingTarget(undefined);
        return;
      }

      // Success: deliberately leave pendingTarget set. isPending (derived above) resolves to
      // false on its own once wasDoneToday actually updates to match it.
    } catch {
      // toggleCompletion itself always resolves with a { message } object rather than throwing -
      // see runHabitMutation in actions.ts - but this guards against the Server Action's own
      // network round trip failing outright (e.g. a dropped connection), which would otherwise
      // leave pendingTarget set forever with no data refresh ever coming to clear it.
      setError("Something went wrong. Please try again.");
      setPendingTarget(undefined);
    }
  }

  return (
    <li className="px-5 py-4 bg-white border-line rounded-[14px] border-[1.5px] font-semibold text-[17px] text-heading">
      <div className="flex justify-between items-center">
        <div className="flex gap-3.5 items-center">
          {renderToggle()}
          <span>{habit.name}</span>
        </div>
        <div className="flex gap-2.5">
          <Streak streakCount={streakCount} />
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
      </div>
      {error && (
        <p
          id="toggle-habit-completion-error"
          className="mt-1.25 flex items-center gap-1 text-xs font-semibold text-error"
        >
          <IconAlertCircle size={13} />
          {error}
        </p>
      )}
    </li>
  );
}
