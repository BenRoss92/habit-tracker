import { render, screen, waitFor } from "@testing-library/react";
// Use userEvent over fireEvent - recommended for more closely emulating user interactions
import userEvent from "@testing-library/user-event";

// Avoid importing server-only modules pulled in by the real action implementation.
// Mock the server action before importing the component so the module graph
// doesn't load Next.js server code (which expects globals like Request).
jest.mock("@/app/actions", () => ({
  createHabit: jest.fn(),
}));

import { AddHabitForm } from "@/components/AddHabitForm";
import { createHabit } from "@/app/actions";

const mockedCreateHabit = jest.mocked(createHabit);

describe("AddHabitForm component", () => {
  const mockSetActiveAction = jest.fn();

  beforeEach(() => {
    mockedCreateHabit.mockReset();
    mockSetActiveAction.mockReset();
  });

  test("renders nothing when nothing is active", () => {
    const { container } = render(
      <AddHabitForm activeAction={{ type: "none" }} setActiveAction={mockSetActiveAction} />,
    );

    // AddHabitForm no longer owns its own "Add habit" trigger button - that's
    // AddHabitButton's job now, controlled externally via the activeAction prop.
    expect(container).toBeEmptyDOMElement();
  });

  test("renders nothing when a different action is active (editing a habit)", () => {
    // Proves the render gate checks specifically for `type === "adding"`, not just
    // "anything other than none" - a habit being edited elsewhere must not also open this form.
    const { container } = render(
      <AddHabitForm
        activeAction={{ type: "editing", habitId: "1" }}
        setActiveAction={mockSetActiveAction}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  test("shows an error when one occurred, keeps the form open and preserves the typed value", async () => {
    // Return the plain error object (not a Promise) so the mock resolves to the
    // expected payload. Passing a Promise into `mockResolvedValue` produces a
    // Promise-of-Promise and you'll end up getting a Promise where you expect
    // the error object.
    mockedCreateHabit.mockResolvedValue({ message: "Database error: Failed to save habit" });

    const user = userEvent.setup();

    render(
      <AddHabitForm activeAction={{ type: "adding" }} setActiveAction={mockSetActiveAction} />,
    );

    const inputField = screen.getByLabelText("Habit name");
    await user.type(inputField, "Meditate");

    const submitButton = screen.getByText("Add");
    await user.click(submitButton);

    // `findByText` returns a Promise, so need to await it before asserting.
    const errorText = await screen.findByText("Database error: Failed to save habit");
    expect(errorText).toBeInTheDocument();

    // typed value is preserved
    expect(inputField).toHaveValue("Meditate");

    // Closing the form is the parent's job (via setActiveAction) - on failure, AddHabitForm
    // never calls it, so the parent has no reason to stop rendering the form as open.
    expect(mockSetActiveAction).not.toHaveBeenCalled();
  });

  test("tells the parent to close the form after a successful submission, and clears the input", async () => {
    mockedCreateHabit.mockResolvedValue({});

    const user = userEvent.setup();

    render(
      <AddHabitForm activeAction={{ type: "adding" }} setActiveAction={mockSetActiveAction} />,
    );

    await user.type(screen.getByLabelText("Habit name"), "Meditate");
    await user.click(screen.getByText("Add"));

    // AddHabitForm doesn't own whether it's shown - it just tells the parent
    // (via setActiveAction) that submission succeeded, and the parent decides to stop
    // rendering it as open. Assert both the mock call and the settled input value
    // together, so waitFor keeps polling until every state update from the success
    // path (not just the first one) has actually committed - checking only the mock
    // call lets waitFor resolve before React finishes flushing the rest, which is what
    // was producing "not wrapped in act(...)" warnings.
    await waitFor(() => {
      expect(mockSetActiveAction).toHaveBeenCalledWith({ type: "none" });
      expect(screen.getByLabelText("Habit name")).toHaveValue("");
    });
  });

  test("does not carry over the previous habit name when reopened after a successful submission", async () => {
    mockedCreateHabit.mockResolvedValue({});

    const user = userEvent.setup();

    const { rerender } = render(
      <AddHabitForm activeAction={{ type: "adding" }} setActiveAction={mockSetActiveAction} />,
    );

    await user.type(screen.getByLabelText("Habit name"), "Meditate");
    await user.click(screen.getByText("Add"));

    await waitFor(() => {
      expect(mockSetActiveAction).toHaveBeenCalledWith({ type: "none" });
      expect(screen.getByLabelText("Habit name")).toHaveValue("");
    });

    // Simulate the parent reacting to setActiveAction({ type: "none" }), then the user
    // reopening the form via AddHabitButton elsewhere - activeAction goes to none, then
    // back to adding.
    rerender(
      <AddHabitForm activeAction={{ type: "none" }} setActiveAction={mockSetActiveAction} />,
    );
    rerender(
      <AddHabitForm activeAction={{ type: "adding" }} setActiveAction={mockSetActiveAction} />,
    );

    expect(screen.getByLabelText("Habit name")).toHaveValue("");
  });

  test("shows 'Adding...' and disables the submit button and input while the request is pending", async () => {
    // Use a manually-resolvable promise instead of mockResolvedValue so the pending state can be
    // asserted before the request "completes".
    // Create a function that we will replace the 'resolve' function inside of the Promise with, so
    // that we can manually call that function to resolve the promise, to control when it is pending
    // and when it has resolved.
    // This function could be undefined if we make a mistake writing this test, so make sure to
    // handle a case where we've accidentally not defined this function in time before using it
    // later.
    let resolveCreateHabit: ((result: { message?: string }) => void) | undefined;

    // Use this custom function instead of the Promise's 'resolve' function, to manually control
    // when the promise resolves.
    // Don't do resolve(...) as this would invoke the resolve function immediately and immediately
    // resolve the promise. We want the promise to resolve later.
    const pendingResult = new Promise<{ message?: string }>((resolve) => {
      resolveCreateHabit = resolve;
    });

    // use mockReturnValue instead of mockResolvedValue - we want to return a sychronous value, not
    // a (resolved) promise.
    mockedCreateHabit.mockReturnValue(pendingResult);

    const user = userEvent.setup();

    render(
      <AddHabitForm activeAction={{ type: "adding" }} setActiveAction={mockSetActiveAction} />,
    );

    await user.type(screen.getByLabelText("Habit name"), "Meditate");
    await user.click(screen.getByText("Add"));

    // Query by role rather than the "Adding..." text directly - that text sits inside a
    // <span> (next to the spinner icon), and a <span> can never be "disabled" in the DOM
    // sense. Querying by role resolves to the actual <button>, whose accessible name
    // already includes the span's text.
    const pendingButton = await screen.findByRole("button", { name: /adding/i });
    expect(pendingButton).toBeInTheDocument();
    expect(pendingButton).toBeDisabled();
    expect(screen.queryByText("Add")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Habit name")).toBeInTheDocument();
    expect(screen.getByLabelText("Habit name")).toBeDisabled();

    // Fail the test if we've accidentally not assigned the custom resolve
    // function to anything before trying to use it - e.g. if we've moved lines around in the test
    // and reordered when we assign and try to use this function.
    if (!resolveCreateHabit) throw new Error("resolver not ready");

    // Let the pending request resolve so the test doesn't leak a dangling act() warning.
    // Just call this function to resolve the promise.
    // Don't try to await the outer 'pendingResult' promise, as even though 'await pendingResult'
    // would wait for the promise to resolve, it wouldn't guarantee that React had flushed the
    // state/DOM updates. The test needs to call the custom resolve function to resolve the promise
    // and then wait (with the await waitFor block) by polling until the DOM reflects the right
    // state in the block. waitFor both waits for the UI to update and avoids act() warnings by
    // lettings React Testing Library/React process any updates before making any assertions.
    // Resolving a mocked promise and then using waitFor to observe DOM changes is the correct
    // pattern to ensure the component has finished updating.
    resolveCreateHabit({});

    // Adding 'await pendingResult' here throws the error: An update to AddHabitForm inside a test
    // was not wrapped in act(...). So don't explicitly await the promise to resolve - it's not
    // needed.
    await waitFor(() => {
      expect(mockSetActiveAction).toHaveBeenCalledWith({ type: "none" });
      expect(screen.getByLabelText("Habit name")).toHaveValue("");
    });
  });

  test("clears a previous error as soon as a retry submission starts, rather than leaving it on screen while pending", async () => {
    // First attempt fails and shows an error.
    mockedCreateHabit.mockResolvedValueOnce({ message: "Database error: Failed to save habit" });

    const user = userEvent.setup();

    render(
      <AddHabitForm activeAction={{ type: "adding" }} setActiveAction={mockSetActiveAction} />,
    );

    await user.type(screen.getByLabelText("Habit name"), "Meditate");
    await user.click(screen.getByText("Add"));

    await screen.findByText("Database error: Failed to save habit");

    // Retry: use a manually-resolvable promise (same pattern as the pending-state test above) so
    // the mid-retry state - after resubmitting, before the new result comes back - can be
    // inspected.
    let resolveRetry: ((result: { message?: string }) => void) | undefined;
    const retryResult = new Promise<{ message?: string }>((resolve) => {
      resolveRetry = resolve;
    });
    mockedCreateHabit.mockReturnValueOnce(retryResult);

    await user.click(screen.getByText("Add"));

    // The old error should be gone the moment the retry starts, not just once it resolves.
    await waitFor(() => {
      expect(screen.queryByText("Database error: Failed to save habit")).not.toBeInTheDocument();
    });

    if (!resolveRetry) throw new Error("resolver not ready");
    resolveRetry({});

    // Let the retry resolve so the test doesn't leak a dangling act() warning - the retry
    // succeeds, so wait for the same settled state the other success-path tests check.
    await waitFor(() => {
      expect(mockSetActiveAction).toHaveBeenCalledWith({ type: "none" });
      expect(screen.getByLabelText("Habit name")).toHaveValue("");
    });
  });

  test("cancelling tells the parent to close the form, and clears the input and any error", async () => {
    mockedCreateHabit.mockResolvedValue({ message: "Database error: Failed to save habit" });

    const user = userEvent.setup();

    const { rerender } = render(
      <AddHabitForm activeAction={{ type: "adding" }} setActiveAction={mockSetActiveAction} />,
    );

    // Get the form into a non-trivial state first - typed text and a visible error -
    // so cancelling has something real to clear, not just an already-empty form.
    await user.type(screen.getByLabelText("Habit name"), "Meditate");
    await user.click(screen.getByText("Add"));
    await screen.findByText("Database error: Failed to save habit");

    await user.click(screen.getByText("Cancel"));

    expect(mockSetActiveAction).toHaveBeenCalledWith({ type: "none" });

    // Simulate the parent reacting to setActiveAction({ type: "none" }), then the user
    // reopening the form via AddHabitButton elsewhere - confirms neither the typed name nor
    // the error lingered in AddHabitForm's own state after cancelling.
    rerender(
      <AddHabitForm activeAction={{ type: "none" }} setActiveAction={mockSetActiveAction} />,
    );
    rerender(
      <AddHabitForm activeAction={{ type: "adding" }} setActiveAction={mockSetActiveAction} />,
    );

    expect(screen.getByLabelText("Habit name")).toHaveValue("");
    expect(screen.queryByText("Database error: Failed to save habit")).not.toBeInTheDocument();
  });

  test("Cancel is disabled and has no effect while a submission is pending", async () => {
    // Same manually-resolvable-promise pattern as the other pending-state tests above, so the
    // mid-flight state can actually be inspected rather than raced against.
    let resolveCreateHabit: ((result: { message?: string }) => void) | undefined;
    const pendingResult = new Promise<{ message?: string }>((resolve) => {
      resolveCreateHabit = resolve;
    });
    mockedCreateHabit.mockReturnValue(pendingResult);

    const user = userEvent.setup();

    render(
      <AddHabitForm activeAction={{ type: "adding" }} setActiveAction={mockSetActiveAction} />,
    );

    await user.type(screen.getByLabelText("Habit name"), "Meditate");
    await user.click(screen.getByText("Add"));

    const cancelButton = await screen.findByRole("button", { name: /cancel/i });
    expect(cancelButton).toBeDisabled();

    // userEvent (unlike fireEvent) respects the disabled attribute and won't fire the click
    // handler - asserting on the actual consequence, not just the attribute, is what would
    // have caught the real bug this guards against: Cancel closing the form (and the
    // in-flight request still completing and adding the habit) even though the button
    // looked disabled.
    await user.click(cancelButton);
    expect(mockSetActiveAction).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Habit name")).toHaveValue("Meditate");

    if (!resolveCreateHabit) throw new Error("resolver not ready");
    resolveCreateHabit({});
    await waitFor(() => {
      expect(mockSetActiveAction).toHaveBeenCalledWith({ type: "none" });
    });
  });
});
