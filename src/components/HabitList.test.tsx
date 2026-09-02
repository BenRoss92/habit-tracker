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
import { getTodaysDate } from "@/lib/dates";
import { Completion, Habit } from "@/lib/types";

const mockedDeleteHabit = jest.mocked(deleteHabit);
const mockedGetTodaysDate = jest.mocked(getTodaysDate);

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

  describe("streak count", () => {
    // getTodaysDate is mocked to "2026-08-27" for this whole file (see the jest.mock at the top),
    // so "yesterday" is 2026-08-26 and "the day before" is 2026-08-25 throughout these tests.
    const habit: Habit = { id: "1", name: "Meditate", created_at: "2026-08-17T11:06:09.855Z" };

    function completion(id: string, completedOn: string, habitId = habit.id): Completion {
      return {
        id,
        habit_id: habitId,
        completed_on: completedOn,
        created_at: `${completedOn}T09:00:00.000Z`,
      };
    }

    it("given no completions at all, then shows a 0 day streak count", () => {
      render(
        <HabitList
          habits={[habit]}
          activeAction={{ type: "none" }}
          setActiveAction={jest.fn()}
          completions={[]}
        />,
      );

      expect(screen.getByLabelText("0 day streak count")).toBeInTheDocument();
    });

    it("given only a completion from 5 days ago (neither today nor yesterday), then shows a 0 day streak count", () => {
      // An old, isolated completion doesn't keep a streak alive - it broke as soon as a day was
      // missed, regardless of how much history exists further back.
      render(
        <HabitList
          habits={[habit]}
          activeAction={{ type: "none" }}
          setActiveAction={jest.fn()}
          completions={[completion("c1", "2026-08-22")]}
        />,
      );

      expect(screen.getByLabelText("0 day streak count")).toBeInTheDocument();
    });

    it("given a completion dated today only, then shows a 1 day streak count", () => {
      render(
        <HabitList
          habits={[habit]}
          activeAction={{ type: "none" }}
          setActiveAction={jest.fn()}
          completions={[completion("c1", "2026-08-27")]}
        />,
      );

      expect(screen.getByLabelText("1 day streak count")).toBeInTheDocument();
    });

    it("given a completion dated yesterday only (not done today yet), then still shows a 1 day streak count", () => {
      // A streak stays alive through yesterday even if today hasn't been ticked off yet - it
      // shouldn't read as broken just because the user hasn't checked in yet today.
      render(
        <HabitList
          habits={[habit]}
          activeAction={{ type: "none" }}
          setActiveAction={jest.fn()}
          completions={[completion("c1", "2026-08-26")]}
        />,
      );

      expect(screen.getByLabelText("1 day streak count")).toBeInTheDocument();
    });

    it("given completions today and yesterday, then shows a 2 day streak count", () => {
      render(
        <HabitList
          habits={[habit]}
          activeAction={{ type: "none" }}
          setActiveAction={jest.fn()}
          completions={[completion("c1", "2026-08-27"), completion("c2", "2026-08-26")]}
        />,
      );

      expect(screen.getByLabelText("2 day streak count")).toBeInTheDocument();
    });

    it("given three consecutive days including today, then shows a 3 day streak count", () => {
      render(
        <HabitList
          habits={[habit]}
          activeAction={{ type: "none" }}
          setActiveAction={jest.fn()}
          completions={[
            completion("c1", "2026-08-27"),
            completion("c2", "2026-08-26"),
            completion("c3", "2026-08-25"),
          ]}
        />,
      );

      expect(screen.getByLabelText("3 day streak count")).toBeInTheDocument();
    });

    it("given a gap before an older, isolated completion, then the streak stops at the gap", () => {
      // today + yesterday are consecutive (streak of 2), but the third completion is 5 days ago -
      // disconnected from the other two, so it shouldn't extend the streak.
      render(
        <HabitList
          habits={[habit]}
          activeAction={{ type: "none" }}
          setActiveAction={jest.fn()}
          completions={[
            completion("c1", "2026-08-27"),
            completion("c2", "2026-08-26"),
            completion("c3", "2026-08-22"),
          ]}
        />,
      );

      expect(screen.getByLabelText("2 day streak count")).toBeInTheDocument();
    });

    it("given two habits with different completion histories, then calculates each habit's streak independently", () => {
      // Regression guard for a real bug found during development: the streak calculation once
      // accidentally pooled every habit's completions together instead of filtering to just the
      // one habit being calculated for, which would have shown this test's two habits with
      // identical (wrong) streaks instead of their own actual ones.
      const habitB: Habit = { id: "2", name: "Read", created_at: "2026-08-17T11:07:09.855Z" };

      render(
        <HabitList
          habits={[habit, habitB]}
          activeAction={{ type: "none" }}
          setActiveAction={jest.fn()}
          completions={[
            completion("c1", "2026-08-27", habit.id),
            completion("c2", "2026-08-26", habit.id),
            completion("c3", "2026-08-25", habit.id),
            completion("c4", "2026-08-27", habitB.id),
          ]}
        />,
      );

      expect(screen.getByLabelText("3 day streak count")).toBeInTheDocument();
      expect(screen.getByLabelText("1 day streak count")).toBeInTheDocument();
    });

    it("given a streak spanning a month boundary, then still counts the days as consecutive", () => {
      // getTodaysDate is fixed to 2026-08-27 for every other test in this file - override it just
      // for this test, since a month-boundary streak needs "today" to actually be near a month
      // boundary, not just the completions being counted.
      mockedGetTodaysDate.mockReturnValueOnce("2026-09-01");

      render(
        <HabitList
          habits={[habit]}
          activeAction={{ type: "none" }}
          setActiveAction={jest.fn()}
          completions={[
            completion("c1", "2026-09-01"),
            completion("c2", "2026-08-31"),
            completion("c3", "2026-08-30"),
          ]}
        />,
      );

      expect(screen.getByLabelText("3 day streak count")).toBeInTheDocument();
    });

    it("given a streak spanning a year boundary, then still counts the days as consecutive", () => {
      mockedGetTodaysDate.mockReturnValueOnce("2027-01-01");

      render(
        <HabitList
          habits={[habit]}
          activeAction={{ type: "none" }}
          setActiveAction={jest.fn()}
          completions={[
            completion("c1", "2027-01-01"),
            completion("c2", "2026-12-31"),
            completion("c3", "2026-12-30"),
          ]}
        />,
      );

      expect(screen.getByLabelText("3 day streak count")).toBeInTheDocument();
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
