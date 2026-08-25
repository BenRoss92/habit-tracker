import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HabitItem } from "@/components/HabitItem";
import { Habit } from "@/lib/types";

const habit: Habit = {
  id: "bc19277c-46a3-4d8d-b824-bc9c0e74abbd",
  name: "Morning run",
  created_at: "2026-08-17T11:06:09.855Z",
};

describe("HabitItem component", () => {
  it("then shows the habit name", () => {
    render(<HabitItem habit={habit} setIsUpdating={jest.fn()} />);

    expect(screen.getByText("Morning run")).toBeInTheDocument();
  });

  describe("when the edit icon is clicked", () => {
    it("then calls setIsUpdating with true", async () => {
      const user = userEvent.setup();
      const setIsUpdating = jest.fn();

      render(<HabitItem habit={habit} setIsUpdating={setIsUpdating} />);

      const editIcon = screen.getByRole("button", { name: "Edit habit" });
      await user.click(editIcon);

      expect(setIsUpdating).toHaveBeenCalledWith(true);
    });
  });
});
