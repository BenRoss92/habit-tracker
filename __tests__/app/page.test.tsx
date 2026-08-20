import { render, screen } from "@testing-library/react";

// Mock fetching the list of habits from the database so importing the Page component doesn't try
// to execute the server-side data fetching code (which would require Node web globals like
// Request).
jest.mock("@/lib/data", () => ({
  fetchHabits: jest.fn(),
}));

// Also mock the server action for creating a habit so importing `Habits`/`Page` doesn't load
// Next server code that expects Node web globals like `Request`.
jest.mock("@/app/actions", () => ({
  createHabit: jest.fn().mockResolvedValue(undefined),
}));

import Page from "@/app/page";
import { fetchHabits } from "@/lib/data";
import { Habit } from "@/lib/types";

const fetchHabitsMock = jest.mocked(fetchHabits);

describe("Home page", () => {
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

      const notice = screen.queryByText("No habits added");

      expect(notice).not.toBeInTheDocument();
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
});
