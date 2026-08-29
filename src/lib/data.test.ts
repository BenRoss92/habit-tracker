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

const completions: Completion[] = [
  {
    id: "0d1e2f3a-4b5c-6d7e-8f9a-0b1c2d3e4f5a",
    habit_id: "bc19277c-46a3-4d8d-b824-bc9c0e74abbd",
    completed_on: "2026-08-26",
    created_at: "2026-08-26T09:00:00.000Z",
  },
  {
    id: "1d1e2f3a-4b5c-6d7e-8f9a-0b1c2d3e4f5b",
    habit_id: "bc19277c-46a3-4d8d-b824-bc9c0e74abbe",
    completed_on: "2026-08-27",
    created_at: "2026-08-27T09:00:00.000Z",
  },
];

// The real habits query chains .select().order(...), so the mock needs to mirror that shape -
// .select() returns an object with a chainable .order() that resolves, rather than resolving
// directly itself. The real completions query is just .select() with no .order() chain, so it
// needs its own, differently-shaped mock that resolves directly - a shared table-agnostic mock
// couldn't support both shapes at once.
const mockOrder = jest.fn();
const mockHabitsSelect = jest.fn(() => ({ order: mockOrder }));
const mockCompletionsSelect = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === "completions") {
        return { select: mockCompletionsSelect };
      }
      return { select: mockHabitsSelect };
    }),
  })),
}));

import { fetchCompletions, fetchHabits } from "./data";
import { Completion, Habit } from "./types";

describe("Data fetching", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchHabits", () => {
    // fetchHabits logs the underlying error via console.error before re-throwing a generic
    // message (see src/lib/data.ts) - that's real, deliberate behaviour, so silence it here
    // to keep the two error-path tests' output clean rather than suppressing the coverage.
    let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("should return an array of habits when select query is successful", async () => {
      mockOrder.mockResolvedValueOnce({ data: habits, error: null });

      const result = await fetchHabits();

      expect(result).toStrictEqual(habits);
    });

    it(
      "should order by created_at ascending, so existing habits keep a stable position " +
        "and new/updated habits don't jump to the top",
      async () => {
        // Regression guard for the bug where updating a habit sent it to the bottom of the
        // list - Postgres gives no ordering guarantee without an explicit ORDER BY, and an
        // UPDATE (via MVCC) writes a new row version that can surface out of creation order.
        mockOrder.mockResolvedValueOnce({ data: habits, error: null });

        await fetchHabits();

        expect(mockHabitsSelect).toHaveBeenCalledTimes(1);
        expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: true });
      },
    );

    it("should throw when an unexpected Supabase error occurs", async () => {
      const unexpectedError = new Error("Unexpected failure");
      mockOrder.mockRejectedValueOnce(unexpectedError);

      await expect(fetchHabits()).rejects.toThrow("Failed to fetch habits");

      expect(consoleErrorSpy).toHaveBeenCalledWith(unexpectedError);
    });

    it("should throw when the select query returns an error", async () => {
      const queryError = new Error("Network error");
      mockOrder.mockResolvedValueOnce({ data: null, error: queryError });

      await expect(fetchHabits()).rejects.toThrow("Failed to fetch habits");

      expect(consoleErrorSpy).toHaveBeenCalledWith(queryError);
    });
  });

  describe("fetchCompletions", () => {
    let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("should return an array of completions when select query is successful", async () => {
      mockCompletionsSelect.mockResolvedValueOnce({ data: completions, error: null });

      const result = await fetchCompletions();

      expect(result).toStrictEqual(completions);
    });

    it("should throw when an unexpected Supabase error occurs", async () => {
      const unexpectedError = new Error("Unexpected failure");
      mockCompletionsSelect.mockRejectedValueOnce(unexpectedError);

      await expect(fetchCompletions()).rejects.toThrow("Failed to fetch habit completion data");

      expect(consoleErrorSpy).toHaveBeenCalledWith(unexpectedError);
    });

    it("should throw when the select query returns an error", async () => {
      const queryError = new Error("Network error");
      mockCompletionsSelect.mockResolvedValueOnce({ data: null, error: queryError });

      await expect(fetchCompletions()).rejects.toThrow("Failed to fetch habit completion data");

      expect(consoleErrorSpy).toHaveBeenCalledWith(queryError);
    });
  });
});
