import { expect, test } from "@playwright/test";

// Parcours d'argent (cahier §11.3, DoD) :
// 1. funnel avec paiement test (mock) → rapport PDF débloqué
// 2. abonnement manuel WhatsApp → file de validation Console → gate ouvert

test.describe("Paiements", () => {
  test("achat one-shot INTAKE_PDF via paiement test → PDF téléchargeable", async ({ page }) => {
    const email = `e2e-pay-${Date.now()}@funnel.test`;

    // ── Mini-intake (champs requis seulement — les trous sont un état honnête)
    await page.goto("/diagnostic");
    await page.getByRole("button", { name: "Commencer mon diagnostic" }).click();
    await page.getByLabel("Nom de la marque *").fill("Test Paiement Studio");
    await page.getByLabel("Secteur *").selectOption("Tech & digital");
    await page.getByLabel("Pays *").selectOption("CI");
    await page.getByRole("button", { name: "Continuer" }).click();
    for (let i = 0; i < 4; i++) {
      await page.getByRole("button", { name: "Continuer" }).click();
    }
    await page.getByLabel("Votre email *").fill(email);
    await page.getByRole("button", { name: "Calculer mon score" }).click();
    await expect(page).toHaveURL(/\/resultat$/);
    const token = page.url().split("/diagnostic/")[1]!.split("/")[0]!;

    // ── Paywall → page de paiement localisée (CI → FCFA)
    await page.getByRole("link", { name: "Obtenir le rapport PDF" }).click();
    await expect(page).toHaveURL(new RegExp(`/paiement\\?offre=INTAKE_PDF&token=${token}`));
    await expect(page.getByText("15 000 FCFA")).toBeVisible();

    // ── Les rails sans credentials affichent leur état DEFERRED honnête
    await expect(page.getByText("Bientôt disponible").first()).toBeVisible();
    // Wave est proposé pour la Côte d'Ivoire mais non configuré
    await expect(page.getByText(/Non configuré chez l'opérateur/).first()).toBeVisible();

    // ── Paiement test (mock, dev uniquement) → droit ouvert immédiatement
    await page.getByRole("radio", { name: /Paiement de test/ }).check();
    await page.getByRole("button", { name: "Payer maintenant" }).click();
    await expect(page).toHaveURL(/\/resultat\?paiement=ok$/, { timeout: 15_000 });

    // ── Le rapport PDF est débloqué et réel
    const download = page.getByRole("link", { name: "Télécharger mon rapport PDF" });
    await expect(download).toBeVisible();
    const pdf = await page.request.get(`/api/intake/${token}/pdf`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  });

  test("abonnement manuel WhatsApp → validation opérateur → abonnement actif", async ({ page }) => {
    // ── Binta (compte seedé) demande un abonnement Cockpit en manuel
    await page.goto("/connexion");
    await page.getByLabel("Email").fill("attente@demo.test");
    await page.getByLabel("Mot de passe").fill("demo1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/cockpit$/);

    await page.goto("/paiement?offre=COCKPIT_MONTHLY");
    await expect(page.getByText("45 000 FCFA").first()).toBeVisible();
    await page.getByRole("radio", { name: /Paiement manuel \(WhatsApp\)/ }).check();
    await page.getByRole("button", { name: "Payer maintenant" }).click();

    // ── L'état « en attente » est explicite : référence + lien WhatsApp, AUCUN droit ouvert
    await expect(page.getByText("En attente de validation")).toBeVisible();
    const headingText = await page.getByRole("heading", { name: /Votre référence/ }).textContent();
    const reference = headingText!.match(/FUS-[A-Z0-9]+/)![0];
    await expect(page.getByRole("link", { name: "Envoyer ma preuve sur WhatsApp" })).toHaveAttribute(
      "href",
      /wa\.me\/221770000000/,
    );
    // Le paiement apparaît côté cliente avec le statut « En attente » — aucun droit ouvert par lui
    await page.goto("/cockpit/abonnement");
    const clientRow = page.locator("li").filter({ hasText: reference });
    await expect(clientRow).toHaveCount(1);
    await expect(clientRow.getByText("En attente")).toBeVisible();

    // ── Déconnexion (cookies), connexion opératrice → file de validation
    await page.context().clearCookies();
    await page.goto("/connexion");
    await page.getByLabel("Email").fill("ops@demo.test");
    await page.getByLabel("Mot de passe").fill("demo1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/console$/);

    await page.goto("/console/argent");
    const row = page.locator("li").filter({ hasText: reference });
    await expect(row).toHaveCount(1);
    await row.getByRole("button", { name: "Valider (fonds reçus)" }).click();
    await expect(page.locator("li").filter({ hasText: reference })).toHaveCount(0, { timeout: 15_000 });

    // ── Retour cliente : l'abonnement est ACTIF, le paiement validé porte sa facture
    await page.context().clearCookies();
    await page.goto("/connexion");
    await page.getByLabel("Email").fill("attente@demo.test");
    await page.getByLabel("Mot de passe").fill("demo1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/cockpit$/, { timeout: 15_000 });
    await page.goto("/cockpit/abonnement");
    await expect(page.getByText("Actif", { exact: true })).toBeVisible();
    await expect(page.getByText(/Prochaine échéance|Accès jusqu'au/)).toBeVisible();
    const settledRow = page.locator("li").filter({ hasText: reference });
    await expect(settledRow.getByText("Payé")).toBeVisible();
    await expect(settledRow.getByText(/facture FUS-\d{4}-\d{6}/)).toBeVisible();
  });
});
