import { expect, test } from "@playwright/test";

// Tranche X.llm (cahier §9, §3.5.3) : le LLM est OPTIONNEL au runtime. Ce banc
// tourne sans AUCUNE clé provider — les assists IA ne doivent PAS apparaître
// (pas de façade morte), et 100 % du parcours déterministe reste fonctionnel.
// La logique gateway (fallback, retry Zod) est couverte en tests unitaires
// avec fetch simulé ; ici on fige le contrat d'absence honnête.

test.describe("LLM optionnel — absence honnête sans clés", () => {
  test("l'intake ne propose pas de pré-remplissage IA", async ({ page }) => {
    await page.goto("/diagnostic");
    await page.getByRole("button", { name: "Commencer mon diagnostic" }).click();
    await expect(page.getByLabel("Nom de la marque *")).toBeVisible();
    await expect(page.getByText("pré-remplir depuis un texte libre", { exact: false })).toHaveCount(0);
  });

  test("l'éditeur ADVE n'affiche aucun bouton de reformulation IA — l'édition manuelle reste entière", async ({ page }) => {
    await page.goto("/connexion");
    await page.getByLabel("Email").fill("fondateur@demo.test");
    await page.getByLabel("Mot de passe").fill("demo1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/cockpit$/);

    await page.goto("/cockpit/marque/authenticite");
    await expect(page.locator("#AUTHENTICITE-histoire")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reformuler (IA)" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Version stratégique (IA)" })).toHaveCount(0);
    // Le marqueur doctrine reste : les champs non-inférables exigent la saisie humaine.
    await expect(page.getByText("Saisie humaine").first()).toBeVisible();
  });

  test("le dépôt de mission Guilde n'affiche pas d'assist IA", async ({ page }) => {
    await page.goto("/guilde/deposer");
    await expect(page.getByLabel("Titre *")).toBeVisible();
    await expect(page.getByText("Rédiger le brief avec l'IA")).toHaveCount(0);
  });
});
