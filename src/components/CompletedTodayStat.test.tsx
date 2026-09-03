import { render, screen } from "@testing-library/react";
import { CompletedTodayStat } from "./CompletedTodayStat";

describe("CompletedTodayStat component", () => {
  describe("given some, but not all, habits are done today", () => {
    it("then shows the completed count over the total habit count", () => {
      render(<CompletedTodayStat completedTodayCount={2} totalHabitsCount={5} />);

      expect(screen.getByText("2/5")).toBeInTheDocument();
      expect(screen.getByText("habits completed")).toBeInTheDocument();
    });
  });

  describe("given no habits have been completed today", () => {
    it("then still shows the total habit count as the denominator", () => {
      render(<CompletedTodayStat completedTodayCount={0} totalHabitsCount={3} />);

      expect(screen.getByText("0/3")).toBeInTheDocument();
    });
  });

  describe("given there are no habits at all", () => {
    it("then shows a 0/0 count rather than crashing or dividing", () => {
      render(<CompletedTodayStat completedTodayCount={0} totalHabitsCount={0} />);

      expect(screen.getByText("0/0")).toBeInTheDocument();
    });
  });
});
