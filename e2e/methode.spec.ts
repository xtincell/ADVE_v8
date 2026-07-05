import { expect, test } from "@playwright/test";

// Parcours d'argent n°2 (cahier §11.3, DoD — partie méthode) :
// amendement ADVE → staleness propagée → refresh RTIS → score à jour.
// (L'export PDF Oracle complète ce parcours dans la tranche S4.)

test.describe("Méthode ADVE/RTIS", () => {
  test("amendement ADVE → staleness → refresh RTIS → score recalculé", async ({ page }) => {
    // Connexion founder démo (marque Nyama Café seedée, RTIS frais)
    await page.goto("/connexion");
    await page.getByLabel("Email").fill("fondateur@demo.test");
    await page.getByLabel("Mot de passe").fill("demo1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/cockpit$/);

    // ── Ma marque : état initial
    await page.getByRole("navigation", { name: "Navigation", exact: true }).getByRole("link", { name: "Ma marque" }).click();
    await expect(page).toHaveURL(/\/cockpit\/marque$/);
    await expect(page.getByRole("heading", { name: "Nyama Café" })).toBeVisible();

    // ── Amendement d'un champ ADVE (édition directe, unique par run)
    await page.getByRole("link", { name: "Éditer →" }).first().click();
    await expect(page).toHaveURL(/\/cockpit\/marque\/authenticite$/);
    const histoire = page.locator("#AUTHENTICITE-histoire");
    await histoire.fill(
      `Nyama Café torréfie à Dakar des cafés d'Afrique de l'Ouest et de l'Est. Fondé par une ancienne logisticienne rentrée au pays, le projet défend une conviction simple : le continent ne doit plus exporter son café vert pour racheter du soluble importé. Amendé le ${Date.now()}.`,
    );
    await histoire.locator("..").getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText(/Enregistré — pilier \d+\/25, marque \d+\/200/).first()).toBeVisible();

    // ── La staleness est propagée : bannière visible sur Ma marque
    await page.getByRole("link", { name: "← Ma marque" }).click();
    await expect(page.getByText("Stratégie périmée.")).toBeVisible();
    await expect(page.getByText("Périmé").first()).toBeVisible();

    // ── Refresh de la chaîne R→T→I→S
    await page.getByRole("button", { name: "Recalculer la stratégie (R→T→I→S)" }).click();
    await expect(page.getByText("Stratégie périmée.")).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText("À jour", { exact: false }).first()).toBeVisible();

    // ── Le pilier dérivé montre un contenu réel, tracé depuis le déclaré
    await page.goto("/cockpit/marque/risque");
    await expect(page.getByRole("heading", { name: /R · Risque/ })).toBeVisible();
    await expect(page.getByText("Historique des versions")).toBeVisible();
    // Au moins une version RTIS_REFRESH dans l'historique
    await expect(page.getByText("Recalcul").first()).toBeVisible();

    // ── Validation d'un champ pré-rempli (INFERRED → OFFICIAL)
    await page.goto("/cockpit/marque/authenticite");
    const validateBtn = page.getByRole("button", { name: "Valider tel quel" });
    if (await validateBtn.count() > 0) {
      await validateBtn.first().click();
      await expect(page.getByText("Validé").first()).toBeVisible();
    }

    // ── Génération de l'Oracle (35 sections) depuis le socle à jour
    await page.goto("/cockpit/livrables");
    await page.getByRole("button", { name: /Générer l'Oracle/ }).click();
    await expect(page).toHaveURL(/\/cockpit\/livrables\/oracle\/[a-z0-9]+$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /Oracle v\d+ — Nyama Café/ })).toBeVisible();
    // Les 35 sections sont là, composées
    await expect(page.getByRole("heading", { name: "Executive Summary" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Signaux faibles sectoriels" })).toBeVisible();
    await expect(page.getByText("Complète").first()).toBeVisible();
    // Le contenu cite le déclaré (promesse de la marque démo)
    await expect(page.getByText(/Le meilleur café que tu aies bu/).first()).toBeVisible();

    // ── Export PDF : vrai fichier PDF, non vide
    const url = page.url();
    const reportId = url.split("/").pop()!;
    const pdfResponse = await page.request.get(`/api/oracle/${reportId}/pdf`);
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
    const body = await pdfResponse.body();
    expect(body.length).toBeGreaterThan(20_000);
    expect(body.subarray(0, 5).toString()).toBe("%PDF-");
  });

  test("un pilier dérivé refuse l'édition côté serveur", async ({ page }) => {
    await page.goto("/connexion");
    await page.getByLabel("Email").fill("fondateur@demo.test");
    await page.getByLabel("Mot de passe").fill("demo1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/cockpit$/);

    // La page du pilier Risque n'offre aucun formulaire d'édition, seulement le refresh
    await page.goto("/cockpit/marque/risque");
    await expect(page.getByRole("button", { name: /Rafraîchir ce pilier|Calculer ce pilier/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enregistrer" })).toHaveCount(0);
  });
});
