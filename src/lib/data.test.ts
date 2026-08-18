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

const mockSelect = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: mockSelect,
  })),
}));

import { fetchHabits } from "./data";
import { Habit } from "./types";

describe("Data fetching", () => {
  describe("fetchHabits", () => {
    test("should return an array of habits when select query is successful", async () => {
      mockSelect.mockResolvedValueOnce({ data: habits, error: null });

      const result = await fetchHabits();

      expect(result).toStrictEqual(habits);
    });

    test("should throw when an unexpected Supabase error occurs", async () => {
      mockSelect.mockRejectedValueOnce(new Error("Unexpected failure"));

      await expect(fetchHabits()).rejects.toThrow("Failed to fetch habits");
    });

    test("should throw when the select query returns an error", async () => {
      mockSelect.mockResolvedValueOnce({ data: null, error: new Error("Network error") });

      await expect(fetchHabits()).rejects.toThrow("Failed to fetch habits");
    });
  });
});
