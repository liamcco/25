import { expect, test } from "@playwright/test";

test("root route reveals no party details", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Private invitation required." }),
  ).toBeVisible();
  await expect(page.getByText("Next.js")).toHaveCount(0);
  await expect(page.getByText("party", { exact: false })).toHaveCount(0);
});
