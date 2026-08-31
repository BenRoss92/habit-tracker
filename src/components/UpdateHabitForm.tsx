"use client";

import { updateHabit } from "@/app/actions";
import { getFormState } from "@/lib/form-state";
import { ActiveAction, Habit } from "@/lib/types";
import { IconAlertCircle, IconLoader2 } from "@tabler/icons-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
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
  // isPending: the updateHabit request itself is genuinely in flight.
  const [isPending, setIsPending] = useState(false);
  // submittedName: set once a request has *succeeded*, to the (trimmed) name it submitted - or
  // undefined when there's nothing awaiting confirmation. Kept separate from isPending, rather
  // than folded into one derived flag the way HabitItem's toggle does it, because a toggle always
  // submits the opposite of its current confirmed value, so the two can never coincidentally
  // already match - an edit can, if a user resubmits a name unchanged, which would make a single
  // "target !== confirmed prop" comparison see "matched" and close the form before the request
  // had even finished if it were set eagerly on submit rather than only once the request actually
  // succeeds.
  const [submittedName, setSubmittedName] = useState<string | undefined>(undefined);
  // isAwaitingConfirmation is *derived* from comparing submittedName against the current
  // habit.name prop, computed fresh on every render - see HabitItem's isPending for the same
  // technique and why: revalidatePath's data refresh is a separate, later round trip from
  // updateHabit's own request resolving, so clearing a plain "done" flag the instant the request
  // resolved showed a real flash of the *old* name back in the row before the fresh habit.name
  // prop actually arrived.
  const isAwaitingConfirmation = submittedName !== undefined && submittedName !== habit.name;
  const showsPending = isPending || isAwaitingConfirmation;

  const formState = getFormState(showsPending, error);
  const { form, input, submitButton, cancelButton } = updateHabitForm({ state: formState });

  // Clears activeAction back to "none" only once the submitted name we're waiting to be
  // confirmed actually matches the fresh habit.name prop - not the instant the request resolves.
  // This is a legitimate use of useEffect (rather than a derived value): activeAction is state
  // owned by HabitsSection, external to this component, so clearing it is a real side effect
  // reacting to a prop change, not something that can be computed during render. Lives here,
  // unlike the analogous delete fix (which lives in HabitList), because editing doesn't remove
  // the habit from the array - this component stays mounted with the same habit prop throughout,
  // so it can watch its own confirmation directly rather than needing a parent with visibility
  // into the full list.
  useEffect(() => {
    if (submittedName !== undefined && submittedName === habit.name) {
      setActiveAction({ type: "none" });
      // Deliberately not resetting submittedName here to undefined - doing so would be setting
      // local state synchronously inside an effect (an anti-pattern the linter flags), and it's
      // unnecessary anyway: isAwaitingConfirmation already resolves to false on its own once
      // submittedName matches habit.name, the same way HabitItem's pendingTarget is never reset
      // on success either. This component unmounts shortly after activeAction clears
      // (HabitSection switches back to HabitItem), so there's nothing left to clean up.
    }
  }, [habit.name, submittedName, setActiveAction]);

  function cancelEdit() {
    setActiveAction({ type: "none" });
    setError(undefined);
    setDraftedName(habit.name);
    setSubmittedName(undefined);
  }

  async function submitHabit(event: React.SubmitEvent<HTMLFormElement>): Promise<void> {
    // Manually stop the form from submitting - we're choosing not to use the useActionState
    // hook on purpose here (which would do this automatically under the hood for us)
    event.preventDefault();

    // Clear any error left over from a previous failed attempt before retrying, so a stale
    // error doesn't stay on screen while this new request is pending.
    setError(undefined);
    setIsPending(true);

    try {
      const { message } = await updateHabit(habit.id, draftedName);

      if (message) {
        setError(message);
        setIsPending(false);
        return;
      }

      // Success: stop the "genuinely in flight" spinner, but don't touch activeAction yet - hand
      // off to the derived isAwaitingConfirmation/useEffect above, which closes the form once
      // habit.name itself confirms the save (trimmed to match what the server actually persists -
      // see habitNameSchema's .trim() in actions.ts). Not resetting error here - it's already
      // undefined from the unconditional setError(undefined) at the top of this function, and
      // nothing between there and here can have set it again.
      setIsPending(false);
      setSubmittedName(draftedName.trim());
    } catch {
      // updateHabit itself always resolves with a { message } object rather than throwing - see
      // runHabitMutation in actions.ts - but this guards against the Server Action's own network
      // round trip failing outright (e.g. a dropped connection), which would otherwise leave the
      // form stuck showing "Updating..." forever with no error ever shown.
      setError("Something went wrong. Please try again.");
      setIsPending(false);
    }
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
          disabled={showsPending}
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
            aria-disabled={showsPending}
            disabled={showsPending}
            className={submitButton()}
          >
            {showsPending && <IconLoader2 size={14} className="animate-spin" />}
            <span>{showsPending ? "Updating..." : "Update"}</span>
          </button>
          <button
            type="button"
            disabled={showsPending}
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
