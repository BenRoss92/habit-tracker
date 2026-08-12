import { render, screen } from "@testing-library/react";
import Page from "@/app/page";

describe("Home page", () => {
  it("renders a heading", () => {
    // render - mounts React components into a test DOM (jsdom).
    // Loads and displays the Page component into a test DOM so that
    // the test can see and interact with it.
    render(<Page />);

    // Once the component is mounted into the test DOM using 'render',
    // you can use 'screen' to query the test DOM.
    // screen - standard and preferred object used1 to query and
    // find elements in the React Testing Library testing environment.
    // screen - represents the entire HTML body in the test.
    // getRoleBy - query for an element based on its accessibility role.
    // Suggested to query by role as it mimics how users and screen
    // readers interact with the real page.
    // 'heading' - represents any heading element i.e. <h1> to <h6>, as
    // they all have a 'heading' role.
    // 'level: 1' - only look for an <h1> element. Ignore other <h>
    // elements.
    const heading = screen.getByRole("heading", { level: 1 });

    // Check whether the <h1> element exists on the page.
    expect(heading).toBeInTheDocument();
  });
});
