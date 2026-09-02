import { render, screen } from "@testing-library/react";

// Mock fetching the list of habits from the database so importing the Page component doesn't try
// to execute the server-side data fetching code (which would require Node web globals like
// Request).
jest.mock("@/lib/data", () => ({
  fetchHabits: jest.fn(),
  fetchCompletions: jest.fn(),
}));

// Also mock the server actions so importing `Habits`/`Page` (which pulls in HabitsSection ->
// HabitList -> HabitSection -> HabitItem/UpdateHabitForm/DeleteHabitForm) doesn't load Next
// server code that expects Node web globals like `Request`.
jest.mock("@/app/actions", () => ({
  createHabit: jest.fn().mockResolvedValue(undefined),
  updateHabit: jest.fn(),
  deleteHabit: jest.fn(),
  toggleCompletion: jest.fn(),
}));

// HabitList computes wasDoneToday from the real system date - mock it to a fixed value so the
// "completion dated today" test below doesn't silently start failing on a future date.
jest.mock("@/lib/dates", () => ({
  getTodaysDate: jest.fn(() => "2026-08-27"),
}));

import Page from "@/app/page";
import { fetchCompletions, fetchHabits } from "@/lib/data";
import { Habit } from "@/lib/types";

const fetchHabitsMock = jest.mocked(fetchHabits);
const fetchCompletionsMock = jest.mocked(fetchCompletions);

describe("Home page", () => {
  beforeEach(() => {
    // Most tests here don't care about completions - default to an empty array so each test only
    // needs to stub it when the completion data actually matters.
    fetchCompletionsMock.mockResolvedValue([]);
  });

  describe("given there are no habits", () => {
    it("then shows the message 'No habits added'", async () => {
      // Need to await the imported Page server component. Server components are async and return a
      // Promise, but React Testing Library's 'render' is synchronous. 'render' expects a
      // synchronous, standard React JSX element that it can immediately mount into the virtual DOM.
      // render - mounts React components into a test DOM (jsdom). Loads and displays the Page
      // component into a test DOM so that the test can see and interact with it.
      fetchHabitsMock.mockResolvedValueOnce([]);

      // Need to await the imported Page server component. Server components are async and return a
      // Promise, but React Testing Library's 'render' is synchronous. 'render' expects a
      // synchronous, standard React JSX element that it can immediately mount into the virtual DOM.
      // render - mounts React components into a test DOM (jsdom). Loads and displays the Page
      // component into a test DOM so that the test can see and interact with it.
      const page = await Page();
      render(page);

      // Once the component is mounted into the test DOM using 'render',
      // you can use 'screen' to query the test DOM.
      // screen - standard and preferred object used1 to query and
      // find elements in the React Testing Library testing environment.
      // screen - represents the entire HTML body in the test.

      const notice = screen.getByText("No habits added");

      expect(notice).toBeInTheDocument();

      const habitList = screen.queryByRole("list");

      expect(habitList).not.toBeInTheDocument();
    });
  });

  describe("given the page has loaded", () => {
    it("then also shows the add-habit button", async () => {
      fetchHabitsMock.mockResolvedValueOnce([]);

      const page = await Page();
      render(page);

      expect(screen.getByText("Add habit")).toBeInTheDocument();
    });
  });

  describe("given there are habits", () => {
    it("then shows a list of habits", async () => {
      const habits: Habit[] = [
        {
          created_at: "2026-08-17T11:06:09.855Z",
          id: "bc19277c-46a3-4d8d-b824-bc9c0e74abbd",
          name: "Meditate",
        },
        {
          created_at: "2026-08-17T11:07:09.855Z",
          id: "bc19277c-46a3-4d8d-b824-bc9c0e74abbe",
          name: "Wash clothes",
        },
        {
          created_at: "2026-08-17T11:08:09.855Z",
          id: "bc19277c-46a3-4d8d-b824-bc9c0e74abbf",
          name: "Read",
        },
      ];

      fetchHabitsMock.mockResolvedValueOnce(habits);

      const page = await Page();
      render(page);

      const habitList = screen.getByRole("list");

      expect(habitList).toBeInTheDocument();

      // Confirm the actual fetched habits made it through the whole chain (Page ->
      // HabitsSection -> HabitList), not just that some <ul> happens to exist - a
      // completely broken data pass-through would still satisfy getByRole("list") alone.
      expect(screen.getByText("Meditate")).toBeInTheDocument();
      expect(screen.getByText("Wash clothes")).toBeInTheDocument();
      expect(screen.getByText("Read")).toBeInTheDocument();

      const notice = screen.queryByText("No habits added");

      expect(notice).not.toBeInTheDocument();
    });

    it("then shows a habit with a completion dated today as done", async () => {
      const habitId = "bc19277c-46a3-4d8d-b824-bc9c0e74abbd";
      const habits: Habit[] = [
        {
          created_at: "2026-08-17T11:06:09.855Z",
          id: habitId,
          name: "Meditate",
        },
      ];

      fetchHabitsMock.mockResolvedValueOnce(habits);
      fetchCompletionsMock.mockResolvedValueOnce([
        {
          id: "c1",
          habit_id: habitId,
          completed_on: "2026-08-27",
          created_at: "2026-08-27T09:00:00.000Z",
        },
      ]);

      const page = await Page();
      render(page);

      expect(screen.getByRole("button", { name: "Mark habit as not done" })).toBeInTheDocument();
      // Real, full-stack proof that the streak count is actually computed and rendered from
      // fetched data, not just unit-tested in isolation - one completion dated today, and nothing
      // else, is exactly the data shape a genuine 1-day streak comes from.
      expect(screen.getByLabelText("1 day streak count")).toBeInTheDocument();
    });
  });

  describe("given fetching habits fails", () => {
    it("then propagates the error instead of handling it", async () => {
      // Home has no try/catch around fetchHabits, so a failed fetch propagates all the way out of
      // this Server Component - that's what makes it reachable by app/error.tsx's boundary in the
      // real app. This test calls Page() directly, so it can't exercise Next's automatic file-
      // convention wrapping; it only proves Home itself doesn't swallow the error, which is the
      // precondition error.test.tsx assumes when testing the boundary in isolation.
      fetchHabitsMock.mockRejectedValueOnce(new Error("Failed to fetch habits"));

      await expect(Page()).rejects.toThrow("Failed to fetch habits");
    });
  });

  describe("given fetching completions fails", () => {
    it("then propagates the error instead of handling it", async () => {
      fetchHabitsMock.mockResolvedValueOnce([]);
      fetchCompletionsMock.mockRejectedValueOnce(
        new Error("Failed to fetch habit completion data"),
      );

      await expect(Page()).rejects.toThrow("Failed to fetch habit completion data");
    });
  });
});
