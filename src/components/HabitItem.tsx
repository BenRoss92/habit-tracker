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
    <li className="px-4 py-4 bg-white border-line rounded-[14px] border-[1.5px] font-semibold text-[17px] text-heading">
      {/* px-4, not design.md's own literal px-5 (1.25rem) spec - shaving 4px off each side hands
      that width straight to the name (the only flex-growing element in the row - toggle, badge,
      and the edit/delete group are all fixed/shrink-0), without touching any of the gaps between
      elements below. Chosen over shrinking one of those inter-element gaps instead, since the
      proximity grouping they establish (toggle+name close, controls cluster close, a clearly
      bigger gap between the two) is exactly what you asked to keep the last two times.

      One row, always - toggle on the left, name next to it (wrapping when long, never
      truncated), streak badge + edit/delete on the right. gap-4 is the real, reserved gap between
      the name and the controls - not justify-between, which only creates a gap from whatever
      width happens to be left over and shrinks toward zero exactly as the name grows long enough
      to need it most. min-w-0 flex-1 on the name's own flex item lets it actually claim all
      remaining row width and shrink below its content's natural width to wrap into that space
      (the default min-width: auto otherwise refuses to); shrink-0 on the controls group stops it
      ever being squeezed instead, so the name - not the controls - is what gives first.

      Proximity keeps the grouping legible within that: toggle+name stay close (gap-3, one content
      unit), streak badge+edit+delete stay closer still (gap-2, one controls cluster - they're all
      auxiliary, not something a user needs to read), and gap-4 between the two groups is
      deliberately the largest of the three, without being so wide that it eats into the name's
      own wrap width the way a wider gap did in an earlier pass. items-center throughout keeps
      every element vertically centered against each other regardless of how many lines a long
      name wraps to.

      p-1 on the edit/delete buttons (bare 17px SVGs otherwise) grows their real tap target to
      25x25px - short of the 44px ideal, but a real improvement over 17px, chosen to spend as
      little of the row's width as possible on the controls side. */}
      <div className="flex items-center gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {renderToggle()}
          <span>{habit.name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
            className="cursor-pointer p-1 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setActiveAction({ type: "editing", habitId: habit.id })}
          >
            <IconEdit stroke={2} size={17} className="text-action-icon" />
          </button>
          <button
            disabled={activeAction.type !== "none"}
            aria-label="Delete habit"
            type="button"
            className="cursor-pointer p-1 disabled:cursor-not-allowed disabled:opacity-40"
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
