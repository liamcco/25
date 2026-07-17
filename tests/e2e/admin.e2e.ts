import { expect, type Page, test } from "@playwright/test";

async function openGuestDetail(page: Page, displayName: string) {
  await page
    .getByRole("link", {
      name: `Öppna gästdetaljer för ${displayName}`,
    })
    .click();
}

async function getInvitationUrlFromGuestDetail(
  page: Page,
  displayName: string,
) {
  return page
    .getByRole("textbox", {
      name: `Inbjudningslänk för ${displayName}`,
    })
    .inputValue();
}

test.describe("Adminvy", () => {
  test.describe.configure({
    mode: "serial",
  });

  test.skip(
    !process.env.DATABASE_URL,
    "Adminens webbläsartester kräver DATABASE_URL för appen som körs.",
  );

  test("blockerar obehörig åtkomst, loggar in och sparar festinställningar", async ({
    page,
  }) => {
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByText("Admininloggning")).toBeVisible();

    await page.getByLabel("Lösenord").fill("test-admin-password");
    await page
      .getByRole("button", {
        name: "Logga in",
      })
      .click();

    await expect(page).toHaveURL(/\/admin$/);
    await page
      .getByRole("tab", {
        name: "Festinställningar",
      })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Festinställningar",
      }),
    ).toBeVisible();

    await page.getByLabel("Titel").fill("Liam's 25th");
    await page.getByLabel("Datum och tid").fill("2026-08-15T18:00");
    await page
      .getByLabel("Plats och praktisk info")
      .fill("Stockholm, detaljer delas privat.");
    await page.getByLabel("Klädkod").fill("Sommarfin");
    await page
      .getByLabel("Öppen festinfo")
      .fill("Svara gärna före sista svarsdatum.");
    await page
      .getByLabel("Hemlig information")
      .fill("Portkod och spellistedetaljer.");
    await page.getByLabel("Policy för sena svar").selectOption("accept_late");
    await page
      .getByRole("button", {
        name: "Spara festinställningar",
      })
      .click();

    await expect(
      page.getByText("Festinställningarna har sparats."),
    ).toBeVisible();

    await page.reload();

    await expect(page.getByLabel("Titel")).toHaveValue("Liam's 25th");
    await expect(page.getByLabel("Plats och praktisk info")).toHaveValue(
      "Stockholm, detaljer delas privat.",
    );
    await expect(page.getByLabel("Policy för sena svar")).toHaveValue(
      "accept_late",
    );
  });

  test("skapar en gäst och visar den kanoniska inbjudningslänken", async ({
    page,
  }) => {
    const displayName = `Anna Andersson ${Date.now()}`;
    const editedName = `Greta Holm ${Date.now()}`;

    await page.goto("/admin/login");
    await page.getByLabel("Lösenord").fill("test-admin-password");
    await page
      .getByRole("button", {
        name: "Logga in",
      })
      .click();

    await page
      .getByRole("tab", {
        name: "Gästlista",
      })
      .click();
    await page.locator("#newGuestDisplayName").fill(displayName);
    await page
      .getByRole("button", {
        name: "Skapa gäst",
      })
      .click();

    await expect(page.getByText("Inbjudningslänken är redo")).toBeVisible();
    let invitationSentCheckbox = page.getByRole("checkbox", {
      name: `Inbjudan skickad till ${displayName}`,
    });
    await expect(invitationSentCheckbox).not.toBeChecked();
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes("/admin"),
      ),
      invitationSentCheckbox.check(),
    ]);
    await page.reload();
    invitationSentCheckbox = page.getByRole("checkbox", {
      name: `Inbjudan skickad till ${displayName}`,
    });
    await expect(invitationSentCheckbox).toBeChecked();
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes("/admin"),
      ),
      invitationSentCheckbox.uncheck(),
    ]);
    await page.reload();
    await expect(
      page.getByRole("checkbox", {
        name: `Inbjudan skickad till ${displayName}`,
      }),
    ).not.toBeChecked();
    await openGuestDetail(page, displayName);
    const guestDetailUrl = page.url();
    const invitationUrl = await getInvitationUrlFromGuestDetail(
      page,
      displayName,
    );
    expect(invitationUrl).toMatch(/\/i\/anna-andersson-/);

    await page.goto(invitationUrl);
    await expect(page.getByText(`Inbjudan till ${displayName}`)).toBeVisible();

    await page.goto(guestDetailUrl);
    const displayNameInput = page.locator('input[name="displayName"]');
    await displayNameInput.fill(editedName);
    await page
      .getByRole("button", {
        name: "Spara gäst",
      })
      .click();

    await expect(
      page.getByText("Den kanoniska inbjudningslänken har uppdaterats."),
    ).toBeVisible();
    const editedInvitationUrl = await getInvitationUrlFromGuestDetail(
      page,
      editedName,
    );

    expect(editedInvitationUrl).toMatch(/\/i\/greta-holm-/);
    expect(editedInvitationUrl).toContain(
      invitationUrl.split("/").at(-1) ?? "",
    );

    const staleSlugUrl = editedInvitationUrl.replace(
      /\/i\/[^/]+\//,
      "/i/wrong-slug/",
    );
    await page.goto(staleSlugUrl);
    await expect(page).toHaveURL(editedInvitationUrl);
    await expect(page.getByText(`Inbjudan till ${editedName}`)).toBeVisible();

    await page.goto(`/i/${displayName.toLowerCase()}/not-a-real-token`);
    await expect(page.getByText("Inbjudan är inte tillgänglig")).toBeVisible();
    await expect(page.getByText(editedName)).toHaveCount(0);
  });

  test("följer gästens OSA-flöde och adminens svarssammanfattning", async ({
    page,
  }) => {
    const displayName = `OSA-gäst ${Date.now()}`;
    const guestSlug = displayName.toLowerCase().replace(/\s+/g, "-");
    const getCount = async (name: string) =>
      Number(await page.getByTestId(`response-count-${name}`).innerText());

    await page.goto("/admin/login");
    await page.getByLabel("Lösenord").fill("test-admin-password");
    await page
      .getByRole("button", {
        name: "Logga in",
      })
      .click();

    const initialCounts = {
      totalGuests: await getCount("total-guests"),
      notResponded: await getCount("not-responded"),
      yes: await getCount("yes"),
      yesLate: await getCount("yes-late"),
      no: await getCount("no"),
    };

    await page
      .getByRole("tab", {
        name: "Gästlista",
      })
      .click();
    await page.locator("#newGuestDisplayName").fill(displayName);
    await page
      .getByRole("button", {
        name: "Skapa gäst",
      })
      .click();

    await page.goto("/admin");
    await expect(page.getByTestId("response-count-total-guests")).toHaveText(
      String(initialCounts.totalGuests + 1),
    );
    await expect(page.getByTestId("response-count-not-responded")).toHaveText(
      String(initialCounts.notResponded + 1),
    );
    await page.goto("/admin?tab=guests");
    await expect(page.getByTestId(`guest-rsvp-status-${guestSlug}`)).toHaveText(
      "Inte svarat",
    );
    await openGuestDetail(page, displayName);
    const invitationUrl = await getInvitationUrlFromGuestDetail(
      page,
      displayName,
    );

    await page.goto(invitationUrl);
    await expect(page.getByText("Nuvarande svar: Inte svarat")).toBeVisible();
    await page.getByLabel("Ja, jag kommer").check();
    await page.getByLabel("Meddelande till värden").fill("Ser fram emot det.");
    await page
      .getByRole("button", {
        name: "Spara svar",
      })
      .click();

    await expect(page).toHaveURL(/\/rsvp-yes\?rsvpSaved=1$/);
    await expect(page.getByText("Ditt svar sparades!")).toBeVisible();
    await expect(page.getByText("Du står på listan")).toBeVisible();
    await expect(page.getByText("Ser fram emot det.")).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(/\/rsvp-yes\?rsvpSaved=1$/);
    await expect(page.getByText("Du står på listan")).toBeVisible();

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
      "Ja",
    );
    await openGuestDetail(page, displayName);
    await expect(page.getByTestId(`guest-rsvp-note-${guestSlug}`)).toHaveText(
      "Ser fram emot det.",
    );

    await page.goto(invitationUrl);
    await page
      .getByRole("tab", {
        name: "Gästlista",
      })
      .click();
    await page
      .getByRole("button", {
        name: `Ändra svar för ${displayName}`,
      })
      .click();
    await page
      .getByRole("button", {
        name: "Jag är säker",
      })
      .click();
    await expect(page).toHaveURL(/\/i\/[^/]+\/[^/]+\?rsvpSaved=1$/);
    await expect(page.getByText("Ditt svar sparades!")).toBeVisible();
    await expect(
      page.getByText("Så tråkigt att du inte kan komma."),
    ).toBeVisible();
    await expect(page.getByText("Nuvarande svar: Nej")).toBeVisible();

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
      "Nej",
    );
    await openGuestDetail(page, displayName);
    await expect(page.getByText("Inget OSA-meddelande ännu.")).toBeVisible();
    await expect(
      page
        .getByRole("button", {
          name: "Spara gäst",
        })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Spara svar",
      }),
    ).toHaveCount(0);
  });

  test("skapar om och återkallar inbjudningslänkar utan att tappa OSA-status", async ({
    page,
  }) => {
    const displayName = `Livscykelgäst ${Date.now()}`;

    await page.goto("/admin/login");
    await page.getByLabel("Lösenord").fill("test-admin-password");
    await page
      .getByRole("button", {
        name: "Logga in",
      })
      .click();

    await page
      .getByRole("tab", {
        name: "Gästlista",
      })
      .click();
    await page.locator("#newGuestDisplayName").fill(displayName);
    await page
      .getByRole("button", {
        name: "Skapa gäst",
      })
      .click();
    await expect(page.getByText("Inbjudningslänken är redo")).toBeVisible();

    await openGuestDetail(page, displayName);
    const guestDetailUrl = page.url();
    const oldInvitationUrl = await getInvitationUrlFromGuestDetail(
      page,
      displayName,
    );
    const guestSlug = new URL(oldInvitationUrl).pathname.split("/")[2];

    await page.goto(oldInvitationUrl);
    await page.getByLabel("Ja, jag kommer").check();
    await page
      .getByLabel("Meddelande till värden")
      .fill("Spara gärna det här meddelandet.");
    await page
      .getByRole("button", {
        name: "Spara svar",
      })
      .click();
    await expect(page).toHaveURL(/\/rsvp-yes\?rsvpSaved=1$/);
    await expect(page.getByText("Du står på listan")).toBeVisible();

    await page.goto("/admin?tab=guests");
    const guestRow = page.getByTestId(`guest-row-${guestSlug}`);
    await expect(
      guestRow.getByTestId(`guest-rsvp-status-${guestSlug}`),
    ).toHaveText("Ja");
    await openGuestDetail(page, displayName);
    await expect(page.getByTestId(`guest-rsvp-note-${guestSlug}`)).toHaveText(
      "Spara gärna det här meddelandet.",
    );

    await page
      .getByRole("button", {
        name: "Skapa ny inbjudningslänk",
      })
      .click();
    await expect(
      page.getByText("Den tidigare inbjudningslänken är inte längre aktiv."),
    ).toBeVisible();
    const newInvitationUrl = await getInvitationUrlFromGuestDetail(
      page,
      displayName,
    );

    expect(newInvitationUrl).not.toBe(oldInvitationUrl);
    expect(newInvitationUrl).toMatch(/\/i\/livscykelgast-/);

    await page.goto(oldInvitationUrl);
    await expect(page.getByText("Inbjudan är inte tillgänglig")).toBeVisible();
    await expect(page.getByText(displayName)).toHaveCount(0);
    await expect(page.getByText("Festdetaljer")).toHaveCount(0);
    await expect(page.getByText("Nuvarande svar")).toHaveCount(0);

    await page.goto(newInvitationUrl);
    await expect(page).toHaveURL(/\/rsvp-yes$/);
    await expect(page.getByText(`Inbjudan till ${displayName}`)).toBeVisible();
    await expect(page.getByText("Du står på listan")).toBeVisible();
    await expect(
      page.getByText("Spara gärna det här meddelandet."),
    ).toHaveCount(0);

    await page.goto(guestDetailUrl);
    await page
      .getByRole("button", {
        name: "Återkalla inbjudan",
      })
      .click();
    await expect(
      page.getByText("Inbjudningslänken är inte längre aktiv."),
    ).toBeVisible();
    await page.goto("/admin?tab=guests");
    const revokedGuestRow = page.getByTestId(`guest-row-${guestSlug}`);
    await expect(revokedGuestRow).toBeVisible();
    await openGuestDetail(page, displayName);
    await expect(
      page.getByText("Skapa ny inbjudningslänk för att återställa åtkomst."),
    ).toBeVisible();
    await expect(page.getByTestId(`guest-rsvp-status-${guestSlug}`)).toHaveText(
      "Ja",
    );
    await expect(page.getByTestId(`guest-rsvp-note-${guestSlug}`)).toHaveText(
      "Spara gärna det här meddelandet.",
    );
    await expect(
      page.getByRole("button", {
        name: "Återkalla inbjudan",
      }),
    ).toHaveCount(0);

    await page.goto(newInvitationUrl);
    await expect(
      page.getByText("Den här inbjudningslänken är inte längre aktiv."),
    ).toBeVisible();
    await expect(page.getByText(displayName)).toHaveCount(0);
    await expect(page.getByText("Festdetaljer")).toHaveCount(0);
    await expect(page.getByText("Nuvarande svar")).toHaveCount(0);
  });

  test("skyddar information för bekräftade gäster och visar en sorterad gästlista med bara namn", async ({
    page,
  }) => {
    const runId = Date.now();
    const confirmedInfo = `Bekräftade detaljer ${runId}`;
    const privateNote = `Privat OSA-meddelande ${runId}`;

    const createGuest = async (displayName: string) => {
      await page.goto("/admin?tab=guests");
      await page.locator("#newGuestDisplayName").fill(displayName);
      await page
        .getByRole("button", {
          name: "Skapa gäst",
        })
        .click();
      await expect(page.getByText("Inbjudningslänken är redo")).toBeVisible();

      await openGuestDetail(page, displayName);
      return getInvitationUrlFromGuestDetail(page, displayName);
    };

    const submitResponse = async (
      invitationUrl: string,
      answer: "Ja, jag kommer" | "Nej, jag kan inte komma",
      note = "",
    ) => {
      await page.goto(invitationUrl);
      await page.getByLabel(answer).check();
      await page.getByLabel("Meddelande till värden").fill(note);
      await page
        .getByRole("button", {
          name: "Spara svar",
        })
        .click();
      await expect(page.getByText("Ditt svar sparades!")).toBeVisible();
      if (answer === "Ja, jag kommer") {
        await expect(page).toHaveURL(/\/rsvp-yes\?rsvpSaved=1$/);
      } else {
        await expect(page).toHaveURL(/\/i\/[^/]+\/[^/]+\?rsvpSaved=1$/);
      }
    };

    await page.goto("/admin/login");
    await page.getByLabel("Lösenord").fill("test-admin-password");
    await page
      .getByRole("button", {
        name: "Logga in",
      })
      .click();

    await page
      .getByRole("tab", {
        name: "Festinställningar",
      })
      .click();
    await page.getByLabel("Titel").fill(`Bekräftad listfest ${runId}`);
    await page.getByLabel("Datum och tid").fill("2026-08-15T18:00");
    await page
      .getByLabel("Plats och praktisk info")
      .fill("Stockholm, detaljer delas privat.");
    await page.getByLabel("Klädkod").fill("Sommarfin");
    await page.getByLabel("Öppen festinfo").fill("Öppen information före OSA.");
    await page.getByLabel("Info för bekräftade gäster").fill(confirmedInfo);
    await page.getByLabel("Policy för sena svar").selectOption("accept_late");
    await page
      .getByRole("button", {
        name: "Spara festinställningar",
      })
      .click();
    await expect(
      page.getByText("Festinställningarna har sparats."),
    ).toBeVisible();

    const adaName = `Anna Bekräftad ${runId}`;
    const monaName = `Mona Bekräftad ${runId}`;
    const zeldaName = `Zelda Bekräftad ${runId}`;
    const nedName = `Nils Nekad ${runId}`;
    const graceName = `Greta Väntar ${runId}`;

    const adaUrl = await createGuest(adaName);
    const monaUrl = await createGuest(monaName);
    const zeldaUrl = await createGuest(zeldaName);
    const nedUrl = await createGuest(nedName);
    const graceUrl = await createGuest(graceName);

    await submitResponse(zeldaUrl, "Ja, jag kommer");
    await submitResponse(adaUrl, "Ja, jag kommer", privateNote);
    await submitResponse(monaUrl, "Ja, jag kommer");
    await submitResponse(nedUrl, "Nej, jag kan inte komma");

    await page.goto(graceUrl);
    await expect(page.getByText("Nuvarande svar: Inte svarat")).toBeVisible();
    await expect(page.getByText(confirmedInfo)).toHaveCount(0);
    await expect(page.getByTestId("attendee-list")).toHaveCount(0);

    await page.goto(nedUrl);
    await expect(page.getByText("Nuvarande svar: Nej")).toBeVisible();
    await expect(
      page.getByText("Så tråkigt att du inte kan komma."),
    ).toBeVisible();
    await expect(page.getByText(confirmedInfo)).toHaveCount(0);
    await expect(page.getByTestId("attendee-list")).toHaveCount(0);

    await page.goto(adaUrl);
    await expect(page.getByText(confirmedInfo)).toBeVisible();
    await page
      .getByRole("tab", {
        name: "Gästlista",
      })
      .click();
    const attendeeItems = page.getByTestId("attendee-list").getByRole("row");
    const attendeeByName = (name: string) =>
      page.getByTestId("attendee-list").getByRole("row").filter({
        hasText: name,
      });
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

    await page.goto(adaUrl);
    await page
      .getByRole("tab", {
        name: "Gästlista",
      })
      .click();
    await page
      .getByRole("button", {
        name: `Ändra svar för ${adaName}`,
      })
      .click();
    await page
      .getByRole("button", {
        name: "Jag är säker",
      })
      .click();
    await expect(page).toHaveURL(/\/i\/[^/]+\/[^/]+\?rsvpSaved=1$/);

    await page.goto(monaUrl);
    await expect(page.getByText(confirmedInfo)).toBeVisible();
    await page
      .getByRole("tab", {
        name: "Gästlista",
      })
      .click();
    await expect(attendeeByName(adaName)).toHaveCount(0);
    await expect(attendeeByName(monaName)).toHaveText(monaName);
    await expect(attendeeByName(zeldaName)).toHaveText(zeldaName);
  });
});
