import { expect, test } from "@playwright/test";

// Parcours d'argent n°3 (cahier §11.3, DoD) :
// dépôt mission publique → modération opérateur → candidature talent (devis
// structuré) → décision opérateur → relevé de commission créé.

test.describe("La Guilde", () => {
  test("dépôt → modération → candidature → acceptation → commission", async ({ page }) => {
    const stamp = Date.now();
    const missionTitle = `Refonte identité sonore ${stamp}`;

    // ── 1. Dépôt public (sans compte)
    await page.goto("/guilde/deposer");
    await page.getByLabel("Nom de la marque *").fill(`Radio Téranga ${stamp}`);
    await page.getByLabel("Secteur *").fill("Média & contenu");
    await page.getByLabel("Pays *").selectOption("SN");
    await page.getByLabel("Nom *", { exact: true }).fill("Fatou Diagne");
    await page.getByLabel("Email *").fill(`fatou-${stamp}@radioteranga.test`);
    await page.getByLabel("Titre *").fill(missionTitle);
    await page.getByLabel("Résumé public *").fill("Nous cherchons un(e) sound designer pour refondre notre identité sonore : jingles, habillage antenne, signature.");
    await page.getByLabel("Contexte *").fill("Radio urbaine dakaroise en pleine croissance, audience 25-40 ans, habillage antenne vieillissant qui ne reflète plus notre positionnement.");
    await page.getByLabel("Objectifs * (un par ligne)").fill("Identité sonore mémorable\nCohérence sur tous les programmes");
    await page.getByLabel("Livrables attendus * (un par ligne)").fill("3 jingles déclinés\nHabillage antenne complet\nCharte sonore");
    await page.getByLabel("Budget min (FCFA)").fill("300000");
    await page.getByLabel("Budget max (FCFA)").fill("500000");
    await page.getByRole("button", { name: "Soumettre à la modération" }).click();
    await expect(page.getByText("Mission reçue ✓")).toBeVisible();

    // La mission n'apparaît PAS sur le mur public avant modération
    await page.goto("/guilde");
    await expect(page.getByText(missionTitle)).toHaveCount(0);

    // ── 2. Modération : l'opératrice publie
    await page.goto("/connexion");
    await page.getByLabel("Email").fill("ops@demo.test");
    await page.getByLabel("Mot de passe").fill("demo1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/console$/);
    await page.goto("/console/guilde");
    const pendingRow = page.locator("li").filter({ hasText: missionTitle });
    await expect(pendingRow).toBeVisible();
    // Les coordonnées du déposant sont visibles de l'opérateur (jamais du public)
    await expect(pendingRow.getByText(/fatou-.*@radioteranga\.test/)).toBeVisible();
    await pendingRow.getByRole("button", { name: "Publier" }).click();
    await expect(page.locator("li").filter({ hasText: missionTitle })).toHaveCount(0);

    // Publiée sur le mur public — sans les coordonnées
    await page.context().clearCookies();
    await page.goto("/guilde");
    await page.getByRole("heading", { name: missionTitle }).click();
    await expect(page.getByText("Radio urbaine dakaroise", { exact: false })).toBeVisible();
    await expect(page.getByText(/fatou-.*@radioteranga\.test/)).toHaveCount(0);
    const missionSlug = page.url().split("/guilde/")[1]!;

    // ── 3. Candidature talent avec devis structuré
    await page.goto("/connexion");
    await page.getByLabel("Email").fill("talent@demo.test");
    await page.getByLabel("Mot de passe").fill("demo1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/creator$/);
    await page.goto(`/creator/missions/${missionSlug}`);
    await page.getByLabel("Votre approche *").fill("Sound designer avec 8 ans d'expérience radio. Je propose une immersion antenne de 2 jours avant toute création, puis 3 pistes créatives.");
    await page.getByLabel("Libellé poste 1").fill("Immersion & direction créative");
    await page.getByLabel("Montant poste 1").fill("150000");
    await page.getByLabel("Libellé poste 2").fill("Production jingles + habillage");
    await page.getByLabel("Montant poste 2").fill("250000");
    await page.getByLabel("Délai de livraison (jours) *").fill("30");
    await page.getByRole("button", { name: "Envoyer ma candidature" }).click();
    await expect(page.getByText("Ma candidature")).toBeVisible();
    await expect(page.getByText("400 000 FCFA")).toBeVisible();

    // ── 4. Décision opérateur : retenir → commission créée
    await page.context().clearCookies();
    await page.goto("/connexion");
    await page.getByLabel("Email").fill("ops@demo.test");
    await page.getByLabel("Mot de passe").fill("demo1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/console$/, { timeout: 20_000 });
    await page.goto("/console/guilde");
    const applicationBlock = page.locator("li").filter({ hasText: "Moussa Diop" }).filter({ hasText: "400 000 FCFA" }).first();
    await expect(applicationBlock).toBeVisible();
    await applicationBlock.getByRole("button", { name: "Retenir" }).click();

    // Le relevé de commission apparaît (Compagnon = 25 % par défaut)
    await expect(page.getByText(missionTitle + " — talent@demo.test").first()).toBeVisible();
    await expect(page.getByText(/commission 25 %/).first()).toBeVisible();
    await expect(page.getByText("net talent 300 000 FCFA").first()).toBeVisible();

    // ── 5. Côté talent : candidature retenue + notification + earning
    await page.context().clearCookies();
    await page.goto("/connexion");
    await page.getByLabel("Email").fill("talent@demo.test");
    await page.getByLabel("Mot de passe").fill("demo1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/creator$/);
    await expect(page.getByText("Retenue").first()).toBeVisible();
  });

  test("inscription talent publique → espace Creator", async ({ page }) => {
    const email = `talent-${Date.now()}@guilde.test`;
    await page.goto("/guilde/talents");
    await page.getByLabel("Nom complet *").fill("Aïda Sow");
    await page.getByLabel("Email *").fill(email);
    await page.getByLabel("Mot de passe *").fill("motdepasse-123");
    await page.getByLabel("Votre métier en une ligne *").fill("Photographe portrait & produit");
    await page.getByLabel("Compétences * (séparées par des virgules)").fill("Photographie, Retouche, Direction photo");
    await page.getByLabel("Pays *").selectOption("SN");
    await page.getByRole("button", { name: "Créer mon espace Creator" }).click();
    await expect(page).toHaveURL(/\/creator$/, { timeout: 20_000 });
    await expect(page.getByText("Photographe portrait & produit")).toBeVisible();
    await expect(page.getByText("Apprenti")).toBeVisible();
  });
});
