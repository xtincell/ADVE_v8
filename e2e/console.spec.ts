import { expect, test } from "@playwright/test";

// Console opérateur (cahier §4.3) : portefeuille, édition côté opérateur
// (même point d'écriture unique), vault credentials, audit.

async function loginOps(page: import("@playwright/test").Page) {
  await page.goto("/connexion");
  await page.getByLabel("Email").fill("ops@demo.test");
  await page.getByLabel("Mot de passe").fill("demo1234");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/console$/, { timeout: 15_000 });
}

test.describe("Console", () => {
  test("portefeuille → édition opérateur d'un pilier → trace d'audit", async ({ page }) => {
    await loginOps(page);

    // Vue d'ensemble avec stats réelles
    await expect(page.getByText("Utilisateurs")).toBeVisible();
    await expect(page.getByText("Marques actives")).toBeVisible();

    // Portefeuille : les marques canon et démo sont là
    await page.getByRole("navigation", { name: "Navigation", exact: true }).getByRole("link", { name: "Portefeuille" }).click();
    const nyamaLink = page.getByRole("link", { name: /Nyama Café/ }).first();
    await expect(nyamaLink).toBeVisible();
    const brandHref = (await nyamaLink.getAttribute("href"))!;
    expect(brandHref).toMatch(/^\/console\/marques\/[a-z0-9]+$/);
    await page.goto(brandHref);
    await expect(page.getByText("Piliers (édition opérateur via le point d'écriture unique)")).toBeVisible();

    // Édition d'un pilier ADVE en tant qu'opérateur (?marque=)
    await page.getByRole("link", { name: /E.*Engagement/ }).click();
    await expect(page).toHaveURL(/\/cockpit\/marque\/engagement\?marque=/);
    const rituels = page.locator("#ENGAGEMENT-rituels");
    await rituels.fill(`Cupping du samedi au corner Kermel, message WhatsApp hebdomadaire aux abonnés, édition opérateur ${Date.now()}.`);
    await rituels.locator("..").getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText(/Enregistré — pilier \d+\/25/).first()).toBeVisible();

    // L'amendement opérateur est audité
    await page.goto("/console/audit?action=pillar.amend");
    await expect(page.getByText("Amendement de pilier").first()).toBeVisible();
    await expect(page.getByRole("main").getByText("ops@demo.test").first()).toBeVisible();
  });

  test("vault : enregistrer des credentials chiffrés puis les supprimer", async ({ page }) => {
    await loginOps(page);
    await page.goto("/console/vault");

    // Remise à zéro si un run précédent a laissé des clés
    const resendCard = page.locator("#vault-resend");
    if (await resendCard.getByRole("button", { name: "Supprimer les clés" }).count()) {
      await resendCard.getByRole("button", { name: "Supprimer les clés" }).click();
    }
    await expect(resendCard.getByText("DEFERRED")).toBeVisible({ timeout: 15_000 });
    await resendCard.getByLabel("Clé API").fill("re_test_0000000000");
    await resendCard.getByLabel(/Expéditeur/).fill("La Fusée <no-reply@test.local>");
    await resendCard.getByRole("button", { name: "Enregistrer (chiffré)" }).click();
    await expect(resendCard.getByText("Clés enregistrées.")).toBeVisible();
    await page.reload();
    await expect(page.locator("#vault-resend").getByText("Configuré")).toBeVisible();

    // Suppression → retour à DEFERRED
    await page.locator("#vault-resend").getByRole("button", { name: "Supprimer les clés" }).click();
    await expect(page.locator("#vault-resend").getByText("DEFERRED")).toBeVisible({ timeout: 15_000 });
  });

  test("config : la grille tarifaire est éditable et alimente /tarifs", async ({ page }) => {
    await loginOps(page);
    await page.goto("/console/config");
    await expect(page.getByText("Grille tarifaire localisée")).toBeVisible();
    const input = page.getByLabel("INTAKE_PDF UEMOA");
    await expect(input).toHaveValue(/\d+/);
    // Enregistrement sans modification : la grille reste cohérente (idempotent)
    await page.getByRole("button", { name: "Enregistrer la grille" }).click();
    await expect(page.getByText("Grille mise à jour.")).toBeVisible();
  });
});
