import { expect, test } from "@playwright/test";

test.describe("Admin View", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Admin browser tests require DATABASE_URL for the running app.",
  );

  test("blocks unauthenticated access, logs in, and persists Party Settings", async ({
    page,
  }) => {
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(
      page.getByRole("heading", { name: "Admin login" }),
    ).toBeVisible();

    await page.getByLabel("Password").fill("test-admin-password");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole("heading", { name: "Party Settings" }),
    ).toBeVisible();

    await page.getByLabel("Title").fill("Liam's 25th");
    await page.getByLabel("Date and time").fill("2026-08-15T18:00");
    await page
      .getByLabel("Location and logistics")
      .fill("Stockholm, details shared privately.");
    await page.getByLabel("Dress code").fill("Summer formal");
    await page
      .getByLabel("Public Party Info")
      .fill("Please RSVP before the cutoff.");
    await page
      .getByLabel("Confirmed Party Info")
      .fill("Door code and playlist details.");
    await page.getByLabel("Late Response Policy").selectOption("accept_late");
    await page.getByRole("button", { name: "Save Party Settings" }).click();

    await expect(page.getByText("Party Settings saved.")).toBeVisible();

    await page.reload();

    await expect(page.getByLabel("Title")).toHaveValue("Liam's 25th");
    await expect(page.getByLabel("Location and logistics")).toHaveValue(
      "Stockholm, details shared privately.",
    );
    await expect(page.getByLabel("Late Response Policy")).toHaveValue(
      "accept_late",
    );
  });
});
