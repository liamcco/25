import { expect, test } from "@playwright/test";

test.describe("Admin View", () => {
  test.describe.configure({ mode: "serial" });

  test.skip(
    !process.env.DATABASE_URL,
    "Admin browser tests require DATABASE_URL for the running app.",
  );

  test("blocks unauthenticated access, logs in, and persists Party Settings", async ({
    page,
  }) => {
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByText("Admin login")).toBeVisible();

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

  test("creates a Guest and serves the canonical Invitation URL", async ({
    page,
  }) => {
    const displayName = `Ada Lovelace ${Date.now()}`;
    const editedName = `Grace Hopper ${Date.now()}`;

    await page.goto("/admin/login");
    await page.getByLabel("Password").fill("test-admin-password");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.locator("#newGuestDisplayName").fill(displayName);
    await page.getByRole("button", { name: "Create Guest" }).click();

    await expect(page.getByText("The Invitation URL is ready")).toBeVisible();
    const invitationUrlInput = page.getByRole("textbox", {
      name: `${displayName} Invitation URL`,
    });
    await expect(invitationUrlInput).toHaveValue(/\/i\/ada-lovelace-/);
    const invitationUrl = await invitationUrlInput.inputValue();

    await page.goto(invitationUrl);
    await expect(page.getByText(`Invitation for ${displayName}`)).toBeVisible();
    await expect(page.getByText("Party details")).toBeVisible();

    await page.goto("/admin");
    const displayNameInput = page.locator(
      `input[name="displayName"][value="${displayName}"]`,
    );
    await displayNameInput.fill(editedName);
    await page
      .locator("form")
      .filter({ has: displayNameInput })
      .getByRole("button", { name: "Save Guest" })
      .click();

    await expect(
      page.getByText("The canonical Invitation URL has been updated."),
    ).toBeVisible();
    const editedInvitationUrl = await page
      .getByRole("textbox", {
        name: `${editedName} Invitation URL`,
      })
      .inputValue();

    expect(editedInvitationUrl).toMatch(/\/i\/grace-hopper-/);
    expect(editedInvitationUrl).toContain(
      invitationUrl.split("/").at(-1) ?? "",
    );

    const staleSlugUrl = editedInvitationUrl.replace(
      /\/i\/[^/]+\//,
      "/i/wrong-slug/",
    );
    await page.goto(staleSlugUrl);
    await expect(page).toHaveURL(editedInvitationUrl);
    await expect(page.getByText(`Invitation for ${editedName}`)).toBeVisible();

    await page.goto(`/i/${displayName.toLowerCase()}/not-a-real-token`);
    await expect(page.getByText("Invitation unavailable")).toBeVisible();
    await expect(page.getByText(editedName)).toHaveCount(0);
  });

  test("tracks the guest RSVP loop and admin response summary", async ({
    page,
  }) => {
    const displayName = `RSVP Guest ${Date.now()}`;
    const guestSlug = displayName.toLowerCase().replace(/\s+/g, "-");
    const getCount = async (name: string) =>
      Number(await page.getByTestId(`response-count-${name}`).innerText());

    await page.goto("/admin/login");
    await page.getByLabel("Password").fill("test-admin-password");
    await page.getByRole("button", { name: "Log in" }).click();

    const initialCounts = {
      totalGuests: await getCount("total-guests"),
      notResponded: await getCount("not-responded"),
      yes: await getCount("yes"),
      yesLate: await getCount("yes-late"),
      no: await getCount("no"),
    };

    await page.locator("#newGuestDisplayName").fill(displayName);
    await page.getByRole("button", { name: "Create Guest" }).click();

    await expect(page.getByTestId("response-count-total-guests")).toHaveText(
      String(initialCounts.totalGuests + 1),
    );
    await expect(page.getByTestId("response-count-not-responded")).toHaveText(
      String(initialCounts.notResponded + 1),
    );
    await expect(page.getByTestId(`guest-rsvp-status-${guestSlug}`)).toHaveText(
      "Not responded",
    );
    const invitationUrl = await page
      .getByRole("textbox", {
        name: `${displayName} Invitation URL`,
      })
      .inputValue();

    await page.goto(invitationUrl);
    await expect(page.getByText("Current RSVP: Not responded")).toBeVisible();
    await page.getByLabel("Yes, I will attend").check();
    await page.getByLabel("Note to host").fill("Looking forward to it.");
    await page.getByRole("button", { name: "Save RSVP" }).click();

    await expect(page.getByText("Your RSVP has been saved.")).toBeVisible();
    await expect(page.getByText("Current RSVP: Yes")).toBeVisible();
    await expect(page.getByText("Looking forward to it.")).toHaveCount(0);

    await page.reload();
    await expect(page.getByText("Current RSVP: Yes")).toBeVisible();

    await page.goto("/admin");
    await expect(page.getByTestId("response-count-total-guests")).toHaveText(
      String(initialCounts.totalGuests + 1),
    );
    await expect(page.getByTestId("response-count-not-responded")).toHaveText(
      String(initialCounts.notResponded),
    );
    await expect(page.getByTestId("response-count-yes")).toHaveText(
      String(initialCounts.yes + 1),
    );
    await expect(page.getByTestId("response-count-yes-late")).toHaveText(
      String(initialCounts.yesLate),
    );
    await expect(page.getByTestId("response-count-no")).toHaveText(
      String(initialCounts.no),
    );
    await expect(
      page.getByRole("textbox", {
        name: `${displayName} Invitation URL`,
      }),
    ).toBeVisible();
    await expect(page.getByTestId(`guest-rsvp-status-${guestSlug}`)).toHaveText(
      "Yes",
    );
    await expect(page.getByTestId(`guest-rsvp-note-${guestSlug}`)).toHaveText(
      "Looking forward to it.",
    );

    await page.goto(invitationUrl);
    await page.getByLabel("No, I cannot attend").check();
    await page.getByLabel("Note to host").fill("Plans changed.");
    await page.getByRole("button", { name: "Save RSVP" }).click();
    await expect(page.getByText("Current RSVP: No")).toBeVisible();

    await page.goto("/admin");
    await expect(page.getByTestId("response-count-total-guests")).toHaveText(
      String(initialCounts.totalGuests + 1),
    );
    await expect(page.getByTestId("response-count-not-responded")).toHaveText(
      String(initialCounts.notResponded),
    );
    await expect(page.getByTestId("response-count-yes")).toHaveText(
      String(initialCounts.yes),
    );
    await expect(page.getByTestId("response-count-yes-late")).toHaveText(
      String(initialCounts.yesLate),
    );
    await expect(page.getByTestId("response-count-no")).toHaveText(
      String(initialCounts.no + 1),
    );
    await expect(
      page.getByRole("textbox", {
        name: `${displayName} Invitation URL`,
      }),
    ).toBeVisible();
    await expect(page.getByTestId(`guest-rsvp-status-${guestSlug}`)).toHaveText(
      "No",
    );
    await expect(page.getByTestId(`guest-rsvp-note-${guestSlug}`)).toHaveText(
      "Plans changed.",
    );
    await expect(
      page.getByRole("button", { name: "Save Guest" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Save RSVP" })).toHaveCount(
      0,
    );
  });
});
