import { render, screen } from "@testing-library/react";
import { Streak } from "@/components/Streak";

describe("Streak component", () => {
  describe("given a streak count of 0", () => {
    it("then renders an empty badge with an accessible name, and no visible number", () => {
      render(<Streak streakCount={0} />);

      const badge = screen.getByLabelText("0 day streak count");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("");
    });

    it("then uses the transparent/empty styling, not any of the numbered states' colours", () => {
      render(<Streak streakCount={0} />);

      const badge = screen.getByLabelText("0 day streak count");
      expect(badge).toHaveClass("bg-transparent", "border-line");
    });
  });

  describe("given a streak count of 1", () => {
    it("then shows the number and the streak-1 accessible name", () => {
      render(<Streak streakCount={1} />);

      const badge = screen.getByLabelText("1 day streak count");
      expect(badge).toHaveTextContent("1");
    });

    it("then uses the streak-1 colour tokens", () => {
      render(<Streak streakCount={1} />);

      const badge = screen.getByLabelText("1 day streak count");
      expect(badge).toHaveClass(
        "bg-streak-intensity-1-bg",
        "text-streak-intensity-1-text",
        "border-streak-intensity-1-border",
      );
    });

    it("then does not show the 🔥 emoji", () => {
      render(<Streak streakCount={1} />);

      expect(screen.getByLabelText("1 day streak count")).not.toHaveTextContent("🔥");
    });
  });

  describe("given a streak count of 2", () => {
    it("then shows the number and the streak-2 accessible name", () => {
      render(<Streak streakCount={2} />);

      const badge = screen.getByLabelText("2 day streak count");
      expect(badge).toHaveTextContent("2");
    });

    it("then uses the streak-2 colour tokens", () => {
      render(<Streak streakCount={2} />);

      const badge = screen.getByLabelText("2 day streak count");
      expect(badge).toHaveClass(
        "bg-streak-intensity-2-bg",
        "text-white",
        "border-streak-intensity-2-border",
      );
    });

    it("then does not show the 🔥 emoji", () => {
      render(<Streak streakCount={2} />);

      expect(screen.getByLabelText("2 day streak count")).not.toHaveTextContent("🔥");
    });
  });

  describe("given a streak count of 3", () => {
    it("then shows the 🔥 emoji and the number", () => {
      render(<Streak streakCount={3} />);

      const badge = screen.getByLabelText("3 day streak count");
      expect(badge).toHaveTextContent("🔥");
      expect(badge).toHaveTextContent("3");
    });

    it("then uses the streak-3 colour tokens", () => {
      render(<Streak streakCount={3} />);

      const badge = screen.getByLabelText("3 day streak count");
      expect(badge).toHaveClass("bg-brand", "text-white", "border-streak-intensity-3-border");
    });
  });

  describe("given a streak count above 3", () => {
    it("then still uses the streak-3+ treatment, not a fifth state", () => {
      // The component branches on streakCount >= 3, not === 3 - a long-running streak (e.g. 12,
      // matching the design mockup's own example) should get the same fire/brand treatment as
      // exactly 3, not fall through to some other/no styling.
      render(<Streak streakCount={12} />);

      const badge = screen.getByLabelText("12 day streak count");
      expect(badge).toHaveTextContent("🔥");
      expect(badge).toHaveTextContent("12");
      expect(badge).toHaveClass("bg-brand", "text-white", "border-streak-intensity-3-border");
    });
  });
});
