import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HabitItem } from "@/components/HabitItem";
import { Habit } from "@/lib/types";
import { toggleCompletion } from "@/app/actions";
import { getTodaysDate } from "@/lib/dates";

jest.mock("@/app/actions", () => ({
  toggleCompletion: jest.fn(),
}));

jest.mock("@/lib/dates", () => ({
  getTodaysDate: jest.fn(),
}));

const mockedToggleCompletion = jest.mocked(toggleCompletion);
const mockedGetTodaysDate = jest.mocked(getTodaysDate);

const habit: Habit = {
  id: "bc19277c-46a3-4d8d-b824-bc9c0e74abbd",
  name: "Morning run",
  created_at: "2026-08-17T11:06:09.855Z",
};

const todaysDate = "2026-08-27";

describe("HabitItem component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetTodaysDate.mockReturnValue(todaysDate);
  });

  it("then shows the habit name", () => {
    render(
      <HabitItem
        habit={habit}
        activeAction={{ type: "none" }}
        setActiveAction={jest.fn()}
        wasDoneToday={false}
        streakCount={0}
      />,
    );

    expect(screen.getByText("Morning run")).toBeInTheDocument();
  });

  it("then passes streakCount through to the streak badge", () => {
    // Streak's own states/colours/emoji are Streak.test.tsx's job - this just proves HabitItem
    // actually forwards the prop it's given, rather than hardcoding or dropping it.
    render(
      <HabitItem
        habit={habit}
        activeAction={{ type: "none" }}
        setActiveAction={jest.fn()}
        wasDoneToday={false}
        streakCount={5}
      />,
    );

    expect(screen.getByLabelText("5 day streak count")).toBeInTheDocument();
  });

  describe("given nothing else is active", () => {
    it("then the edit and delete icons are both enabled", () => {
      render(
        <HabitItem
          habit={habit}
          activeAction={{ type: "none" }}
          setActiveAction={jest.fn()}
          wasDoneToday={false}
          streakCount={0}
        />,
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
            wasDoneToday={false}
            streakCount={0}
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
            wasDoneToday={false}
            streakCount={0}
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
      render(
        <HabitItem
          habit={habit}
          activeAction={activeAction}
          setActiveAction={jest.fn()}
          wasDoneToday={false}
          streakCount={0}
        />,
      );

      expect(screen.getByRole("button", { name: "Edit habit" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Delete habit" })).toBeDisabled();
    });

    describe("when the edit icon is clicked", () => {
      it("then does not change the active action", async () => {
        const user = userEvent.setup();
        const setActiveAction = jest.fn();

        render(
          <HabitItem
            habit={habit}
            activeAction={activeAction}
            setActiveAction={setActiveAction}
            wasDoneToday={false}
            streakCount={0}
          />,
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
          <HabitItem
            habit={habit}
            activeAction={activeAction}
            setActiveAction={setActiveAction}
            wasDoneToday={false}
            streakCount={0}
          />,
        );

        await user.click(screen.getByRole("button", { name: "Delete habit" }));

        expect(setActiveAction).not.toHaveBeenCalled();
      });
    });
  });

  describe("the completion toggle", () => {
    describe("given the habit was not done today", () => {
      it("then shows the empty circle toggle, not the pending or checked one", () => {
        render(
          <HabitItem
            habit={habit}
            activeAction={{ type: "none" }}
            setActiveAction={jest.fn()}
            wasDoneToday={false}
            streakCount={0}
          />,
        );

        expect(screen.getByRole("button", { name: "Mark habit as done" })).toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Mark habit as not done" }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Updating habit completion" }),
        ).not.toBeInTheDocument();
      });

      describe("when the toggle is clicked", () => {
        it("then calls toggleCompletion with the habit id, today's date, and true", async () => {
          const user = userEvent.setup();
          mockedToggleCompletion.mockResolvedValueOnce({});

          render(
            <HabitItem
              habit={habit}
              activeAction={{ type: "none" }}
              setActiveAction={jest.fn()}
              wasDoneToday={false}
              streakCount={0}
            />,
          );

          await user.click(screen.getByRole("button", { name: "Mark habit as done" }));

          expect(mockedToggleCompletion).toHaveBeenCalledWith(habit.id, todaysDate, true);
        });

        it("then shows a disabled, spinning toggle while the request is pending", async () => {
          const user = userEvent.setup();
          let resolveToggle: ((value: { message?: string }) => void) | undefined;
          mockedToggleCompletion.mockReturnValueOnce(
            new Promise((resolve) => {
              resolveToggle = resolve;
            }),
          );

          render(
            <HabitItem
              habit={habit}
              activeAction={{ type: "none" }}
              setActiveAction={jest.fn()}
              wasDoneToday={false}
              streakCount={0}
            />,
          );

          await user.click(screen.getByRole("button", { name: "Mark habit as done" }));

          const pendingToggle = screen.getByRole("button", { name: "Updating habit completion" });
          expect(pendingToggle).toBeDisabled();
          expect(
            screen.queryByRole("button", { name: "Mark habit as done" }),
          ).not.toBeInTheDocument();

          if (!resolveToggle) throw new Error("resolver not ready");

          resolveToggle({});
        });

        it("then keeps showing the pending toggle once the request resolves, until wasDoneToday itself confirms the change", async () => {
          // This is the flash-prevention behaviour: the request resolving alone must not be enough
          // to clear the pending state, since the confirmed data (a fresh wasDoneToday prop, from
          // page.tsx's revalidatePath-triggered refresh) arrives as a separate, later round trip.
          const user = userEvent.setup();
          let resolveToggle: ((value: { message?: string }) => void) | undefined;
          mockedToggleCompletion.mockReturnValueOnce(
            new Promise((resolve) => {
              resolveToggle = resolve;
            }),
          );

          const { rerender } = render(
            <HabitItem
              habit={habit}
              activeAction={{ type: "none" }}
              setActiveAction={jest.fn()}
              wasDoneToday={false}
              streakCount={0}
            />,
          );

          await user.click(screen.getByRole("button", { name: "Mark habit as done" }));

          if (!resolveToggle) throw new Error("resolver not ready");
          resolveToggle({});

          await screen.findByRole("button", { name: "Updating habit completion" });

          // Re-render with the same, still-unconfirmed wasDoneToday - the toggle should stay
          // pending even though the request has resolved.
          rerender(
            <HabitItem
              habit={habit}
              activeAction={{ type: "none" }}
              setActiveAction={jest.fn()}
              wasDoneToday={false}
              streakCount={0}
            />,
          );

          expect(
            screen.getByRole("button", { name: "Updating habit completion" }),
          ).toBeInTheDocument();

          // Now the fresh data lands, confirming the toggle - pending should clear.
          rerender(
            <HabitItem
              habit={habit}
              activeAction={{ type: "none" }}
              setActiveAction={jest.fn()}
              wasDoneToday={true}
              streakCount={0}
            />,
          );

          expect(
            screen.queryByRole("button", { name: "Updating habit completion" }),
          ).not.toBeInTheDocument();
          expect(
            screen.getByRole("button", { name: "Mark habit as not done" }),
          ).toBeInTheDocument();
        });

        it("then shows the exact server error message and stops pending, when the request fails", async () => {
          const user = userEvent.setup();
          mockedToggleCompletion.mockResolvedValueOnce({
            message: "Database error: Failed to complete habit",
          });

          render(
            <HabitItem
              habit={habit}
              activeAction={{ type: "none" }}
              setActiveAction={jest.fn()}
              wasDoneToday={false}
              streakCount={0}
            />,
          );

          await user.click(screen.getByRole("button", { name: "Mark habit as done" }));

          expect(
            await screen.findByText("Database error: Failed to complete habit"),
          ).toBeInTheDocument();
          expect(
            screen.queryByRole("button", { name: "Updating habit completion" }),
          ).not.toBeInTheDocument();
          expect(screen.getByRole("button", { name: "Mark habit as done" })).toBeEnabled();
        });

        it("then shows a fallback error and stops pending, when toggleCompletion itself rejects", async () => {
          // Distinct from the "resolves with { message }" case above - this is the Server
          // Action's own network round trip failing outright (e.g. a dropped connection), which
          // toggleCompletion never actually does in practice (see runHabitMutation's try/catch in
          // actions.ts), but HabitItem still guards against it so a failure here can't leave the
          // toggle stuck spinning forever.
          const user = userEvent.setup();
          mockedToggleCompletion.mockRejectedValueOnce(new Error("Network request failed"));

          render(
            <HabitItem
              habit={habit}
              activeAction={{ type: "none" }}
              setActiveAction={jest.fn()}
              wasDoneToday={false}
              streakCount={0}
            />,
          );

          await user.click(screen.getByRole("button", { name: "Mark habit as done" }));

          expect(
            await screen.findByText("Something went wrong. Please try again."),
          ).toBeInTheDocument();
          expect(
            screen.queryByRole("button", { name: "Updating habit completion" }),
          ).not.toBeInTheDocument();
          expect(screen.getByRole("button", { name: "Mark habit as done" })).toBeEnabled();
        });
      });
    });

    describe("given the habit was done today", () => {
      it("then shows the filled checkmark toggle, not the pending or empty one", () => {
        render(
          <HabitItem
            habit={habit}
            activeAction={{ type: "none" }}
            setActiveAction={jest.fn()}
            wasDoneToday={true}
            streakCount={0}
          />,
        );

        expect(screen.getByRole("button", { name: "Mark habit as not done" })).toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Mark habit as done" }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: "Updating habit completion" }),
        ).not.toBeInTheDocument();
      });

      describe("when the toggle is clicked", () => {
        it("then calls toggleCompletion with the habit id, today's date, and false", async () => {
          const user = userEvent.setup();
          mockedToggleCompletion.mockResolvedValueOnce({});

          render(
            <HabitItem
              habit={habit}
              activeAction={{ type: "none" }}
              setActiveAction={jest.fn()}
              wasDoneToday={true}
              streakCount={0}
            />,
          );

          await user.click(screen.getByRole("button", { name: "Mark habit as not done" }));

          expect(mockedToggleCompletion).toHaveBeenCalledWith(habit.id, todaysDate, false);
        });
      });
    });

    describe("given a toggle is pending", () => {
      it("then the edit and delete icons stay enabled, since the toggle isn't governed by activeAction", async () => {
        const user = userEvent.setup();
        mockedToggleCompletion.mockReturnValueOnce(new Promise(() => {}));

        render(
          <HabitItem
            habit={habit}
            activeAction={{ type: "none" }}
            setActiveAction={jest.fn()}
            wasDoneToday={false}
            streakCount={0}
          />,
        );

        await user.click(screen.getByRole("button", { name: "Mark habit as done" }));

        expect(screen.getByRole("button", { name: "Edit habit" })).toBeEnabled();
        expect(screen.getByRole("button", { name: "Delete habit" })).toBeEnabled();
      });
    });
  });
});
