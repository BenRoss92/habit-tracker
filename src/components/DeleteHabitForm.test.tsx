import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/app/actions", () => ({
  deleteHabit: jest.fn(),
}));

import { DeleteHabitForm } from "@/components/DeleteHabitForm";
import { deleteHabit } from "@/app/actions";
import { Habit } from "@/lib/types";

const mockedDeleteHabit = jest.mocked(deleteHabit);

const habit: Habit = {
  id: "bc19277c-46a3-4d8d-b824-bc9c0e74abbd",
  name: "Morning run",
  created_at: "2026-08-17T11:06:09.855Z",
};

describe("DeleteHabitForm component", () => {
  const mockSetActiveAction = jest.fn();

  beforeEach(() => {
    mockedDeleteHabit.mockReset();
    mockSetActiveAction.mockReset();
  });

  test("shows the habit name and a warning that deletion is permanent", () => {
    render(<DeleteHabitForm habit={habit} setActiveAction={mockSetActiveAction} />);

    expect(screen.getByText("Delete this habit?")).toBeInTheDocument();
    expect(screen.getByText("Morning run")).toBeInTheDocument();
    expect(
      screen.getByText(/permanently delete the habit and all of its history/i),
    ).toBeInTheDocument();
  });

  test("shows an error when one occurred and keeps the form open", async () => {
    mockedDeleteHabit.mockResolvedValue({ message: "Database error: Failed to delete habit" });

    const user = userEvent.setup();

    render(<DeleteHabitForm habit={habit} setActiveAction={mockSetActiveAction} />);

    await user.click(screen.getByText("Delete"));

    const errorText = await screen.findByText("Database error: Failed to delete habit");
    expect(errorText).toBeInTheDocument();

    // Closing the form is the parent's job (via setActiveAction) - on failure, DeleteHabitForm
    // never calls it, so the parent has no reason to stop rendering the form as open.
    expect(mockSetActiveAction).not.toHaveBeenCalled();
  });

  test("shows a fallback error and re-enables the form if deleteHabit itself rejects", async () => {
    mockedDeleteHabit.mockRejectedValueOnce(new Error("Network request failed"));

    const user = userEvent.setup();

    render(<DeleteHabitForm habit={habit} setActiveAction={mockSetActiveAction} />);

    await user.click(screen.getByText("Delete"));

    expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeEnabled();
    expect(mockSetActiveAction).not.toHaveBeenCalled();
  });

  test("tells the parent to clear the active action after a successful deletion", async () => {
    mockedDeleteHabit.mockResolvedValue({});

    const user = userEvent.setup();

    render(<DeleteHabitForm habit={habit} setActiveAction={mockSetActiveAction} />);

    await user.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(mockSetActiveAction).toHaveBeenCalledWith({ type: "none" });
    });

    expect(mockedDeleteHabit).toHaveBeenCalledWith(habit.id);
  });

  test("shows 'Deleting...' and disables both buttons while the request is pending", async () => {
    let resolveDeleteHabit: ((result: { message?: string }) => void) | undefined;

    const pendingResult = new Promise<{ message?: string }>((resolve) => {
      resolveDeleteHabit = resolve;
    });

    mockedDeleteHabit.mockReturnValue(pendingResult);

    const user = userEvent.setup();

    render(<DeleteHabitForm habit={habit} setActiveAction={mockSetActiveAction} />);

    await user.click(screen.getByText("Delete"));

    const pendingButton = await screen.findByRole("button", { name: /deleting/i });
    expect(pendingButton).toBeInTheDocument();
    expect(pendingButton).toBeDisabled();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();

    if (!resolveDeleteHabit) throw new Error("resolver not ready");

    // Let the pending request resolve so the test doesn't leak a dangling act() warning.
    resolveDeleteHabit({});

    await waitFor(() => {
      expect(mockSetActiveAction).toHaveBeenCalledWith({ type: "none" });
    });
  });

  test("cancelling tells the parent to clear the active action", async () => {
    const user = userEvent.setup();

    render(<DeleteHabitForm habit={habit} setActiveAction={mockSetActiveAction} />);

    await user.click(screen.getByText("Cancel"));

    expect(mockSetActiveAction).toHaveBeenCalledWith({ type: "none" });
    expect(mockedDeleteHabit).not.toHaveBeenCalled();
  });

  test("Cancel is disabled and has no effect while a deletion is pending", async () => {
    // userEvent (unlike fireEvent) respects the disabled attribute and won't fire the click
    // handler - this is what actually proves Cancel has no effect while pending, not just that
    // it looks disabled.
    let resolveDeleteHabit: ((result: { message?: string }) => void) | undefined;
    const pendingResult = new Promise<{ message?: string }>((resolve) => {
      resolveDeleteHabit = resolve;
    });
    mockedDeleteHabit.mockReturnValue(pendingResult);

    const user = userEvent.setup();

    render(<DeleteHabitForm habit={habit} setActiveAction={mockSetActiveAction} />);

    await user.click(screen.getByText("Delete"));

    const cancelButton = await screen.findByRole("button", { name: /cancel/i });
    expect(cancelButton).toBeDisabled();

    await user.click(cancelButton);
    expect(mockSetActiveAction).not.toHaveBeenCalled();

    if (!resolveDeleteHabit) throw new Error("resolver not ready");
    resolveDeleteHabit({});
    await waitFor(() => {
      expect(mockSetActiveAction).toHaveBeenCalledWith({ type: "none" });
    });
  });
});
