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
  beforeEach(() => {
    mockedCreateHabit.mockReset();
  });

  test("shows the Add habit button when not editing", () => {
    mockedCreateHabit.mockResolvedValue({});
    render(<AddHabitForm />);

    expect(screen.getByText("Add habit")).toBeInTheDocument();
  });

  test("shows an error when one occurred, keeps form open and preserves typed value", async () => {
    // Return the plain error object (not a Promise) so the mock resolves to the
    // expected payload. Passing a Promise into `mockResolvedValue` produces a
    // Promise-of-Promise and you'll end up getting a Promise where you expect
    // the error object.
    mockedCreateHabit.mockResolvedValue({ message: "Database error: Failed to save habit" });

    const user = userEvent.setup();

    render(<AddHabitForm />);

    // Open the edit form, enter a habit name and submit to trigger the server action.
    const addButton = screen.getByText("Add habit");
    await user.click(addButton);

    const inputField = screen.getByLabelText("Habit name");
    await user.type(inputField, "Meditate");

    const submitButton = screen.getByText("Submit");
    await user.click(submitButton);

    // form stays open
    await waitFor(() => {
      expect(submitButton).toBeInTheDocument();
      expect(inputField).toBeInTheDocument();
      // typed value is preserved
      expect(inputField).toHaveValue("Meditate");

      // Add button is not visible as still in editing mode when there is an error.
      // It may already be removed immediately after opening the form, so use
      // `waitFor` with a role-based query which works whether the node was
      // removed synchronously or asynchronously.
      expect(screen.queryByRole("button", { name: /add habit/i })).not.toBeInTheDocument();
    });

    // `findByText` returns a Promise, so need to await it before asserting.
    const errorText = await screen.findByText("Error: Database error: Failed to save habit");
    expect(errorText).toBeInTheDocument();
  });

  test("closes the form and clears the input after a successful submission", async () => {
    mockedCreateHabit.mockResolvedValue({});

    const user = userEvent.setup();

    render(<AddHabitForm />);

    await user.click(screen.getByText("Add habit"));
    await user.type(screen.getByLabelText("Habit name"), "Meditate");
    await user.click(screen.getByText("Submit"));

    // Success resets back to the initial "not editing" view - the form (and its label/input)
    // is replaced by the Add habit button again.
    await waitFor(() => {
      expect(screen.getByText("Add habit")).toBeInTheDocument();
    });

    expect(screen.queryByLabelText("Habit name")).not.toBeInTheDocument();
  });

  test("does not carry over the previous habit name when reopened after a successful submission", async () => {
    mockedCreateHabit.mockResolvedValue({});

    const user = userEvent.setup();

    render(<AddHabitForm />);

    await user.click(screen.getByText("Add habit"));
    await user.type(screen.getByLabelText("Habit name"), "Meditate");
    await user.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(screen.getByText("Add habit")).toBeInTheDocument();
    });

    // Reopen the form and confirm the input used to type the previous habit name clears
    // that value
    await user.click(screen.getByText("Add habit"));
    expect(screen.getByLabelText("Habit name")).toHaveValue("");
  });

  test("shows 'Adding...' and disables the submit button while the request is pending", async () => {
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

    render(<AddHabitForm />);

    await user.click(screen.getByText("Add habit"));
    await user.type(screen.getByLabelText("Habit name"), "Meditate");
    await user.click(screen.getByText("Submit"));

    const pendingButton = await screen.findByText("Adding...");
    expect(pendingButton).toBeInTheDocument();
    expect(pendingButton).toBeDisabled();
    expect(screen.queryByText("Submit")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Habit name")).toBeInTheDocument();
    expect(screen.getByLabelText("Habit name")).toBeDisabled();
    expect(screen.queryByText("Add habit")).not.toBeInTheDocument();

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
      expect(screen.getByText("Add habit")).toBeInTheDocument();
      expect(screen.queryByText("Submit")).not.toBeInTheDocument();
      expect(screen.queryByText("Adding...")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Habit name")).not.toBeInTheDocument();
    });
  });

  test("clears a previous error as soon as a retry submission starts, rather than leaving it on screen while pending", async () => {
    // First attempt fails and shows an error.
    mockedCreateHabit.mockResolvedValueOnce({ message: "Database error: Failed to save habit" });

    const user = userEvent.setup();

    render(<AddHabitForm />);

    await user.click(screen.getByText("Add habit"));
    await user.type(screen.getByLabelText("Habit name"), "Meditate");
    await user.click(screen.getByText("Submit"));

    await screen.findByText("Error: Database error: Failed to save habit");

    // Retry: use a manually-resolvable promise (same pattern as the pending-state test above) so
    // the mid-retry state - after resubmitting, before the new result comes back - can be
    // inspected.
    let resolveRetry: ((result: { message?: string }) => void) | undefined;
    const retryResult = new Promise<{ message?: string }>((resolve) => {
      resolveRetry = resolve;
    });
    mockedCreateHabit.mockReturnValueOnce(retryResult);

    await user.click(screen.getByText("Submit"));

    // The old error should be gone the moment the retry starts, not just once it resolves.
    await waitFor(() => {
      expect(
        screen.queryByText("Error: Database error: Failed to save habit"),
      ).not.toBeInTheDocument();
    });

    if (!resolveRetry) throw new Error("resolver not ready");
    resolveRetry({});
  });
});
