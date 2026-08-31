import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/app/actions", () => ({
  updateHabit: jest.fn(),
}));

import { UpdateHabitForm } from "@/components/UpdateHabitForm";
import { updateHabit } from "@/app/actions";
import { Habit } from "@/lib/types";

const mockedUpdateHabit = jest.mocked(updateHabit);

const habit: Habit = {
  id: "bc19277c-46a3-4d8d-b824-bc9c0e74abbd",
  name: "Morning run",
  created_at: "2026-08-17T11:06:09.855Z",
};

describe("UpdateHabitForm component", () => {
  const mockSetActiveAction = jest.fn();

  beforeEach(() => {
    mockedUpdateHabit.mockReset();
    mockSetActiveAction.mockReset();
  });

  test("pre-fills the input with the habit's current name", () => {
    render(<UpdateHabitForm habit={habit} setActiveAction={mockSetActiveAction} />);

    expect(screen.getByLabelText("Edit habit name")).toHaveValue("Morning run");
  });

  test("shows an error when one occurred, keeps the form open and preserves the typed value", async () => {
    mockedUpdateHabit.mockResolvedValue({ message: "Database error: Failed to update habit" });

    const user = userEvent.setup();

    render(<UpdateHabitForm habit={habit} setActiveAction={mockSetActiveAction} />);

    const inputField = screen.getByLabelText("Edit habit name");
    await user.clear(inputField);
    await user.type(inputField, "Evening run");

    await user.click(screen.getByText("Update"));

    const errorText = await screen.findByText("Database error: Failed to update habit");
    expect(errorText).toBeInTheDocument();

    expect(inputField).toHaveValue("Evening run");

    // Closing the form is the parent's job (via setActiveAction) - on failure, UpdateHabitForm
    // never calls it, so the parent has no reason to stop rendering the form as open.
    expect(mockSetActiveAction).not.toHaveBeenCalled();
  });

  test("shows a fallback error and re-enables the form if updateHabit itself rejects", async () => {
    mockedUpdateHabit.mockRejectedValueOnce(new Error("Network request failed"));

    const user = userEvent.setup();

    render(<UpdateHabitForm habit={habit} setActiveAction={mockSetActiveAction} />);

    await user.click(screen.getByText("Update"));

    expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
    expect(screen.getByText("Update")).toBeEnabled();
    expect(mockSetActiveAction).not.toHaveBeenCalled();
  });

  test("only tells the parent to clear the active action once the fresh habit.name prop confirms the save, not the instant the request resolves", async () => {
    // This is the flash-prevention behaviour (the analogous fix to the toggle's - see
    // docs/decisions.md): the request resolving alone must not be enough to close the form,
    // since the confirmed data (a fresh habit.name prop, from page.tsx's revalidatePath-triggered
    // refresh) arrives as a separate, later round trip.
    mockedUpdateHabit.mockResolvedValueOnce({});

    const user = userEvent.setup();

    const { rerender } = render(
      <UpdateHabitForm habit={habit} setActiveAction={mockSetActiveAction} />,
    );

    const inputField = screen.getByLabelText("Edit habit name");
    await user.clear(inputField);
    await user.type(inputField, "Evening run");
    await user.click(screen.getByText("Update"));

    await waitFor(() => {
      expect(mockedUpdateHabit).toHaveBeenCalledWith(habit.id, "Evening run");
    });

    // The request has resolved, but habit.name hasn't refreshed yet - the form must stay open,
    // still showing "Updating...", not close and reveal the row with the stale old name.
    expect(await screen.findByRole("button", { name: /updating/i })).toBeDisabled();
    expect(mockSetActiveAction).not.toHaveBeenCalled();

    // Re-render with the same, still-unconfirmed habit - stays pending even though the request
    // has resolved.
    rerender(<UpdateHabitForm habit={habit} setActiveAction={mockSetActiveAction} />);
    expect(screen.getByRole("button", { name: /updating/i })).toBeInTheDocument();
    expect(mockSetActiveAction).not.toHaveBeenCalled();

    // Now the fresh data lands, confirming the save - the form should close.
    rerender(
      <UpdateHabitForm
        habit={{ ...habit, name: "Evening run" }}
        setActiveAction={mockSetActiveAction}
      />,
    );

    await waitFor(() => {
      expect(mockSetActiveAction).toHaveBeenCalledWith({ type: "none" });
    });
  });

  test("closes as soon as the request resolves when resubmitting the habit's name unchanged, since there's nothing left to confirm", async () => {
    // Edge case for the fix above: confirmingName is set to the trimmed submitted name only once
    // the request succeeds, not eagerly at submit time - if it were set eagerly, resubmitting the
    // same name would make it equal the still-stale habit.name prop by coincidence and close the
    // form before the request had even finished.
    mockedUpdateHabit.mockResolvedValueOnce({});

    const user = userEvent.setup();

    render(<UpdateHabitForm habit={habit} setActiveAction={mockSetActiveAction} />);

    await user.click(screen.getByText("Update"));

    await waitFor(() => {
      expect(mockSetActiveAction).toHaveBeenCalledWith({ type: "none" });
    });

    expect(mockedUpdateHabit).toHaveBeenCalledWith(habit.id, "Morning run");
  });

  test("shows 'Updating...' and disables the submit button and input while the request is genuinely in flight", async () => {
    let resolveUpdateHabit: ((result: { message?: string }) => void) | undefined;

    const pendingResult = new Promise<{ message?: string }>((resolve) => {
      resolveUpdateHabit = resolve;
    });

    mockedUpdateHabit.mockReturnValue(pendingResult);

    const user = userEvent.setup();

    render(<UpdateHabitForm habit={habit} setActiveAction={mockSetActiveAction} />);

    // Changed, not resubmitted unchanged - so there's genuinely something to wait for below,
    // distinct from the "resubmit unchanged" test above where nothing needs confirming.
    const inputField = screen.getByLabelText("Edit habit name");
    await user.clear(inputField);
    await user.type(inputField, "Evening run");
    await user.click(screen.getByText("Update"));

    const pendingButton = await screen.findByRole("button", { name: /updating/i });
    expect(pendingButton).toBeInTheDocument();
    expect(pendingButton).toBeDisabled();
    expect(screen.queryByText("Update")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Edit habit name")).toBeDisabled();

    if (!resolveUpdateHabit) throw new Error("resolver not ready");

    // Let the pending request resolve so the test doesn't leak a dangling act() warning - stays
    // showing "Updating..." afterwards, since habit.name (still "Morning run") hasn't confirmed
    // the submitted name yet.
    resolveUpdateHabit({});

    await waitFor(() => {
      expect(mockedUpdateHabit).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole("button", { name: /updating/i })).toBeDisabled();
    expect(mockSetActiveAction).not.toHaveBeenCalled();
  });

  test("cancelling tells the parent to clear the active action, and resets the input back to the habit's current name", async () => {
    const user = userEvent.setup();

    render(<UpdateHabitForm habit={habit} setActiveAction={mockSetActiveAction} />);

    const inputField = screen.getByLabelText("Edit habit name");
    await user.clear(inputField);
    await user.type(inputField, "Something else entirely");

    await user.click(screen.getByText("Cancel"));

    expect(mockSetActiveAction).toHaveBeenCalledWith({ type: "none" });
    expect(inputField).toHaveValue("Morning run");
    expect(mockedUpdateHabit).not.toHaveBeenCalled();
  });
});
