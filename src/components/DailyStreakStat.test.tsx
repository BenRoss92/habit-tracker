import { render, screen } from "@testing-library/react";
import { DailyStreakStat } from "./DailyStreakStat";

describe("DailyStreakStat component", () => {
  describe("given a daily streak count", () => {
    it("then shows the count and the 'days active' subtitle", () => {
      render(<DailyStreakStat dailyStreakCount={6} />);

      expect(screen.getByText("6")).toBeInTheDocument();
      expect(screen.getByText("days active")).toBeInTheDocument();
    });
  });

  describe("given a daily streak count of 0", () => {
    it("then still shows 0, not a blank value", () => {
      render(<DailyStreakStat dailyStreakCount={0} />);

      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });
});
