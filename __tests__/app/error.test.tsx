import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorPage from "@/app/error";

describe("Error boundary", () => {
  const error = new Error("Failed to fetch habits");

  test("should show a friendly message and a 'Try again' button", () => {
    render(<ErrorPage error={error} retry={jest.fn()} />);

    expect(screen.getByText("Something went wrong while loading your habits.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  test("clicking 'Try again' calls retry", async () => {
    const user = userEvent.setup();
    const retry = jest.fn();

    render(<ErrorPage error={error} retry={retry} />);

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
