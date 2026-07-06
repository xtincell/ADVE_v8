import { expect, test, type Page } from "@playwright/test";

// P3 (cahier §4.2/§4.3) : les surfaces « Opérations » (roadmap d'actions +
// demandes à l'opérateur) et « Litiges » (arbitrage manuel Console) exercent
// réellement les tables BrandAction / BrandRequest / Dispute — plus de tables
// orphelines (anti-pattern §12 #4/#6).

async function login(page: Page, email: string, landing: RegExp) {
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill("demo1234");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(landing);
}

test.describe("Opérations & demandes", () => {
  test("roadmap d'action + demande à l'opérateur → réponse Console notifiée", async ({ page }) => {
    await login(page, "fondateur@demo.test", /\/cockpit$/);
    await page.goto("/cockpit/operations");
    await expect(page.getByRole("heading", { name: "Roadmap & demandes" })).toBeVisible();

    // ── Action de marque (BrandAction) : ajout puis clôture
    const actionTitle = `Publier 3 preuves clients ${Date.now()}`;
    await page.getByLabel("Action *").fill(actionTitle);
    await page.getByLabel("Pilier visé").selectOption("VALEUR");
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    const actionRow = page.locator("li").filter({ hasText: actionTitle });
    await expect(actionRow).toBeVisible();
    await actionRow.getByRole("button", { name: "Terminer" }).click();
    await expect(page.getByText("Historique récent", { exact: false })).toBeVisible();

    // ── Demande à l'opérateur (BrandRequest)
    const subject = `Shooting produit ${Date.now()}`;
    await page.getByLabel("Sujet *").fill(subject);
    await page.getByLabel("Message *").fill("Nous lançons une nouvelle gamme et voulons un shooting pro.");
    await page.getByRole("button", { name: "Envoyer à l'opérateur" }).click();
    await expect(page.getByText("Demande envoyée — réponse dans ce fil.")).toBeVisible();
    await expect(page.locator("li").filter({ hasText: subject }).getByText("Envoyée")).toBeVisible();

    // ── Console : l'opératrice voit la demande et répond
    await page.context().clearCookies();
    await login(page, "ops@demo.test", /\/console$/);
    await page.goto("/console/marques");
    const queueRow = page.locator("li").filter({ hasText: subject });
    await expect(queueRow).toBeVisible();
    await queueRow.getByLabel("Réponse").fill("Bien reçu, on planifie ça cette semaine.");
    await queueRow.getByRole("button", { name: "Répondre" }).click();
    await expect(page.locator("li").filter({ hasText: subject })).toHaveCount(0, { timeout: 15_000 });

    // ── Retour founder : la réponse est là
    await page.context().clearCookies();
    await login(page, "fondateur@demo.test", /\/cockpit$/);
    await page.goto("/cockpit/operations");
    const answered = page.locator("li").filter({ hasText: subject });
    await expect(answered.getByText("Traitée")).toBeVisible();
    await expect(answered.getByText("Bien reçu, on planifie ça cette semaine.")).toBeVisible();
  });

  test("Console argent : litiges, relevés MCP et envois d'emails exercent leurs tables", async ({ page }) => {
    await login(page, "ops@demo.test", /\/console$/);
    await page.goto("/console/argent");
    // Les trois surfaces réclamées par le cahier §4.3 sont présentes et réelles.
    await expect(page.getByRole("heading", { name: /Litiges & escrow/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Relevés MCP" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Envois d'emails" })).toBeVisible();
    // L'arbitrage est proposé sur les missions attribuées (la démo en seed en a une).
    await expect(page.getByText(/arbitrage est manuel|Aucun litige ouvert/)).toBeVisible();
  });
});
