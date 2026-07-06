import { expect, test, type Page } from "@playwright/test";

// Tranche S10 (cahier §4.5) : espaces Creator & Agency volontairement minces.
// Creator : profil (éditable), missions disponibles/candidatures/actives, devis,
// relevé de commissions. Agency : marques clientes + score moyen, missions,
// commissions. Les états vides sont honnêtes, jamais des façades.

async function login(page: Page, email: string, landing: RegExp) {
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill("demo1234");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(landing);
}

test.describe("Espaces Creator & Agency", () => {
  test("Creator : tableau complet §4.5 + édition de profil répercutée", async ({ page }) => {
    await login(page, "talent@demo.test", /\/creator$/);

    // Les quatre blocs du cahier : missions dispo, candidatures (avec devis), actives, commissions
    await expect(page.getByText("Missions ouvertes")).toBeVisible();
    await expect(page.getByText("Mes candidatures")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Missions actives" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Relevé de commissions" })).toBeVisible();
    // La candidature seedée porte son devis structuré (montant en chaîne : U+202F d'Intl)
    await expect(page.getByText("Devis : 450 000 FCFA").first()).toBeVisible();

    // Édition du profil (manual-first) — répercutée sur l'espace
    await page.getByRole("navigation", { name: "Navigation", exact: true }).getByRole("link", { name: "Profil" }).click();
    await expect(page).toHaveURL(/\/creator\/profil$/);
    await expect(page.getByText("Compagnon")).toBeVisible(); // tier arbitré par l'opérateur
    const headline = "Directeur artistique & motion designer — profil vérifié E2E";
    await page.getByLabel("Accroche *").fill(headline);
    await page.getByRole("button", { name: "Enregistrer le profil" }).click();
    await expect(page.getByText("Profil enregistré.")).toBeVisible();
    await page.goto("/creator");
    await expect(page.getByText(headline)).toBeVisible();
  });

  test("Agency : portefeuille, missions et commissions — vides honnêtes", async ({ page }) => {
    await login(page, "agence@demo.test", /\/agency$/);

    await expect(page.getByRole("heading", { name: "Studio Baobab" })).toBeVisible();
    await expect(page.getByText("Marques clientes pilotées")).toBeVisible();
    await expect(page.getByText("Score ADVE moyen du portefeuille")).toBeVisible();

    // Aucune marque rattachée, aucune mission déposée, aucune commission : états explicites
    await expect(page.getByText("Aucune marque cliente rattachée")).toBeVisible();
    await expect(page.getByText("Aucune mission", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Déposer une mission" })).toHaveAttribute("href", "/guilde/deposer");
    await expect(page.getByText("Aucune commission")).toBeVisible();
  });
});
