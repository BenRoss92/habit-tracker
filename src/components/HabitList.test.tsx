import { render, screen } from "@testing-library/react";

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
import { Completion, Habit } from "@/lib/types";

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
});
