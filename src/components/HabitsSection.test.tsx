import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Avoid importing server-only modules pulled in by the real action implementation.
// Mock the server action before importing the component so the module graph doesn't
// load Next.js server code (which expects globals like Request). This is the only
// mock in this file - AddHabitButton, AddHabitForm, and HabitList are all real, so
// the actual wiring between them (not just each component in isolation) gets exercised.
jest.mock("@/app/actions", () => ({
  createHabit: jest.fn(),
}));

import { HabitsSection } from "@/components/HabitsSection";
import { createHabit } from "@/app/actions";
import { Habit } from "@/lib/types";

const mockedCreateHabit = jest.mocked(createHabit);

const habits: Habit[] = [{ id: "1", name: "Meditate", created_at: "2026-08-17T11:06:09.855Z" }];

describe("HabitsSection component", () => {
  beforeEach(() => {
    mockedCreateHabit.mockReset();
  });

  describe("given the section has just loaded", () => {
    it("then shows an enabled 'Add habit' button, no open form, and the given habits", () => {
      render(<HabitsSection habits={habits} />);

      expect(screen.getByRole("button", { name: /add habit/i })).toBeEnabled();
      expect(screen.queryByLabelText("Habit name")).not.toBeInTheDocument();
      expect(screen.getByText("Meditate")).toBeInTheDocument();
    });
  });

  describe("when the user clicks 'Add habit'", () => {
    it("then opens the form and disables the button", async () => {
      const user = userEvent.setup();

      render(<HabitsSection habits={habits} />);

      await user.click(screen.getByRole("button", { name: /add habit/i }));

      expect(screen.getByLabelText("Habit name")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /add habit/i })).toBeDisabled();
    });
  });

  describe("given the form is open", () => {
    describe("when the user clicks Cancel", () => {
      it("then closes the form and re-enables the 'Add habit' button", async () => {
        // This is the cross-component proof AddHabitForm's own tests can't give: there,
        // setIsEditing is a jest.fn() that does nothing, so nothing confirms that calling
        // it for real actually closes the form and re-enables the header button. Here it's
        // the real setIsEditing from HabitsSection's own useState, shared with the real
        // AddHabitButton.
        const user = userEvent.setup();

        render(<HabitsSection habits={habits} />);

        await user.click(screen.getByRole("button", { name: /add habit/i }));
        await user.click(screen.getByText("Cancel"));

        expect(screen.queryByLabelText("Habit name")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /add habit/i })).toBeEnabled();
      });
    });

    describe("when a habit is submitted successfully", () => {
      it("then closes the form and re-enables the 'Add habit' button", async () => {
        // Same wiring proof as the Cancel case above, via the other path that also calls
        // setIsEditing(false) - AddHabitForm's own success path.
        mockedCreateHabit.mockResolvedValue({});

        const user = userEvent.setup();

        render(<HabitsSection habits={habits} />);

        await user.click(screen.getByRole("button", { name: /add habit/i }));
        await user.type(screen.getByLabelText("Habit name"), "Read");
        await user.click(screen.getByText("Add"));

        await waitFor(() => {
          expect(screen.queryByLabelText("Habit name")).not.toBeInTheDocument();
        });
        expect(screen.getByRole("button", { name: /add habit/i })).toBeEnabled();
      });
    });
  });
});
