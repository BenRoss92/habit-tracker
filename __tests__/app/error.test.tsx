import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorPage from "@/app/error";

describe("Error boundary", () => {
  // A generic Error, standing in for whatever actually failed - ErrorPage doesn't inspect the
  // error's contents, so these tests aren't specific to any one feature that might throw.
  const error = new Error("Something went wrong");

  describe("given an error occurred", () => {
    // ErrorPage logs the error via console.error as part of its real behaviour (see the test
    // below that asserts on it) - every other test in this file triggers that same logging as
    // a side effect just by rendering, so silence it here to keep the rest of the suite's
    // output clean without losing the dedicated assertion on it.
    let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("then shows a friendly message and a 'Try again' button", () => {
      render(<ErrorPage error={error} retry={jest.fn()} />);

      expect(
        screen.getByText("Something went wrong while loading your habits."),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    });

    it("then logs the error for debugging", () => {
      render(<ErrorPage error={error} retry={jest.fn()} />);

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    });

    describe("when the user clicks 'Try again'", () => {
      it("then tries again", async () => {
        const user = userEvent.setup();
        const retry = jest.fn();

        render(<ErrorPage error={error} retry={retry} />);

        await user.click(screen.getByRole("button", { name: "Try again" }));

        expect(retry).toHaveBeenCalledTimes(1);
      });
    });
  });
});
