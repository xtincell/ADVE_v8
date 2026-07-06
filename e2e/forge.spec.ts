import { expect, test } from "@playwright/test";

// Tranche S9 (cahier §5.2) : forge d'assets déterministe — composition depuis le
// socle déclaré uniquement (les manques sont des trous explicites), lifecycle
// DRAFT → ACTIVE → SUPERSEDED/ARCHIVED, péremption staleAt quand l'ADVE bouge,
// édition manuelle (manual-first).

async function loginFounder(page: import("@playwright/test").Page) {
  await page.goto("/connexion");
  await page.getByLabel("Email").fill("fondateur@demo.test");
  await page.getByLabel("Mot de passe").fill("demo1234");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/cockpit$/);
}

test.describe("Forge & vault d'assets", () => {
  test("forge → activation → péremption quand l'ADVE bouge → édition manuelle", async ({ page }) => {
    await loginFounder(page);
    await page.goto("/cockpit/livrables");
    await expect(page.getByRole("heading", { name: "Forge & vault d'assets" })).toBeVisible();

    // ── Forge d'une plateforme de positionnement (composition déterministe)
    await page.getByLabel("Livrable").selectOption("POSITIONING");
    await page.getByRole("button", { name: "Forger" }).click();
    await expect(page).toHaveURL(/\/cockpit\/livrables\/asset\/[a-z0-9]+$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Plateforme de positionnement — Nyama Café" })).toBeVisible();
    await expect(page.getByText("Brouillon")).toBeVisible();
    await expect(page.getByText("composition déterministe")).toBeVisible();
    // Le déclaré est cité tel quel…
    await expect(page.getByText(/Le café de spécialité 100 % africain/).first()).toBeVisible();
    // …et le manquant est un trou EXPLICITE (personas vide chez Nyama), jamais une invention.
    await expect(page.getByText(/\[À compléter : le champ « Personas »/).first()).toBeVisible();

    // ── Activation : l'asset devient la référence du vault
    await page.getByRole("button", { name: "Activer cet asset" }).click();
    await expect(page.getByText("Actif", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Activer cet asset" })).toHaveCount(0);
    const assetUrl = page.url();

    // ── L'ADVE bouge → l'asset ACTIF se périme (staleAt posé par amendPillar)
    await page.goto("/cockpit/marque/authenticite");
    const histoire = page.locator("#AUTHENTICITE-histoire");
    await histoire.fill(
      `Nyama Café torréfie à Dakar des cafés d'Afrique de l'Ouest et de l'Est, née du refus de voir le continent exporter son café vert pour racheter du soluble importé. Amendement forge ${Date.now()}.`,
    );
    await histoire.locator("..").getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText(/Enregistré — pilier \d+\/25, marque \d+\/200/).first()).toBeVisible();

    await page.goto(assetUrl);
    await expect(page.getByText("Périmé").first()).toBeVisible();
    await expect(page.getByText(/Le socle ADVE a bougé depuis la composition/)).toBeVisible();

    // ── Édition manuelle (manual-first) : le trou se comble à la main
    const personas = "Urbains dakarois 25-40 ans, exigeants sur l'origine et prêts à payer la qualité.";
    await page.locator("#text-2").fill(personas);
    await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
    await expect(page.getByText(personas).first()).toBeVisible();

    // ── Vault : la ligne porte l'état complet (Actif + Périmé)
    await page.goto("/cockpit/livrables");
    const row = page.locator("li").filter({ hasText: "Plateforme de positionnement — Nyama Café" }).first();
    await expect(row.getByText("Actif")).toBeVisible();
    await expect(row.getByText("Périmé")).toBeVisible();
  });

  test("brief créatif : l'objectif est exigé et porté par le livrable", async ({ page }) => {
    await loginFounder(page);
    await page.goto("/cockpit/livrables");

    await page.getByLabel("Livrable").selectOption("CREATIVE_BRIEF");
    await page.getByLabel("Objectif de la campagne *").fill("Lancement origine Éthiopie");
    await page.getByRole("button", { name: "Forger" }).click();
    await expect(page).toHaveURL(/\/cockpit\/livrables\/asset\/[a-z0-9]+$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Brief créatif — Lancement origine Éthiopie" })).toBeVisible();
    // Le brief rappelle la promesse déclarée et n'invente rien
    await expect(page.getByText(/Le meilleur café que tu aies bu/).first()).toBeVisible();
    await expect(page.getByText("Ne jamais employer de vocabulaire technique interne").first()).toBeVisible();
  });
});
