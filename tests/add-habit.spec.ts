import { expect, test } from "@playwright/test";

let habitName: string;
let url: URL;

test.beforeEach(() => {
  // The habit name is given a suffix of the Playwright test project. This is to avoid
  // collisions, as the other projects are running the same tests in parallel and are all trying
  // to create the same habit with the same name, which would then fail the later assertion of
  // checking that only one habit item with that name exists in the habit list.
  habitName = `Exercise ${test.info().project.name}`;
  url = new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/habits`);
  url.searchParams.set("name", `eq.${habitName}`);
});

// After every test, delete the habit that was created.
// If we look for an element with this habit name, and there is more than one, the Playwright
// assertion will fail, so we need to clean this up each time. Instead of resetting the supabase
// database, we delete the database row as it is much faster.
test.afterEach(async ({}) => {
  await fetch(url, {
    method: "DELETE",
    headers: {
      apiKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });
});

test.describe("given no habits exist yet", () => {
  test.describe("when the user adds a new habit", () => {
    test("then it appears in the habit list", async ({ page }) => {
      // Go to the habit tracker main page
      await page.goto("/");
      await page.getByRole("button", { name: "Add habit" }).click();
      await page.getByLabel("Habit name").fill(habitName);
      await page.getByRole("button", { name: "Add", exact: true }).click();
      await expect(page.getByRole("form")).toBeHidden();

      // Find the list item that has the habit name we expect
      const listItem = page.getByRole("listitem").filter({ hasText: habitName });
      await expect(listItem).toBeVisible();
    });
  });
});
