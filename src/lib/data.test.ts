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

// The real query chains .select().order(...), so the mock needs to mirror that shape -
// .select() returns an object with a chainable .order() that resolves, rather than
// resolving directly itself.
const mockOrder = jest.fn();
const mockSelect = jest.fn(() => ({ order: mockOrder }));

jest.mock("@/lib/supabase/server", () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: mockSelect,
  })),
}));

import { fetchHabits } from "./data";
import { Habit } from "./types";

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

        expect(mockSelect).toHaveBeenCalledTimes(1);
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
});
