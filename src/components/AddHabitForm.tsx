"use client";

import { createHabit } from "@/app/actions";
import { useState } from "react";

export function AddHabitForm() {
  const [isEditing, setIsEditing] = useState(false);
  const [habitName, setHabitName] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, setIsPending] = useState(false);

  function toggleEditing(): void {
    setIsEditing((prevState) => !prevState);
  }

  function updateHabitName(e: React.ChangeEvent<HTMLInputElement, HTMLInputElement>): void {
    setHabitName(e.target.value);
  }

  async function submitHabitName(event: React.SubmitEvent<HTMLFormElement>) {
    // Manually stop the form from submitting - we're choosing not to use the useActionState
    // hook on purpose here (which would do this automatically under the hood for us)
    event.preventDefault();

    // Clear any error left over from a previous failed attempt before retrying, so a stale
    // error doesn't stay on screen while this new request is pending.
    setError(undefined);
    setIsPending(true);
    const { message } = await createHabit(habitName);

    if (message) {
      setError(message);
      setIsPending(false);
      // Don't do anything else if there's an error - just return
      return;
    }

    // If there's no error, exit edit mode
    setIsEditing(false);
    setHabitName("");
    setError(undefined);
    setIsPending(false);
  }

  if (!isEditing) {
    return <button onClick={toggleEditing}>Add habit</button>;
  }

  // Add a form, so that when a user hits enter when typing into the submit button, the
  // form will automatically submit, vs using an onClick handler on a button element which
  // wouldn't do this. Use onSubmit instead of the action attribute - we don't need to
  // send multiple data in a FormData object to the server action - we just need to send a
  // string to the server action. So not using the action attribute and not using
  // useActionState simplifies the solution as we don't need to send a FormData object to
  // the server action - we just send a string instead.
  return (
    <form onSubmit={submitHabitName}>
      {/* Adding a label also does the same job as 'aria-label' 
      as it serves both screen readers 
      and non-screen reader users - good for accessibility */}
      <label htmlFor="add-habit-name">Habit name</label>
      <input
        value={habitName}
        onChange={updateHabitName}
        id="add-habit-name"
        disabled={isPending}
        // Ties the input to its error message for screen readers.
        // When an error isn't in the DOM, don't add the arai-describedby attribute, otherwise it
        // will confused screen readers (recommended approach) as the input will reference an error
        // element that doesn't exist in the DOM .
        aria-describedby={error ? "add-habit-name-error" : undefined}
      />
      <button type="submit" aria-disabled={isPending} disabled={isPending}>
        {isPending ? "Adding..." : "Submit"}
      </button>
      {error && (
        <p id="add-habit-name-error" className="text-red-700">
          Error: {error}
        </p>
      )}
    </form>
  );
}
