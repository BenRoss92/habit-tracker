"use client";

import { updateHabit } from "@/app/actions";
import { getFormState } from "@/lib/form-state";
import { ActiveAction, Habit } from "@/lib/types";
import { IconAlertCircle, IconLoader2 } from "@tabler/icons-react";
import { Dispatch, SetStateAction, useState } from "react";
import { tv } from "tailwind-variants";

const updateHabitForm = tv({
  slots: {
    form: "flex flex-col rounded-[14px] px-5 py-4 mb-2.5 items-start border-[1.5px]",
    input:
      "rounded-[10px] w-full py-[9px] px-3 text-[15px] font-medium border-[1.5px] outline-none focus:border-brand disabled:cursor-not-allowed",
    submitButton:
      "rounded-[20px] text-white py-2 px-[18px] font-bold text-sm mt-2.5 flex gap-1.5 items-center",
    cancelButton: "rounded-[20px] py-2 px-[18px] font-semibold text-sm border-[1.5px] mt-2.5",
  },
  variants: {
    state: {
      idle: {
        form: "border-brand bg-white",
        input: "border-line bg-white text-heading",
        submitButton: "bg-brand cursor-pointer",
        cancelButton: "border-line text-muted cursor-pointer",
      },
      error: {
        form: "border-error bg-white",
        input: "border-error bg-error-muted text-heading",
        submitButton: "bg-brand cursor-pointer",
        cancelButton: "border-line text-muted cursor-pointer",
      },
      pending: {
        form: "border-brand bg-white opacity-60",
        input: "border-line bg-input-bg-disabled text-line",
        submitButton: "bg-line cursor-not-allowed",
        cancelButton: "border-line text-line cursor-not-allowed",
      },
    },
  },
  defaultVariants: { state: "idle" },
});

export function UpdateHabitForm({
  habit,
  setActiveAction,
}: {
  habit: Habit;
  setActiveAction: Dispatch<SetStateAction<ActiveAction>>;
}) {
  const [draftedName, setDraftedName] = useState(habit.name);
  const [error, setError] = useState<string | undefined>();
  const [isPending, setIsPending] = useState(false);

  const formState = getFormState(isPending, error);
  const { form, input, submitButton, cancelButton } = updateHabitForm({ state: formState });

  function cancelEdit() {
    setActiveAction({ type: "none" });
    setError(undefined);
    setDraftedName(habit.name);
  }

  async function submitHabit(event: React.SubmitEvent<HTMLFormElement>): Promise<void> {
    // Manually stop the form from submitting - we're choosing not to use the useActionState
    // hook on purpose here (which would do this automatically under the hood for us)
    event.preventDefault();

    // Clear any error left over from a previous failed attempt before retrying, so a stale
    // error doesn't stay on screen while this new request is pending.
    setError(undefined);
    setIsPending(true);

    const { message } = await updateHabit(habit.id, draftedName);

    if (message) {
      setError(message);
      setIsPending(false);
      return;
    }

    setActiveAction({ type: "none" });
    setError(undefined);
    setIsPending(false);
  }

  return (
    <li>
      <form onSubmit={submitHabit} className={form()}>
        <label
          className=" mb-1.5 text-xs font-bold text-heading uppercase tracking-[0.06em]"
          htmlFor="update-habit-name"
        >
          Edit habit name
        </label>
        <input
          className={input()}
          placeholder="e.g. Morning run"
          value={draftedName}
          onChange={(e) => setDraftedName(e.target.value)}
          id="update-habit-name"
          disabled={isPending}
          aria-describedby={error ? "update-habit-name-error" : undefined}
        />
        {error && (
          <p
            id="update-habit-name-error"
            className="mt-1.25 flex items-center gap-1 text-xs font-semibold text-error"
          >
            <IconAlertCircle size={13} />
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            aria-disabled={isPending}
            disabled={isPending}
            className={submitButton()}
          >
            {isPending && <IconLoader2 size={14} className="animate-spin" />}
            <span>{isPending ? "Updating..." : "Update"}</span>
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
