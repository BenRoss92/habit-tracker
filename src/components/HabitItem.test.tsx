import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HabitItem } from "@/components/HabitItem";
import { Habit } from "@/lib/types";

const habit: Habit = {
  id: "bc19277c-46a3-4d8d-b824-bc9c0e74abbd",
  name: "Morning run",
  created_at: "2026-08-17T11:06:09.855Z",
};

describe("HabitItem component", () => {
  it("then shows the habit name", () => {
    render(<HabitItem habit={habit} activeAction={{ type: "none" }} setActiveAction={jest.fn()} />);

    expect(screen.getByText("Morning run")).toBeInTheDocument();
  });

  describe("given nothing else is active", () => {
    it("then the edit and delete icons are both enabled", () => {
      render(
        <HabitItem habit={habit} activeAction={{ type: "none" }} setActiveAction={jest.fn()} />,
      );

      expect(screen.getByRole("button", { name: "Edit habit" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Delete habit" })).toBeEnabled();
    });

    describe("when the edit icon is clicked", () => {
      it("then sets the active action to editing this habit", async () => {
        const user = userEvent.setup();
        const setActiveAction = jest.fn();

        render(
          <HabitItem
            habit={habit}
            activeAction={{ type: "none" }}
            setActiveAction={setActiveAction}
          />,
        );

        await user.click(screen.getByRole("button", { name: "Edit habit" }));

        expect(setActiveAction).toHaveBeenCalledWith({ type: "editing", habitId: habit.id });
      });
    });

    describe("when the delete icon is clicked", () => {
      it("then sets the active action to deleting this habit", async () => {
        const user = userEvent.setup();
        const setActiveAction = jest.fn();

        render(
          <HabitItem
            habit={habit}
            activeAction={{ type: "none" }}
            setActiveAction={setActiveAction}
          />,
        );

        await user.click(screen.getByRole("button", { name: "Delete habit" }));

        expect(setActiveAction).toHaveBeenCalledWith({ type: "deleting", habitId: habit.id });
      });
    });
  });

  describe.each([
    ["adding a habit", { type: "adding" as const }],
    ["editing a different habit", { type: "editing" as const, habitId: "some-other-id" }],
    ["deleting a different habit", { type: "deleting" as const, habitId: "some-other-id" }],
  ])("given something else is already active (%s)", (_label, activeAction) => {
    it("then the edit and delete icons are both disabled", () => {
      render(<HabitItem habit={habit} activeAction={activeAction} setActiveAction={jest.fn()} />);

      expect(screen.getByRole("button", { name: "Edit habit" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Delete habit" })).toBeDisabled();
    });

    describe("when the edit icon is clicked", () => {
      it("then does not change the active action", async () => {
        const user = userEvent.setup();
        const setActiveAction = jest.fn();

        render(
          <HabitItem habit={habit} activeAction={activeAction} setActiveAction={setActiveAction} />,
        );

        await user.click(screen.getByRole("button", { name: "Edit habit" }));

        expect(setActiveAction).not.toHaveBeenCalled();
      });
    });

    describe("when the delete icon is clicked", () => {
      it("then does not change the active action", async () => {
        const user = userEvent.setup();
        const setActiveAction = jest.fn();

        render(
          <HabitItem habit={habit} activeAction={activeAction} setActiveAction={setActiveAction} />,
        );

        await user.click(screen.getByRole("button", { name: "Delete habit" }));

        expect(setActiveAction).not.toHaveBeenCalled();
      });
    });
  });
});
