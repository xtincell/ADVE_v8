import { expect, test } from "@playwright/test";

// Parcours d'argent n°1 (cahier §11.3, DoD) :
// landing → intake token sans compte → résultat scoré → paywall → activation compte → Cockpit.

test.describe("Funnel public", () => {
  test("funnel complet : landing → intake → résultat → activation → cockpit", async ({ page }) => {
    const email = `e2e-${Date.now()}@funnel.test`;

    // ── Landing
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("étoile");
    // Le CTA « Obtenir mon diagnostic gratuit » apparaît en héro et en clôture
    // (même intention, même libellé) : on cible le premier (héro).
    await page.getByRole("link", { name: "Obtenir mon diagnostic gratuit" }).first().click();

    // ── Démarrage du diagnostic (création du token)
    await expect(page).toHaveURL(/\/diagnostic$/);
    await page.getByRole("button", { name: "Commencer mon diagnostic" }).click();
    await expect(page).toHaveURL(/\/diagnostic\/[A-Za-z0-9_-]+$/);

    // ── Étape 1 : la marque
    await page.getByLabel("Nom de la marque *").fill("Kalao Studio");
    await page.getByLabel("Secteur *").selectOption("Mode");
    await page.getByLabel("Pays *").selectOption("SN");
    await page.getByLabel("Ville").fill("Dakar");
    await page.getByRole("button", { name: "Continuer" }).click();

    // ── Étape 2 : authenticité
    await page
      .getByLabel("L'histoire de la marque")
      .fill(
        "Kalao Studio est né à Dakar en 2022 : trois stylistes décidés à habiller la scène musicale locale avec des pièces uniques, coupées et cousues au quartier, portées sur scène dès le premier mois.",
      );
    await page.getByLabel("Vos valeurs").fill("Créativité\nQualité artisanale\nFierté locale");
    await page.getByRole("button", { name: "Continuer" }).click();

    // ── Étape 3 : valeur
    await page
      .getByLabel("Votre offre / catalogue")
      .fill("Deux collections par an, pièces sur mesure pour artistes, accessoires en série limitée vendus en ligne et au showroom.");
    await page
      .getByLabel("Comment gagnez-vous de l'argent ?")
      .fill("Vente directe au showroom et en ligne, commandes sur mesure à forte marge, collaborations avec des labels musicaux.");
    await page.getByRole("button", { name: "Continuer" }).click();

    // ── Étape 4 : distinction
    await page
      .getByLabel("Votre positionnement")
      .fill("La maison de couture de la scène musicale ouest-africaine : entre le tailleur de quartier et la marque de luxe importée.");
    await page.getByLabel("Votre promesse, en une phrase").fill("Des pièces qui font monter sur scène.");
    await page.getByRole("button", { name: "Continuer" }).click();

    // ── Étape 5 : engagement
    await page.getByRole("checkbox", { name: "Instagram" }).check();
    await page.getByRole("checkbox", { name: "WhatsApp" }).check();
    await page
      .getByLabel("Votre communauté, honnêtement")
      .fill("Environ 2 000 abonnés Instagram actifs, un groupe WhatsApp de 80 clients fidèles animé chaque semaine.");
    await page.getByRole("button", { name: "Continuer" }).click();

    // ── Étape 6 : email + calcul
    await page.getByLabel("Votre email *").fill(email);
    await page.getByRole("button", { name: "Calculer mon score" }).click();

    // ── Résultat scoré
    await expect(page).toHaveURL(/\/resultat$/);
    await expect(page.getByRole("heading", { name: "Kalao Studio" })).toBeVisible();
    await expect(page.getByText(/Votre marque est au palier/)).toBeVisible();
    // Les 4 piliers fondateurs sont affichés avec leur score /25
    await expect(page.getByRole("heading", { name: /A · Authenticité/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /E · Engagement/ })).toBeVisible();
    // Teaser du pilier dérivé
    await expect(page.getByRole("heading", { name: /R · Risque/ })).toBeVisible();
    // Paywall : les deux one-shots avec prix localisés (SN → FCFA)
    await expect(page.getByRole("link", { name: "Obtenir le rapport PDF" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Commander l'Oracle" })).toBeVisible();
    await expect(page.getByText(/FCFA/).first()).toBeVisible();

    // ── Activation du compte
    await page.getByRole("link", { name: "Activer mon espace gratuit" }).click();
    await expect(page).toHaveURL(/\/activation\?token=/);
    await expect(page.getByLabel("Email")).toHaveValue(email);
    await page.getByLabel("Votre nom").fill("Aminata Test");
    await page.getByLabel("Mot de passe").fill("motdepasse-e2e-123");
    await page.getByRole("button", { name: "Créer mon compte et ouvrir le Cockpit" }).click();

    // ── Arrivée dans le Cockpit : la marque existe, le score est repris
    await expect(page).toHaveURL(/\/cockpit$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Kalao Studio" })).toBeVisible();
    await expect(page.getByText("Les 8 piliers")).toBeVisible();
    await expect(page.getByText(/\/200/).first()).toBeVisible();
  });

  test("connexion d'un compte démo seedé → cockpit avec données", async ({ page }) => {
    await page.goto("/connexion");
    await page.getByLabel("Email").fill("fondateur@demo.test");
    await page.getByLabel("Mot de passe").fill("demo1234");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/cockpit$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Nyama Café" })).toBeVisible();
    // Les actions seedées sont visibles (aucun écran vide non-intentionnel)
    await expect(page.getByText("Prochaines actions")).toBeVisible();
    await expect(page.getByText(/promesse maître/i).first()).toBeVisible();
  });

  test("@mobile le funnel démarre proprement sur téléphone", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("étoile");
    // Le menu mobile s'ouvre et mène au diagnostic
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await page.getByRole("navigation", { name: "Navigation mobile" }).getByRole("link", { name: "Diagnostic gratuit" }).click();
    await expect(page).toHaveURL(/\/diagnostic$/);
    await page.getByRole("button", { name: "Commencer mon diagnostic" }).click();
    await expect(page.getByLabel("Nom de la marque *")).toBeVisible();
  });
});
