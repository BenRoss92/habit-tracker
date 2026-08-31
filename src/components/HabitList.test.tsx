import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// HabitList now renders HabitSection per habit, which renders UpdateHabitForm/DeleteHabitForm
// when editing/deleting, and HabitItem (which calls toggleCompletion) otherwise - those pull in
// the real server actions, which pull in Next.js server code (expecting globals like
// Request/TextEncoder that jsdom doesn't provide). Mock the actions before importing the
// component so that module graph never gets loaded.
jest.mock("@/app/actions", () => ({
  updateHabit: jest.fn(),
  deleteHabit: jest.fn(),
  toggleCompletion: jest.fn(),
}));

jest.mock("@/lib/dates", () => ({
  getTodaysDate: jest.fn(() => "2026-08-27"),
}));

import { HabitList } from "./HabitList";
import { deleteHabit } from "@/app/actions";
import { Completion, Habit } from "@/lib/types";

const mockedDeleteHabit = jest.mocked(deleteHabit);

describe("HabitList component", () => {
  describe("given there are no habits", () => {
    it("then shows 'No habits added'", () => {
      render(
        <HabitList
          habits={[]}
          activeAction={{ type: "none" }}
          setActiveAction={jest.fn()}
          completions={[]}
        />,
      );

      const placeholder = screen.getByText("No habits added");

      expect(placeholder).toBeInTheDocument();

      const items = screen.queryByRole("list");
      expect(items).not.toBeInTheDocument();
    });
  });

  describe("given there are habits", () => {
    it("then shows one list item per habit", () => {
      const habits: Habit[] = [
        { id: "1", name: "Meditate", created_at: "2026-08-17T11:06:09.855Z" },
        { id: "2", name: "Read", created_at: "2026-08-17T11:07:09.855Z" },
      ];

      render(
        <HabitList
          habits={habits}
          activeAction={{ type: "none" }}
          setActiveAction={jest.fn()}
          completions={[]}
        />,
      );

      const items = screen.getAllByRole("listitem");

      expect(items).toHaveLength(2);
      expect(screen.getByText("Meditate")).toBeInTheDocument();
      expect(screen.getByText("Read")).toBeInTheDocument();

      const placeholder = screen.queryByText("No habits added");
      expect(placeholder).not.toBeInTheDocument();
    });

    describe("and a habit has a completion dated today", () => {
      it("then shows that habit's toggle as done", () => {
        const habits: Habit[] = [
          { id: "1", name: "Meditate", created_at: "2026-08-17T11:06:09.855Z" },
          { id: "2", name: "Read", created_at: "2026-08-17T11:07:09.855Z" },
        ];
        const completions: Completion[] = [
          {
            id: "c1",
            habit_id: "1",
            completed_on: "2026-08-27",
            created_at: "2026-08-27T09:00:00.000Z",
          },
        ];

        render(
          <HabitList
            habits={habits}
            activeAction={{ type: "none" }}
            setActiveAction={jest.fn()}
            completions={completions}
          />,
        );

        expect(screen.getByRole("button", { name: "Mark habit as not done" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Mark habit as done" })).toBeInTheDocument();
      });
    });

    describe("and a habit has a completion dated on a different day", () => {
      it("then does not show that habit's toggle as done", () => {
        const habits: Habit[] = [
          { id: "1", name: "Meditate", created_at: "2026-08-17T11:06:09.855Z" },
        ];
        const completions: Completion[] = [
          {
            id: "c1",
            habit_id: "1",
            completed_on: "2026-08-26",
            created_at: "2026-08-26T09:00:00.000Z",
          },
        ];

        render(
          <HabitList
            habits={habits}
            activeAction={{ type: "none" }}
            setActiveAction={jest.fn()}
            completions={completions}
          />,
        );

        expect(screen.getByRole("button", { name: "Mark habit as done" })).toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Mark habit as not done" }),
        ).not.toBeInTheDocument();
      });
    });

    describe("and a completion belongs to a different habit's id", () => {
      it("then does not show that habit's toggle as done", () => {
        const habits: Habit[] = [
          { id: "1", name: "Meditate", created_at: "2026-08-17T11:06:09.855Z" },
        ];
        const completions: Completion[] = [
          {
            id: "c1",
            habit_id: "2",
            completed_on: "2026-08-27",
            created_at: "2026-08-27T09:00:00.000Z",
          },
        ];

        render(
          <HabitList
            habits={habits}
            activeAction={{ type: "none" }}
            setActiveAction={jest.fn()}
            completions={completions}
          />,
        );

        expect(screen.getByRole("button", { name: "Mark habit as done" })).toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Mark habit as not done" }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("given a habit is being deleted", () => {
    it("then only clears the active action once the fresh habits array confirms the habit is actually gone, not the instant the delete request resolves", async () => {
      // Real cross-component proof of the delete-race fix: DeleteHabitForm/HabitSection on their
      // own can never clear activeAction any more (see their own tests) - this is the one place
      // with visibility into the full habits array to prove the fix's other half actually works.
      const habit: Habit = {
        id: "1",
        name: "Meditate",
        created_at: "2026-08-17T11:06:09.855Z",
      };
      mockedDeleteHabit.mockResolvedValueOnce({});

      const user = userEvent.setup();
      const setActiveAction = jest.fn();

      const { rerender } = render(
        <HabitList
          habits={[habit]}
          activeAction={{ type: "deleting", habitId: habit.id }}
          setActiveAction={setActiveAction}
          completions={[]}
        />,
      );

      await user.click(screen.getByText("Delete"));

      await waitFor(() => {
        expect(mockedDeleteHabit).toHaveBeenCalledWith(habit.id);
      });

      // The request has resolved, but habits hasn't refreshed yet - activeAction must not have
      // cleared, so the confirmation card is still showing "Deleting...", not a normal row.
      expect(setActiveAction).not.toHaveBeenCalled();

      // Now the fresh habits array lands (the habit is gone) - activeAction should clear.
      rerender(
        <HabitList
          habits={[]}
          activeAction={{ type: "deleting", habitId: habit.id }}
          setActiveAction={setActiveAction}
          completions={[]}
        />,
      );

      await waitFor(() => {
        expect(setActiveAction).toHaveBeenCalledWith({ type: "none" });
      });
    });
  });
});
