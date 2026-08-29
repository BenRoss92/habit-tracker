import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the server action before importing the component so the module graph doesn't load
// Next.js server code (which expects globals like Request). This is the only mock in this
// file - HabitItem and UpdateHabitForm are both real, so the actual wiring between them (not
// just each component in isolation) gets exercised.
jest.mock("@/app/actions", () => ({
  updateHabit: jest.fn(),
  deleteHabit: jest.fn(),
  toggleCompletion: jest.fn(),
}));

jest.mock("@/lib/dates", () => ({
  getTodaysDate: jest.fn(() => "2026-08-27"),
}));

import { HabitSection } from "@/components/HabitSection";
import { updateHabit, deleteHabit } from "@/app/actions";
import { Habit } from "@/lib/types";

const mockedUpdateHabit = jest.mocked(updateHabit);
const mockedDeleteHabit = jest.mocked(deleteHabit);

const habit: Habit = {
  id: "bc19277c-46a3-4d8d-b824-bc9c0e74abbd",
  name: "Morning run",
  created_at: "2026-08-17T11:06:09.855Z",
};

describe("HabitSection component", () => {
  beforeEach(() => {
    mockedUpdateHabit.mockReset();
    mockedDeleteHabit.mockReset();
  });

  describe("given nothing is active", () => {
    it("then shows the habit name, enabled edit/delete icons, and no open form", () => {
      render(
        <HabitSection
          habit={habit}
          activeAction={{ type: "none" }}
          setActiveAction={jest.fn()}
          wasDoneToday={false}
        />,
      );

      expect(screen.getByText("Morning run")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Edit habit" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Delete habit" })).toBeEnabled();
      expect(screen.queryByLabelText("Edit habit name")).not.toBeInTheDocument();
      expect(screen.queryByText("Delete this habit?")).not.toBeInTheDocument();
    });

    describe("and the habit was done today", () => {
      it("then shows the toggle as done", () => {
        render(
          <HabitSection
            habit={habit}
            activeAction={{ type: "none" }}
            setActiveAction={jest.fn()}
            wasDoneToday={true}
          />,
        );

        expect(screen.getByRole("button", { name: "Mark habit as not done" })).toBeInTheDocument();
      });
    });
  });

  describe("given a different habit is being edited", () => {
    it("then shows this habit's row with disabled edit/delete icons, not this habit's form", () => {
      render(
        <HabitSection
          habit={habit}
          activeAction={{ type: "editing", habitId: "some-other-id" }}
          setActiveAction={jest.fn()}
          wasDoneToday={false}
        />,
      );

      expect(screen.getByText("Morning run")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Edit habit" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Delete habit" })).toBeDisabled();
      expect(screen.queryByLabelText("Edit habit name")).not.toBeInTheDocument();
    });
  });

  describe("given a different habit is being deleted", () => {
    it("then shows this habit's row with disabled edit/delete icons, not this habit's form", () => {
      render(
        <HabitSection
          habit={habit}
          activeAction={{ type: "deleting", habitId: "some-other-id" }}
          setActiveAction={jest.fn()}
          wasDoneToday={false}
        />,
      );

      expect(screen.getByText("Morning run")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Edit habit" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Delete habit" })).toBeDisabled();
      expect(screen.queryByText("Delete this habit?")).not.toBeInTheDocument();
    });
  });

  describe("given this habit is being deleted", () => {
    it("then shows the delete confirmation, instead of the habit row", () => {
      render(
        <HabitSection
          habit={habit}
          activeAction={{ type: "deleting", habitId: habit.id }}
          setActiveAction={jest.fn()}
          wasDoneToday={false}
        />,
      );

      expect(screen.getByText("Delete this habit?")).toBeInTheDocument();
      expect(screen.queryByText("Morning run", { selector: "span" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Edit habit" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Delete habit" })).not.toBeInTheDocument();
    });
  });

  describe("given this habit is being edited", () => {
    it("then shows the update form, pre-filled with the current name, instead of the habit row", () => {
      render(
        <HabitSection
          habit={habit}
          activeAction={{ type: "editing", habitId: habit.id }}
          setActiveAction={jest.fn()}
          wasDoneToday={false}
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
            wasDoneToday={false}
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
            wasDoneToday={false}
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

  describe("given the delete confirmation is open", () => {
    describe("when the user clicks Cancel", () => {
      it("then tells the parent to clear the active action", async () => {
        const user = userEvent.setup();
        const setActiveAction = jest.fn();

        render(
          <HabitSection
            habit={habit}
            activeAction={{ type: "deleting", habitId: habit.id }}
            setActiveAction={setActiveAction}
            wasDoneToday={false}
          />,
        );

        await user.click(screen.getByText("Cancel"));

        expect(setActiveAction).toHaveBeenCalledWith({ type: "none" });
      });
    });

    describe("when the deletion is submitted successfully", () => {
      it("then tells the parent to clear the active action", async () => {
        mockedDeleteHabit.mockResolvedValue({});

        const user = userEvent.setup();
        const setActiveAction = jest.fn();

        render(
          <HabitSection
            habit={habit}
            activeAction={{ type: "deleting", habitId: habit.id }}
            setActiveAction={setActiveAction}
            wasDoneToday={false}
          />,
        );

        await user.click(screen.getByText("Delete"));

        await waitFor(() => {
          expect(setActiveAction).toHaveBeenCalledWith({ type: "none" });
        });
      });
    });
  });
});
