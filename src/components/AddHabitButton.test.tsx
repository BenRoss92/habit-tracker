import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddHabitButton } from "@/components/AddHabitButton";

describe("AddHabitButton component", () => {
  describe("given the form is not open", () => {
    it("then shows an enabled 'Add habit' button", () => {
      render(<AddHabitButton toggleEditing={jest.fn()} isEditing={false} />);

      const button = screen.getByRole("button", { name: /add habit/i });

      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });

    describe("when clicked", () => {
      it("then calls toggleEditing", async () => {
        const user = userEvent.setup();
        const toggleEditing = jest.fn();

        render(<AddHabitButton toggleEditing={toggleEditing} isEditing={false} />);

        await user.click(screen.getByRole("button", { name: /add habit/i }));

        expect(toggleEditing).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("given the form is already open", () => {
    it("then the button is disabled", () => {
      render(<AddHabitButton toggleEditing={jest.fn()} isEditing={true} />);

      expect(screen.getByRole("button", { name: /add habit/i })).toBeDisabled();
    });

    describe("when clicked", () => {
      it("then does not call toggleEditing", async () => {
        // userEvent (unlike fireEvent) respects the disabled attribute and won't fire the
        // click handler - this is what actually proves the button is functionally disabled,
        // not just styled to look that way.
        const user = userEvent.setup();
        const toggleEditing = jest.fn();

        render(<AddHabitButton toggleEditing={toggleEditing} isEditing={true} />);

        await user.click(screen.getByRole("button", { name: /add habit/i }));

        expect(toggleEditing).not.toHaveBeenCalled();
      });
    });
  });
});
