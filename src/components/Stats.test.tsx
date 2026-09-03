import { render, screen } from "@testing-library/react";
import { Stats } from "./Stats";
import { Completion, Habit } from "@/lib/types";

const TODAYS_DATE = "2026-08-27";

describe("Stats component", () => {
  describe("given habits with a mix of today's completions and ongoing streaks", () => {
    it("then renders all three cards with their correctly computed values", () => {
      const habits: Habit[] = [
        { id: "1", name: "Meditate", created_at: "2026-08-17T11:06:09.855Z" },
        { id: "2", name: "Read", created_at: "2026-08-17T11:07:09.855Z" },
      ];
      const completions: Completion[] = [
        // Meditate: done today and yesterday - a 2-day streak, and today's only completion.
        {
          id: "c1",
          habit_id: "1",
          completed_on: "2026-08-27",
          created_at: "2026-08-27T09:00:00.000Z",
        },
        {
          id: "c2",
          habit_id: "1",
          completed_on: "2026-08-26",
          created_at: "2026-08-26T09:00:00.000Z",
        },
        // Read: an older, broken streak - shouldn't count towards the daily streak or best streak.
        {
          id: "c3",
          habit_id: "2",
          completed_on: "2026-08-20",
          created_at: "2026-08-20T09:00:00.000Z",
        },
      ];

      render(<Stats habits={habits} completions={completions} todaysDate={TODAYS_DATE} />);

      // Today: 1 of 2 habits completed today.
      expect(screen.getByText("1/2")).toBeInTheDocument();
      // Daily streak (any habit done): 2 consecutive days, from Meditate's completions.
      expect(screen.getByText("Daily streak").closest("div")).toHaveTextContent("2");
      // Best streak: Meditate alone, at 2.
      expect(screen.getByText("Meditate")).toBeInTheDocument();
    });
  });

  describe("given no habits have ever been completed", () => {
    it("then shows 0/0 today, a 0 daily streak, and the best-streak placeholder", () => {
      const habits: Habit[] = [
        { id: "1", name: "Meditate", created_at: "2026-08-17T11:06:09.855Z" },
      ];

      render(<Stats habits={habits} completions={[]} todaysDate={TODAYS_DATE} />);

      expect(screen.getByText("0/1")).toBeInTheDocument();
      expect(screen.getByText("Daily streak").closest("div")).toHaveTextContent("0");
      expect(screen.getByText("Complete a habit to start a streak")).toBeInTheDocument();
    });
  });
});
