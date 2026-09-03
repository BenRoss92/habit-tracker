import { render, screen } from "@testing-library/react";
import { BestStreakStat } from "./BestStreakStat";
import { BestStreakStatType } from "@/lib/habit-completions";

describe("BestStreakStat component", () => {
  describe("given state 'none'", () => {
    it("then shows a placeholder message and no streak number", () => {
      const bestStreakStat: BestStreakStatType = { state: "none" };

      render(<BestStreakStat bestStreakStat={bestStreakStat} />);

      expect(screen.getByText("Complete a habit to start a streak")).toBeInTheDocument();
      // check does not contain digits
      expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
    });
  });

  describe("given state 'single' with a streak of 3 or more", () => {
    it("then shows the 🔥 emoji, the streak count, and the winning habit's name", () => {
      const bestStreakStat: BestStreakStatType = {
        state: "single",
        bestStreakCount: 12,
        habitName: "Morning run",
      };

      render(<BestStreakStat bestStreakStat={bestStreakStat} />);

      const value = screen.getByText("12").closest("p");
      expect(value).toHaveTextContent("🔥");
      expect(value).toHaveTextContent("12");
      expect(screen.getByText("Morning run")).toBeInTheDocument();
    });
  });

  describe("given state 'single' with a streak below 3", () => {
    it("then shows the streak count without the 🔥 emoji", () => {
      const bestStreakStat: BestStreakStatType = {
        state: "single",
        bestStreakCount: 2,
        habitName: "Read",
      };

      render(<BestStreakStat bestStreakStat={bestStreakStat} />);

      const value = screen.getByText("2").closest("p");
      expect(value).not.toHaveTextContent("🔥");
      expect(screen.getByText("Read")).toBeInTheDocument();
    });
  });

  describe("given state 'tied'", () => {
    it("then shows the shared streak count and how many habits are tied", () => {
      const bestStreakStat: BestStreakStatType = {
        state: "tied",
        bestStreakCount: 3,
        tiedHabitCount: 2,
      };

      render(<BestStreakStat bestStreakStat={bestStreakStat} />);

      const value = screen.getByText("3").closest("p");
      expect(value).toHaveTextContent("🔥");
      expect(screen.getByText("2 habits")).toBeInTheDocument();
    });
  });
});
