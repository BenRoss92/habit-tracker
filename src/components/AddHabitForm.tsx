"use client";

import { createHabit } from "@/app/actions";
import { Dispatch, SetStateAction, useState } from "react";
import { IconAlertCircle, IconLoader2 } from "@tabler/icons-react";
import { tv } from "tailwind-variants";
import { ActiveAction } from "@/lib/types";
import { getFormState } from "@/lib/form-state";

const addHabitForm = tv({
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

export function AddHabitForm({
  activeAction,
  setActiveAction,
}: {
  activeAction: ActiveAction;
  setActiveAction: Dispatch<SetStateAction<ActiveAction>>;
}) {
  const [habitName, setHabitName] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, setIsPending] = useState(false);

  const formState = getFormState(isPending, error);
  const { form, input, submitButton, cancelButton } = addHabitForm({ state: formState });

  function updateHabitName(e: React.ChangeEvent<HTMLInputElement, HTMLInputElement>): void {
    setHabitName(e.target.value);
  }

  function cancelEdit() {
    setActiveAction({ type: "none" });
    setError(undefined);
    setHabitName("");
  }

  async function submitHabitName(event: React.SubmitEvent<HTMLFormElement>) {
    // Manually stop the form from submitting - we're choosing not to use the useActionState
    // hook on purpose here (which would do this automatically under the hood for us)
    event.preventDefault();

    // Clear any error left over from a previous failed attempt before retrying, so a stale
    // error doesn't stay on screen while this new request is pending.
    setError(undefined);
    setIsPending(true);

    try {
      const { message } = await createHabit(habitName);

      if (message) {
        setError(message);
        setIsPending(false);
        // Don't do anything else if there's an error - just return
        return;
      }

      // If there's no error, exit edit mode
      setActiveAction({ type: "none" });
      setHabitName("");
      setError(undefined);
      setIsPending(false);
    } catch {
      // createHabit itself always resolves with a { message } object rather than throwing - see
      // runHabitMutation in actions.ts - but this guards against the Server Action's own network
      // round trip failing outright (e.g. a dropped connection), which would otherwise leave the
      // form stuck showing "Adding..." forever with no error ever shown.
      setError("Something went wrong. Please try again.");
      setIsPending(false);
    }
  }

  return (
    activeAction.type === "adding" && (
      <form onSubmit={submitHabitName} className={form()}>
        {/* Adding a label also does the same job as 'aria-label' 
      as it serves both screen readers 
      and non-screen reader users - good for accessibility */}
        <label
          className=" mb-1.5 text-xs font-bold text-heading uppercase tracking-[0.06em]"
          htmlFor="add-habit-name"
        >
          Habit name
        </label>
        <input
          className={input()}
          placeholder="e.g. Morning run"
          value={habitName}
          onChange={updateHabitName}
          id="add-habit-name"
          disabled={isPending}
          // Ties the input to its error message for screen readers.
          // When an error isn't in the DOM, don't add the aria-describedby attribute, otherwise it
          // will confused screen readers (recommended approach) as the input will reference an
          // error element that doesn't exist in the DOM .
          aria-describedby={error ? "add-habit-name-error" : undefined}
        />
        {error && (
          <p
            id="add-habit-name-error"
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
            <span>{isPending ? "Adding..." : "Add"}</span>
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
    )
  );
}
