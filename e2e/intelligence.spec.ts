import { expect, test } from "@playwright/test";

// Tranche S9 (cahier §4.2, §8) : l'Intelligence est gated abonnement — refus
// STRUCTURÉ (TIER_GATE_DENIED + upgrade path), jamais une exception. Derrière le
// gate : recensement communauté manual-first, mesures honnêtes (Cult Index,
// radar par axe avec états), veille réelle + saisie terrain.

test.describe("Cockpit Intelligence", () => {
  test("sans abonnement : refus structuré TIER_GATE_DENIED avec upgrade path", async ({ page }) => {
    // Fodé (seedé) n'a ni abonnement ni paiement en attente.
    await page.goto("/connexion");
    await page.getByLabel("Email").fill("gratuit@demo.test");
    await page.getByLabel("Mot de passe").fill("demo1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/cockpit$/);

    await page.goto("/cockpit/intelligence");
    await expect(page.getByText("TIER_GATE_DENIED")).toBeVisible();
    await expect(page.getByRole("heading", { name: "L'Intelligence fait partie du Cockpit" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Activer l'abonnement Cockpit" })).toHaveAttribute(
      "href",
      "/cockpit/abonnement",
    );
    // Rien ne fuit sous le gate : ni tuiles de mesure, ni formulaire de recensement.
    await expect(page.getByText("Membres recensés")).toHaveCount(0);
    await expect(page.getByLabel("Nom *")).toHaveCount(0);
  });

  test("recensement communauté → superfans, Cult Index, radar et snapshots", async ({ page }) => {
    // Fondateur démo : abonnement ACTIVE seedé, 15 membres recensés.
    await page.goto("/connexion");
    await page.getByLabel("Email").fill("fondateur@demo.test");
    await page.getByLabel("Mot de passe").fill("demo1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/cockpit$/);

    await page.goto("/cockpit/intelligence");
    await expect(page.getByRole("heading", { name: "Communauté & position culturelle" })).toBeVisible();

    // Mesures de tête : le compte de superfans est lu avant mutation (assertion relative,
    // le spec reste vrai même hors reset DB).
    const superfansTile = page
      .getByText("Superfans (Ambassadeur + Évangéliste)")
      .locator("xpath=following-sibling::p[1]");
    const before = Number(await superfansTile.textContent());

    // Ajout d'une évangéliste → snapshot n°1
    const evangeliste = `Awa E2E ${Date.now()}`;
    await page.getByLabel("Nom *").fill(evangeliste);
    await page.getByLabel("Échelon *").selectOption("EVANGELISTE");
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    const memberRow = page.locator("li").filter({ hasText: evangeliste });
    await expect(memberRow).toHaveCount(1);
    await expect(memberRow.getByText("Superfan")).toBeVisible();
    await expect(superfansTile).toHaveText(String(before + 1));

    // Ajout d'un spectateur → snapshot n°2 → la trajectoire du Cult Index apparaît
    await page.getByLabel("Nom *").fill(`Passant E2E ${Date.now()}`);
    await page.getByLabel("Échelon *").selectOption("SPECTATEUR");
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect(page.getByText("Trajectoire du Cult Index")).toBeVisible();

    // Radar Overton : 4 axes paramétriques, chacun porte son état — jamais de valeur fabriquée.
    await expect(page.getByText("Radar de fenêtre culturelle (heuristique)")).toBeVisible();
    for (const axis of ["Visibilité", "Légitimité", "Différenciation", "Conversation"]) {
      await expect(page.getByText(axis, { exact: true })).toBeVisible();
    }
    // Nyama ne déclare pas ses différenciateurs : l'axe Différenciation est calculé
    // mais DEGRADED — quel que soit ce que les autres specs amendent (histoire, rituels).
    const differenciationRow = page.getByText("Différenciation", { exact: true }).locator("..");
    await expect(differenciationRow.getByText("DEGRADED")).toBeVisible();

    // Saisie terrain d'un signal (manual-first — la veille auto passe par le cron)
    const signal = `Un torréfacteur concurrent ouvre à Plateau ${Date.now()}`;
    await page.getByLabel("Signal observé").fill(signal);
    await page.getByRole("button", { name: "Ajouter le signal" }).click();
    const signalRow = page.locator("li").filter({ hasText: signal });
    await expect(signalRow).toHaveCount(1);
    await expect(signalRow.getByText("Terrain")).toBeVisible();
  });
});
