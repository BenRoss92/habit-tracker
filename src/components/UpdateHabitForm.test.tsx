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
  const mockSetIsUpdating = jest.fn();

  beforeEach(() => {
    mockedUpdateHabit.mockReset();
    mockSetIsUpdating.mockReset();
  });

  test("pre-fills the input with the habit's current name", () => {
    render(<UpdateHabitForm habit={habit} setIsUpdating={mockSetIsUpdating} />);

    expect(screen.getByLabelText("Edit habit name")).toHaveValue("Morning run");
  });

  test("shows an error when one occurred, keeps the form open and preserves the typed value", async () => {
    mockedUpdateHabit.mockResolvedValue({ message: "Database error: Failed to update habit" });

    const user = userEvent.setup();

    render(<UpdateHabitForm habit={habit} setIsUpdating={mockSetIsUpdating} />);

    const inputField = screen.getByLabelText("Edit habit name");
    await user.clear(inputField);
    await user.type(inputField, "Evening run");

    await user.click(screen.getByText("Update"));

    const errorText = await screen.findByText("Database error: Failed to update habit");
    expect(errorText).toBeInTheDocument();

    expect(inputField).toHaveValue("Evening run");

    // Closing the form is the parent's job (via setIsUpdating) - on failure, UpdateHabitForm
    // never calls it, so the parent has no reason to stop rendering the form as open.
    expect(mockSetIsUpdating).not.toHaveBeenCalled();
  });

  test("tells the parent to close the form after a successful submission", async () => {
    mockedUpdateHabit.mockResolvedValue({});

    const user = userEvent.setup();

    render(<UpdateHabitForm habit={habit} setIsUpdating={mockSetIsUpdating} />);

    const inputField = screen.getByLabelText("Edit habit name");
    await user.clear(inputField);
    await user.type(inputField, "Evening run");
    await user.click(screen.getByText("Update"));

    await waitFor(() => {
      expect(mockSetIsUpdating).toHaveBeenCalledWith(false);
    });

    expect(mockedUpdateHabit).toHaveBeenCalledWith(habit.id, "Evening run");
  });

  test("shows 'Updating...' and disables the submit button and input while the request is pending", async () => {
    let resolveUpdateHabit: ((result: { message?: string }) => void) | undefined;

    const pendingResult = new Promise<{ message?: string }>((resolve) => {
      resolveUpdateHabit = resolve;
    });

    mockedUpdateHabit.mockReturnValue(pendingResult);

    const user = userEvent.setup();

    render(<UpdateHabitForm habit={habit} setIsUpdating={mockSetIsUpdating} />);

    await user.click(screen.getByText("Update"));

    const pendingButton = await screen.findByRole("button", { name: /updating/i });
    expect(pendingButton).toBeInTheDocument();
    expect(pendingButton).toBeDisabled();
    expect(screen.queryByText("Update")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Edit habit name")).toBeDisabled();

    if (!resolveUpdateHabit) throw new Error("resolver not ready");

    // Let the pending request resolve so the test doesn't leak a dangling act() warning.
    resolveUpdateHabit({});

    await waitFor(() => {
      expect(mockSetIsUpdating).toHaveBeenCalledWith(false);
    });
  });

  test("cancelling tells the parent to close the form, and resets the input back to the habit's current name", async () => {
    const user = userEvent.setup();

    render(<UpdateHabitForm habit={habit} setIsUpdating={mockSetIsUpdating} />);

    const inputField = screen.getByLabelText("Edit habit name");
    await user.clear(inputField);
    await user.type(inputField, "Something else entirely");

    await user.click(screen.getByText("Cancel"));

    expect(mockSetIsUpdating).toHaveBeenCalledWith(false);
    expect(inputField).toHaveValue("Morning run");
    expect(mockedUpdateHabit).not.toHaveBeenCalled();
  });
});
