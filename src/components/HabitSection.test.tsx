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

  describe("given nothing is active", () => {
    it("then shows the habit name, an enabled edit icon, and no open form", () => {
      render(
        <HabitSection habit={habit} activeAction={{ type: "none" }} setActiveAction={jest.fn()} />,
      );

      expect(screen.getByText("Morning run")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Edit habit" })).toBeEnabled();
      expect(screen.queryByLabelText("Edit habit name")).not.toBeInTheDocument();
    });
  });

  describe("given a different habit is being edited", () => {
    it("then shows this habit's row with a disabled edit icon, not this habit's form", () => {
      render(
        <HabitSection
          habit={habit}
          activeAction={{ type: "editing", habitId: "some-other-id" }}
          setActiveAction={jest.fn()}
        />,
      );

      expect(screen.getByText("Morning run")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Edit habit" })).toBeDisabled();
      expect(screen.queryByLabelText("Edit habit name")).not.toBeInTheDocument();
    });
  });

  describe("given this habit is being edited", () => {
    it("then shows the update form, pre-filled with the current name, instead of the habit row", () => {
      render(
        <HabitSection
          habit={habit}
          activeAction={{ type: "editing", habitId: habit.id }}
          setActiveAction={jest.fn()}
        />,
      );

      expect(screen.getByLabelText("Edit habit name")).toHaveValue("Morning run");
      expect(screen.queryByText("Morning run", { selector: "span" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Edit habit" })).not.toBeInTheDocument();
    });
  });

  describe("given the update form is open", () => {
    describe("when the user clicks Cancel", () => {
      it("then tells the parent to clear the active action", async () => {
        const user = userEvent.setup();
        const setActiveAction = jest.fn();

        render(
          <HabitSection
            habit={habit}
            activeAction={{ type: "editing", habitId: habit.id }}
            setActiveAction={setActiveAction}
          />,
        );

        await user.click(screen.getByText("Cancel"));

        expect(setActiveAction).toHaveBeenCalledWith({ type: "none" });
      });
    });

    describe("when a habit update is submitted successfully", () => {
      it("then tells the parent to clear the active action", async () => {
        mockedUpdateHabit.mockResolvedValue({});

        const user = userEvent.setup();
        const setActiveAction = jest.fn();

        render(
          <HabitSection
            habit={habit}
            activeAction={{ type: "editing", habitId: habit.id }}
            setActiveAction={setActiveAction}
          />,
        );

        await user.clear(screen.getByLabelText("Edit habit name"));
        await user.type(screen.getByLabelText("Edit habit name"), "Evening run");
        await user.click(screen.getByText("Update"));

        await waitFor(() => {
          expect(setActiveAction).toHaveBeenCalledWith({ type: "none" });
        });
      });
    });
  });
});
