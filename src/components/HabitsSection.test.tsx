import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Avoid importing server-only modules pulled in by the real action implementation.
// Mock the server action before importing the component so the module graph doesn't
// load Next.js server code (which expects globals like Request). This is the only
// mock in this file - AddHabitButton, AddHabitForm, and HabitList are all real, so
// the actual wiring between them (not just each component in isolation) gets exercised.
jest.mock("@/app/actions", () => ({
  createHabit: jest.fn(),
  updateHabit: jest.fn(),
  deleteHabit: jest.fn(),
  toggleCompletion: jest.fn(),
}));

jest.mock("@/lib/dates", () => ({
  getTodaysDate: jest.fn(() => "2026-08-27"),
  getTodaysDateHeading: jest.fn(() => "Thursday, 27 Aug"),
}));

import { HabitsSection } from "@/components/HabitsSection";
import { createHabit } from "@/app/actions";
import { getTodaysDate, getTodaysDateHeading } from "@/lib/dates";
import { Habit } from "@/lib/types";

const mockedCreateHabit = jest.mocked(createHabit);
const mockedGetTodaysDate = jest.mocked(getTodaysDate);
const mockedGetTodaysDateHeading = jest.mocked(getTodaysDateHeading);

const habits: Habit[] = [{ id: "1", name: "Meditate", created_at: "2026-08-17T11:06:09.855Z" }];

describe("HabitsSection component", () => {
  beforeEach(() => {
    mockedCreateHabit.mockReset();
  });

  describe("given the section has just loaded", () => {
    it("then shows an enabled 'Add habit' button, no open form, and the given habits", () => {
      render(<HabitsSection habits={habits} completions={[]} />);

      expect(screen.getByRole("button", { name: /add habit/i })).toBeEnabled();
      expect(screen.queryByLabelText("Habit name")).not.toBeInTheDocument();
      expect(screen.getByText("Meditate")).toBeInTheDocument();
    });

    it("then shows today's date heading", () => {
      // getTodaysDateHeading is mocked (see the jest.mock at the top) so this asserts the mocked
      // text renders, not that the real formatting logic is correct - that's dates.test.ts's job.
      render(<HabitsSection habits={habits} completions={[]} />);

      expect(screen.getByText("Thursday, 27 Aug")).toBeInTheDocument();
    });

    it("then passes the same Date instance to getTodaysDateHeading and getTodaysDate", () => {
      // Regression guard for the exact bug the shared-`today` refactor exists to prevent: if
      // HabitsSection ever went back to calling `getTodaysDateHeading(new Date())` and
      // `getTodaysDate(new Date())` as two independent calls, this is the only thing that would
      // catch it - two calls made microseconds apart get the same getTime() (real time elapsed is
      // ~0ms, well under Date's 1ms resolution), so this must assert they're the exact same
      // object (toBe), not just equal timestamps (toEqual/getTime()) - the latter would pass for
      // two independent `new Date()` calls just as easily as for one shared value, and wouldn't
      // actually prove anything.
      render(<HabitsSection habits={habits} completions={[]} />);

      const headingArg = mockedGetTodaysDateHeading.mock.calls[0]?.[0];
      const dateArg = mockedGetTodaysDate.mock.calls[0]?.[0];

      expect(headingArg).toBeInstanceOf(Date);
      expect(headingArg).toBe(dateArg);
    });
  });

  describe("when the user clicks 'Add habit'", () => {
    it("then opens the form and disables the button", async () => {
      const user = userEvent.setup();

      render(<HabitsSection habits={habits} completions={[]} />);

      await user.click(screen.getByRole("button", { name: /add habit/i }));

      expect(screen.getByLabelText("Habit name")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /add habit/i })).toBeDisabled();
    });

    it("then also disables every habit's edit icon", async () => {
      // Proves the "only one action at a time" rule for real, across components: HabitsSection
      // owns one shared activeAction, and AddHabitButton/HabitItem are both real here (not
      // mocked), so this is the only place that can prove opening Add genuinely reaches and
      // disables a habit row's edit icon, not just the Add button itself.
      const user = userEvent.setup();

      render(<HabitsSection habits={habits} completions={[]} />);

      await user.click(screen.getByRole("button", { name: /add habit/i }));

      expect(screen.getByRole("button", { name: "Edit habit" })).toBeDisabled();
    });
  });

  describe("when the user clicks a habit's edit icon", () => {
    it("then opens that habit's update form and disables the 'Add habit' button", async () => {
      const user = userEvent.setup();

      render(<HabitsSection habits={habits} completions={[]} />);

      await user.click(screen.getByRole("button", { name: "Edit habit" }));

      expect(screen.getByLabelText("Edit habit name")).toHaveValue("Meditate");
      expect(screen.getByRole("button", { name: /add habit/i })).toBeDisabled();
    });

    describe("when the user clicks Cancel on the update form", () => {
      it("then re-enables the 'Add habit' button", async () => {
        const user = userEvent.setup();

        render(<HabitsSection habits={habits} completions={[]} />);

        await user.click(screen.getByRole("button", { name: "Edit habit" }));
        await user.click(screen.getByText("Cancel"));

        expect(screen.queryByLabelText("Edit habit name")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /add habit/i })).toBeEnabled();
      });
    });
  });

  describe("when the user clicks a habit's delete icon", () => {
    it("then opens the delete confirmation and disables the 'Add habit' button", async () => {
      const user = userEvent.setup();

      render(<HabitsSection habits={habits} completions={[]} />);

      await user.click(screen.getByRole("button", { name: "Delete habit" }));

      expect(screen.getByText("Delete this habit?")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /add habit/i })).toBeDisabled();
    });

    describe("when the user clicks Cancel on the delete confirmation", () => {
      it("then re-enables the 'Add habit' button", async () => {
        const user = userEvent.setup();

        render(<HabitsSection habits={habits} completions={[]} />);

        await user.click(screen.getByRole("button", { name: "Delete habit" }));
        await user.click(screen.getByText("Cancel"));

        expect(screen.queryByText("Delete this habit?")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /add habit/i })).toBeEnabled();
      });
    });
  });

  describe("given the form is open", () => {
    describe("when the user clicks Cancel", () => {
      it("then closes the form and re-enables the 'Add habit' button", async () => {
        // This is the cross-component proof AddHabitForm's own tests can't give: there,
        // setIsEditing is a jest.fn() that does nothing, so nothing confirms that calling
        // it for real actually closes the form and re-enables the header button. Here it's
        // the real setIsEditing from HabitsSection's own useState, shared with the real
        // AddHabitButton.
        const user = userEvent.setup();

        render(<HabitsSection habits={habits} completions={[]} />);

        await user.click(screen.getByRole("button", { name: /add habit/i }));
        await user.click(screen.getByText("Cancel"));

        expect(screen.queryByLabelText("Habit name")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /add habit/i })).toBeEnabled();
      });
    });

    describe("when a habit is submitted successfully", () => {
      it("then closes the form and re-enables the 'Add habit' button", async () => {
        // Same wiring proof as the Cancel case above, via the other path that also calls
        // setIsEditing(false) - AddHabitForm's own success path.
        mockedCreateHabit.mockResolvedValue({});

        const user = userEvent.setup();

        render(<HabitsSection habits={habits} completions={[]} />);

        await user.click(screen.getByRole("button", { name: /add habit/i }));
        await user.type(screen.getByLabelText("Habit name"), "Read");
        await user.click(screen.getByText("Add"));

        await waitFor(() => {
          expect(screen.queryByLabelText("Habit name")).not.toBeInTheDocument();
        });
        expect(screen.getByRole("button", { name: /add habit/i })).toBeEnabled();
      });
    });
  });

  describe("given a habit has a completion dated today", () => {
    it("then shows that habit's toggle as done", () => {
      const completions = [
        {
          id: "c1",
          habit_id: "1",
          completed_on: "2026-08-27",
          created_at: "2026-08-27T09:00:00.000Z",
        },
      ];

      render(<HabitsSection habits={habits} completions={completions} />);

      expect(screen.getByRole("button", { name: "Mark habit as not done" })).toBeInTheDocument();
    });
  });
});
