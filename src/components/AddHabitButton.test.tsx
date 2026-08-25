import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddHabitButton } from "@/components/AddHabitButton";

describe("AddHabitButton component", () => {
  describe("given nothing else is active", () => {
    it("then shows an enabled 'Add habit' button", () => {
      render(<AddHabitButton activeAction={{ type: "none" }} setActiveAction={jest.fn()} />);

      const button = screen.getByRole("button", { name: /add habit/i });

      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });

    describe("when clicked", () => {
      it("then sets the active action to adding", async () => {
        const user = userEvent.setup();
        const setActiveAction = jest.fn();

        render(
          <AddHabitButton activeAction={{ type: "none" }} setActiveAction={setActiveAction} />,
        );

        await user.click(screen.getByRole("button", { name: /add habit/i }));

        expect(setActiveAction).toHaveBeenCalledWith({ type: "adding" });
      });
    });
  });

  describe.each([
    ["adding", { type: "adding" as const }],
    ["editing a habit", { type: "editing" as const, habitId: "1" }],
  ])("given something else is already active (%s)", (_label, activeAction) => {
    it("then the button is disabled", () => {
      render(<AddHabitButton activeAction={activeAction} setActiveAction={jest.fn()} />);

      expect(screen.getByRole("button", { name: /add habit/i })).toBeDisabled();
    });

    describe("when clicked", () => {
      it("then does not change the active action", async () => {
        // userEvent (unlike fireEvent) respects the disabled attribute and won't fire the
        // click handler - this is what actually proves the button is functionally disabled,
        // not just styled to look that way.
        const user = userEvent.setup();
        const setActiveAction = jest.fn();

        render(<AddHabitButton activeAction={activeAction} setActiveAction={setActiveAction} />);

        await user.click(screen.getByRole("button", { name: /add habit/i }));

        expect(setActiveAction).not.toHaveBeenCalled();
      });
    });
  });
});
