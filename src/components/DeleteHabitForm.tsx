"use client";

import { deleteHabit } from "@/app/actions";
import { getFormState } from "@/lib/form-state";
import { ActiveAction, Habit } from "@/lib/types";
import { IconAlertCircle, IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";
import { Dispatch, SetStateAction, useState } from "react";
import { tv } from "tailwind-variants";

const deleteHabitForm = tv({
  slots: {
    form: "flex flex-col rounded-[14px] px-5 py-4 mb-2.5 items-start border-2",
    submitButton:
      "rounded-[20px] text-white py-2 px-[18px] font-bold text-sm flex gap-1.5 items-center",
    cancelButton: "rounded-[20px] py-2 px-[18px] font-semibold text-sm border-[1.5px]",
  },
  variants: {
    state: {
      idle: {
        form: "border-error bg-white",
        submitButton: "bg-error cursor-pointer",
        cancelButton: "border-line text-muted cursor-pointer",
      },
      error: {
        form: "border-error bg-white",
        submitButton: "bg-error cursor-pointer",
        cancelButton: "border-line text-muted cursor-pointer",
      },
      pending: {
        form: "border-error bg-white opacity-60",
        submitButton: "bg-delete-disabled cursor-not-allowed",
        cancelButton: "border-line text-line cursor-not-allowed",
      },
    },
  },
  defaultVariants: { state: "idle" },
});

export function DeleteHabitForm({
  habit,
  setActiveAction,
}: {
  habit: Habit;
  setActiveAction: Dispatch<SetStateAction<ActiveAction>>;
}) {
  const [error, setError] = useState<string | undefined>();
  const [isPending, setIsPending] = useState(false);

  const formState = getFormState(isPending, error);
  const { form, submitButton, cancelButton } = deleteHabitForm({ state: formState });

  function cancelEdit() {
    setActiveAction({ type: "none" });
    setError(undefined);
  }

  async function submitHabit(event: React.SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setError(undefined);
    setIsPending(true);

    try {
      const { message } = await deleteHabit(habit.id);

      if (message) {
        setError(message);
        setIsPending(false);
        return;
      }

      setActiveAction({ type: "none" });
      setError(undefined);
      setIsPending(false);
    } catch {
      // deleteHabit itself always resolves with a { message } object rather than throwing - see
      // runHabitMutation in actions.ts - but this guards against the Server Action's own network
      // round trip failing outright (e.g. a dropped connection), which would otherwise leave the
      // confirmation stuck showing "Deleting..." forever with no error ever shown.
      setError("Something went wrong. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <li>
      <form onSubmit={submitHabit} className={form()}>
        <h3 className="text-[13px] flex gap-1.5 items-center text-error font-bold mb-2">
          <IconAlertTriangle stroke={2} size={13} />
          Delete this habit?
        </h3>
        <p className="text-[15px] font-bold mb-1 text-heading">{habit.name}</p>
        <p id="delete-habit-description" className="text-xs text-muted">
          This will permanently delete the habit and all of its history. This cannot be undone.
        </p>
        {error && (
          <p
            id="delete-habit-error"
            className="mt-1.25 flex items-center gap-1 text-xs font-semibold text-error"
          >
            <IconAlertCircle size={13} />
            {error}
          </p>
        )}
        <div className="flex gap-2 mt-3">
          <button
            type="submit"
            aria-describedby={
              error ? "delete-habit-description delete-habit-error" : "delete-habit-description"
            }
            aria-disabled={isPending}
            disabled={isPending}
            className={submitButton()}
          >
            {isPending && <IconLoader2 size={14} className="animate-spin" />}
            <span>{isPending ? "Deleting..." : "Delete"}</span>
          </button>
          <button
            type="button"
            disabled={isPending}
            className={cancelButton()}
            onClick={() => cancelEdit()}
          >
            Cancel
          </button>
        </div>
      </form>
    </li>
  );
}
