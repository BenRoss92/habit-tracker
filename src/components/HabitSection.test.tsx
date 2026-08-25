import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the server action before importing the component so the module graph doesn't load
// Next.js server code (which expects globals like Request). This is the only mock in this
// file - HabitItem and UpdateHabitForm are both real, so the actual wiring between them (not
// just each component in isolation) gets exercised.
jest.mock("@/app/actions", () => ({
  updateHabit: jest.fn(),
}));

import { HabitSection } from "@/components/HabitSection";
import { updateHabit } from "@/app/actions";
import { Habit } from "@/lib/types";

const mockedUpdateHabit = jest.mocked(updateHabit);

const habit: Habit = {
  id: "bc19277c-46a3-4d8d-b824-bc9c0e74abbd",
  name: "Morning run",
  created_at: "2026-08-17T11:06:09.855Z",
};

describe("HabitSection component", () => {
  beforeEach(() => {
    mockedUpdateHabit.mockReset();
  });

  describe("given the section has just loaded", () => {
    it("then shows the habit name and no open form", () => {
      render(<HabitSection habit={habit} />);

      expect(screen.getByText("Morning run")).toBeInTheDocument();
      expect(screen.queryByLabelText("Edit habit name")).not.toBeInTheDocument();
    });
  });

  describe("when the user clicks the edit icon", () => {
    it("then opens the update form, pre-filled with the current name, and hides the habit row", async () => {
      const user = userEvent.setup();

      render(<HabitSection habit={habit} />);

      const editIcon = screen.getByRole("button", { name: "Edit habit" });
      await user.click(editIcon);

      expect(screen.getByLabelText("Edit habit name")).toHaveValue("Morning run");
      expect(screen.queryByText("Morning run", { selector: "span" })).not.toBeInTheDocument();
    });
  });

  describe("given the update form is open", () => {
    async function openForm(user: ReturnType<typeof userEvent.setup>) {
      const editIcon = screen.getByRole("button", { name: "Edit habit" });
      await user.click(editIcon);
    }

    describe("when the user clicks Cancel", () => {
      it("then closes the form and shows the habit row again", async () => {
        // This is the cross-component proof UpdateHabitForm's own tests can't give: there,
        // setIsUpdating is a jest.fn() that does nothing, so nothing confirms that calling it
        // for real actually closes the form and shows the habit row again. Here it's the real
        // setIsUpdating from HabitSection's own useState.
        const user = userEvent.setup();

        render(<HabitSection habit={habit} />);
        await openForm(user);

        await user.click(screen.getByText("Cancel"));

        expect(screen.queryByLabelText("Edit habit name")).not.toBeInTheDocument();
        expect(screen.getByText("Morning run")).toBeInTheDocument();
      });
    });

    describe("when a habit update is submitted successfully", () => {
      it("then closes the form and shows the habit row again", async () => {
        mockedUpdateHabit.mockResolvedValue({});

        const user = userEvent.setup();

        render(<HabitSection habit={habit} />);
        await openForm(user);

        await user.clear(screen.getByLabelText("Edit habit name"));
        await user.type(screen.getByLabelText("Edit habit name"), "Evening run");
        await user.click(screen.getByText("Update"));

        await waitFor(() => {
          expect(screen.queryByLabelText("Edit habit name")).not.toBeInTheDocument();
        });
      });
    });
  });
});
