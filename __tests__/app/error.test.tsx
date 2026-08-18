import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorPage from "@/app/error";

describe("Error boundary", () => {
  // A generic Error, standing in for whatever actually failed - ErrorPage doesn't inspect the
  // error's contents, so these tests aren't specific to any one feature that might throw.
  const error = new Error("Something went wrong");

  describe("given an error occurred", () => {
    it("then shows a friendly message and a 'Try again' button", () => {
      render(<ErrorPage error={error} retry={jest.fn()} />);

      expect(
        screen.getByText("Something went wrong while loading your habits."),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    });

    it("then logs the error for debugging", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(<ErrorPage error={error} retry={jest.fn()} />);

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);

      consoleErrorSpy.mockRestore();
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
