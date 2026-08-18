import { render, screen } from "@testing-library/react";
import Loading from "@/app/loading";

describe("Loading UI", () => {
  it("shows a loading message", () => {
    render(<Loading />);

    expect(screen.getByText("Loading habits...")).toBeInTheDocument();
  });
});
