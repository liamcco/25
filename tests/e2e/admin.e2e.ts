import { expect, type Page, test } from "@playwright/test";

async function openGuestDetail(page: Page, displayName: string) {
  await page
    .getByRole("link", {
      name: `Open ${displayName} guest detail page`,
    })
    .click();
}

async function getInvitationUrlFromGuestDetail(
  page: Page,
  displayName: string,
) {
  return page
    .getByRole("textbox", {
      name: `${displayName} Invitation URL`,
    })
    .inputValue();
}

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
    await page.getByRole("tab", { name: "Party settings" }).click();
    await expect(
      page.getByRole("heading", { name: "Party settings" }),
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

    await page.getByRole("tab", { name: "Guest list" }).click();
    await page.locator("#newGuestDisplayName").fill(displayName);
    await page.getByRole("button", { name: "Create Guest" }).click();

    await expect(page.getByText("The Invitation URL is ready")).toBeVisible();
    await openGuestDetail(page, displayName);
    const guestDetailUrl = page.url();
    const invitationUrl = await getInvitationUrlFromGuestDetail(
      page,
      displayName,
    );
    expect(invitationUrl).toMatch(/\/i\/ada-lovelace-/);

    await page.goto(invitationUrl);
    await expect(page.getByText(`Invitation for ${displayName}`)).toBeVisible();
    await expect(page.getByText("Party details")).toBeVisible();

    await page.goto(guestDetailUrl);
    const displayNameInput = page.locator('input[name="displayName"]');
    await displayNameInput.fill(editedName);
    await page.getByRole("button", { name: "Save Guest" }).click();

    await expect(
      page.getByText("The canonical Invitation URL has been updated."),
    ).toBeVisible();
    const editedInvitationUrl = await getInvitationUrlFromGuestDetail(
      page,
      editedName,
    );

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

    await page.getByRole("tab", { name: "Guest list" }).click();
    await page.locator("#newGuestDisplayName").fill(displayName);
    await page.getByRole("button", { name: "Create Guest" }).click();

    await page.goto("/admin");
    await expect(page.getByTestId("response-count-total-guests")).toHaveText(
      String(initialCounts.totalGuests + 1),
    );
    await expect(page.getByTestId("response-count-not-responded")).toHaveText(
      String(initialCounts.notResponded + 1),
    );
    await page.goto("/admin?tab=guests");
    await expect(page.getByTestId(`guest-rsvp-status-${guestSlug}`)).toHaveText(
      "Not responded",
    );
    await openGuestDetail(page, displayName);
    const invitationUrl = await getInvitationUrlFromGuestDetail(
      page,
      displayName,
    );

    await page.goto(invitationUrl);
    await expect(page.getByText("Current RSVP: Not responded")).toBeVisible();
    await page.getByLabel("Yes, I will attend").check();
    await page.getByLabel("Note to host").fill("Looking forward to it.");
    await page.getByRole("button", { name: "Save RSVP" }).click();

    await expect(page).toHaveURL(/\/rsvp-yes\?rsvpSaved=1$/);
    await expect(page.getByText("Your RSVP has been saved.")).toBeVisible();
    await expect(page.getByText("Current RSVP: Yes")).toBeVisible();
    await expect(page.getByText("Looking forward to it.")).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(/\/rsvp-yes\?rsvpSaved=1$/);
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
    await page.goto("/admin?tab=guests");
    await expect(page.getByTestId(`guest-rsvp-status-${guestSlug}`)).toHaveText(
      "Yes",
    );
    await openGuestDetail(page, displayName);
    await expect(page.getByTestId(`guest-rsvp-note-${guestSlug}`)).toHaveText(
      "Looking forward to it.",
    );

    await page.goto(invitationUrl);
    await page.getByLabel("No, I cannot attend").check();
    await page.getByLabel("Note to host").fill("Plans changed.");
    await page.getByRole("button", { name: "Save RSVP" }).click();
    await expect(page).toHaveURL(/\/i\/[^/]+\/[^/]+\?rsvpSaved=1$/);
    await expect(page.getByText("So sorry you can't make it")).toBeVisible();
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
    await page.goto("/admin?tab=guests");
    await expect(page.getByTestId(`guest-rsvp-status-${guestSlug}`)).toHaveText(
      "No",
    );
    await openGuestDetail(page, displayName);
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

  test("regenerates and revokes Invitation URLs without losing RSVP state", async ({
    page,
  }) => {
    const displayName = `Lifecycle Guest ${Date.now()}`;

    await page.goto("/admin/login");
    await page.getByLabel("Password").fill("test-admin-password");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.getByRole("tab", { name: "Guest list" }).click();
    await page.locator("#newGuestDisplayName").fill(displayName);
    await page.getByRole("button", { name: "Create Guest" }).click();
    await expect(page.getByText("The Invitation URL is ready")).toBeVisible();

    await openGuestDetail(page, displayName);
    const guestDetailUrl = page.url();
    const oldInvitationUrl = await getInvitationUrlFromGuestDetail(
      page,
      displayName,
    );
    const guestSlug = new URL(oldInvitationUrl).pathname.split("/")[2];

    await page.goto(oldInvitationUrl);
    await page.getByLabel("Yes, I will attend").check();
    await page.getByLabel("Note to host").fill("Please save this note.");
    await page.getByRole("button", { name: "Save RSVP" }).click();
    await expect(page).toHaveURL(/\/rsvp-yes\?rsvpSaved=1$/);
    await expect(page.getByText("Current RSVP: Yes")).toBeVisible();

    await page.goto("/admin?tab=guests");
    const guestRow = page.getByTestId(`guest-row-${guestSlug}`);
    await expect(
      guestRow.getByTestId(`guest-rsvp-status-${guestSlug}`),
    ).toHaveText("Yes");
    await openGuestDetail(page, displayName);
    await expect(page.getByTestId(`guest-rsvp-note-${guestSlug}`)).toHaveText(
      "Please save this note.",
    );

    await page
      .getByRole("button", { name: "Regenerate Invitation URL" })
      .click();
    await expect(
      page.getByText("The previous Invitation URL is no longer active."),
    ).toBeVisible();
    const newInvitationUrl = await getInvitationUrlFromGuestDetail(
      page,
      displayName,
    );

    expect(newInvitationUrl).not.toBe(oldInvitationUrl);
    expect(newInvitationUrl).toMatch(/\/i\/lifecycle-guest-/);

    await page.goto(oldInvitationUrl);
    await expect(page.getByText("Invitation unavailable")).toBeVisible();
    await expect(page.getByText(displayName)).toHaveCount(0);
    await expect(page.getByText("Party details")).toHaveCount(0);
    await expect(page.getByText("Current RSVP")).toHaveCount(0);

    await page.goto(newInvitationUrl);
    await expect(page).toHaveURL(/\/rsvp-yes$/);
    await expect(page.getByText(`Invitation for ${displayName}`)).toBeVisible();
    await expect(page.getByText("Current RSVP: Yes")).toBeVisible();
    await expect(page.getByText("Please save this note.")).toHaveCount(0);

    await page.goto(guestDetailUrl);
    await page.getByRole("button", { name: "Revoke Invitation" }).click();
    await expect(
      page.getByText("The Invitation URL is no longer active."),
    ).toBeVisible();
    await page.goto("/admin?tab=guests");
    const revokedGuestRow = page.getByTestId(`guest-row-${guestSlug}`);
    await expect(revokedGuestRow).toBeVisible();
    await openGuestDetail(page, displayName);
    await expect(
      page.getByText(
        "Regenerate this Guest's Invitation URL to restore access.",
      ),
    ).toBeVisible();
    await expect(page.getByTestId(`guest-rsvp-status-${guestSlug}`)).toHaveText(
      "Yes",
    );
    await expect(page.getByTestId(`guest-rsvp-note-${guestSlug}`)).toHaveText(
      "Please save this note.",
    );
    await expect(
      page.getByRole("button", { name: "Revoke Invitation" }),
    ).toHaveCount(0);

    await page.goto(newInvitationUrl);
    await expect(
      page.getByText("This invitation link is no longer active."),
    ).toBeVisible();
    await expect(page.getByText(displayName)).toHaveCount(0);
    await expect(page.getByText("Party details")).toHaveCount(0);
    await expect(page.getByText("Current RSVP")).toHaveCount(0);
  });

  test("gates Confirmed Party Info and shows a sorted names-only Attendee List", async ({
    page,
  }) => {
    const runId = Date.now();
    const confirmedInfo = `Confirmed details ${runId}`;
    const privateNote = `Private RSVP note ${runId}`;

    const createGuest = async (displayName: string) => {
      await page.goto("/admin?tab=guests");
      await page.locator("#newGuestDisplayName").fill(displayName);
      await page.getByRole("button", { name: "Create Guest" }).click();
      await expect(page.getByText("The Invitation URL is ready")).toBeVisible();

      await openGuestDetail(page, displayName);
      return getInvitationUrlFromGuestDetail(page, displayName);
    };

    const submitResponse = async (
      invitationUrl: string,
      answer: "Yes, I will attend" | "No, I cannot attend",
      note = "",
    ) => {
      await page.goto(invitationUrl);
      await page.getByLabel(answer).check();
      await page.getByLabel("Note to host").fill(note);
      await page.getByRole("button", { name: "Save RSVP" }).click();
      await expect(page.getByText("Your RSVP has been saved.")).toBeVisible();
      if (answer === "Yes, I will attend") {
        await expect(page).toHaveURL(/\/rsvp-yes\?rsvpSaved=1$/);
      } else {
        await expect(page).toHaveURL(/\/i\/[^/]+\/[^/]+\?rsvpSaved=1$/);
      }
    };

    await page.goto("/admin/login");
    await page.getByLabel("Password").fill("test-admin-password");
    await page.getByRole("button", { name: "Log in" }).click();

    await page.getByRole("tab", { name: "Party settings" }).click();
    await page.getByLabel("Title").fill(`Confirmed List Party ${runId}`);
    await page.getByLabel("Date and time").fill("2026-08-15T18:00");
    await page
      .getByLabel("Location and logistics")
      .fill("Stockholm, details shared privately.");
    await page.getByLabel("Dress code").fill("Summer formal");
    await page
      .getByLabel("Public Party Info")
      .fill("Public details before RSVP.");
    await page.getByLabel("Confirmed Party Info").fill(confirmedInfo);
    await page.getByLabel("Late Response Policy").selectOption("accept_late");
    await page.getByRole("button", { name: "Save Party Settings" }).click();
    await expect(page.getByText("Party Settings saved.")).toBeVisible();

    const adaName = `Ada Confirmed ${runId}`;
    const monaName = `Mona Confirmed ${runId}`;
    const zeldaName = `Zelda Confirmed ${runId}`;
    const nedName = `Ned Declined ${runId}`;
    const graceName = `Grace Waiting ${runId}`;

    const adaUrl = await createGuest(adaName);
    const monaUrl = await createGuest(monaName);
    const zeldaUrl = await createGuest(zeldaName);
    const nedUrl = await createGuest(nedName);
    const graceUrl = await createGuest(graceName);

    await submitResponse(zeldaUrl, "Yes, I will attend");
    await submitResponse(adaUrl, "Yes, I will attend", privateNote);
    await submitResponse(monaUrl, "Yes, I will attend");
    await submitResponse(nedUrl, "No, I cannot attend");

    await page.goto(graceUrl);
    await expect(page.getByText("Current RSVP: Not responded")).toBeVisible();
    await expect(page.getByText(confirmedInfo)).toHaveCount(0);
    await expect(page.getByTestId("attendee-list")).toHaveCount(0);

    await page.goto(nedUrl);
    await expect(page.getByText("Current RSVP: No")).toBeVisible();
    await expect(page.getByText("So sorry you can't make it")).toBeVisible();
    await expect(page.getByText(confirmedInfo)).toHaveCount(0);
    await expect(page.getByTestId("attendee-list")).toHaveCount(0);

    await page.goto(adaUrl);
    await expect(page.getByText(confirmedInfo)).toBeVisible();
    const attendeeItems = page.getByTestId("attendee-list").locator("li");
    const attendeeByName = (name: string) =>
      page.getByTestId("attendee-list").locator("li").filter({ hasText: name });
    await expect(attendeeByName(adaName)).toHaveText(adaName);
    await expect(attendeeByName(monaName)).toHaveText(monaName);
    await expect(attendeeByName(zeldaName)).toHaveText(zeldaName);
    await expect(page.getByText(privateNote)).toHaveCount(0);

    const attendeeNames = await attendeeItems.allInnerTexts();
    expect(attendeeNames.indexOf(adaName)).toBeLessThan(
      attendeeNames.indexOf(monaName),
    );
    expect(attendeeNames.indexOf(monaName)).toBeLessThan(
      attendeeNames.indexOf(zeldaName),
    );

    await submitResponse(adaUrl, "No, I cannot attend");

    await page.goto(monaUrl);
    await expect(page.getByText(confirmedInfo)).toBeVisible();
    await expect(attendeeByName(adaName)).toHaveCount(0);
    await expect(attendeeByName(monaName)).toHaveText(monaName);
    await expect(attendeeByName(zeldaName)).toHaveText(zeldaName);
  });
});
