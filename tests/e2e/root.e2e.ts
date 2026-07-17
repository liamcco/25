import { expect, test } from "@playwright/test";

test("startsidan visar inga festdetaljer", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Privat inbjudan krävs." }),
  ).toBeVisible();
  await expect(page.getByText("Next.js")).toHaveCount(0);
  await expect(page.getByText("fest", { exact: false })).toHaveCount(0);
});
