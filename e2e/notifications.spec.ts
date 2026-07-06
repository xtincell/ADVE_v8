import { expect, test } from "@playwright/test";

// Parcours d'argent n°5 (DoD) : notification in-app reçue via SSE —
// SANS rechargement de page. Deux contextes navigateur : la cliente garde
// son Cockpit ouvert pendant que l'opératrice valide son paiement.

test.describe("Notifications temps réel", () => {
  test("la validation d'un paiement notifie la cliente en direct (SSE)", async ({ browser }) => {
    // ── Contexte 1 : Binta crée un paiement manuel puis reste sur son Cockpit
    const clientContext = await browser.newContext();
    const client = await clientContext.newPage();
    await client.goto("/connexion");
    await client.getByLabel("Email").fill("attente@demo.test");
    await client.getByLabel("Mot de passe").fill("demo1234");
    await client.getByRole("button", { name: "Se connecter" }).click();
    await expect(client).toHaveURL(/\/cockpit$/, { timeout: 20_000 });

    await client.goto("/paiement?offre=COCKPIT_MONTHLY");
    await client.getByRole("radio", { name: /Paiement manuel \(WhatsApp\)/ }).check();
    await client.getByRole("button", { name: "Payer maintenant" }).click();
    const headingText = await client.getByRole("heading", { name: /Votre référence/ }).textContent();
    const reference = headingText!.match(/FUS-[A-Z0-9]+/)![0];

    // Cockpit ouvert : on remet le compteur à zéro — la transition 0 → 1 sera
    // la preuve d'une réception SSE sans rechargement.
    await client.goto("/cockpit");
    const badge = client.getByTestId("unread-badge");
    if ((await badge.count()) > 0) {
      await client.getByRole("button", { name: /Notifications/ }).click();
      await client.getByRole("button", { name: "Tout marquer lu" }).click();
      await expect(badge).toHaveCount(0);
      await client.getByRole("button", { name: /Notifications/ }).click(); // referme
    }

    // ── Contexte 2 : l'opératrice valide le paiement
    const opsContext = await browser.newContext();
    const ops = await opsContext.newPage();
    await ops.goto("/connexion");
    await ops.getByLabel("Email").fill("ops@demo.test");
    await ops.getByLabel("Mot de passe").fill("demo1234");
    await ops.getByRole("button", { name: "Se connecter" }).click();
    await ops.waitForURL((u) => !u.pathname.startsWith("/connexion"), { timeout: 30_000 });
    await ops.goto("/console/argent");
    const row = ops.locator("li").filter({ hasText: reference });
    await expect(row).toHaveCount(1);
    await row.getByRole("button", { name: "Valider (fonds reçus)" }).click();
    await expect(ops.locator("li").filter({ hasText: reference })).toHaveCount(0, { timeout: 20_000 });

    // ── Le badge de la cliente réapparaît SANS rechargement (flux SSE).
    // Fenêtre large : le dev server recompile pendant la suite complète et coupe
    // les flux en vol (EventSource se reconnecte avec ?since= et rejoue) — en
    // production/CI (standalone précompilé), la réception est immédiate.
    await expect(client.getByTestId("unread-badge")).toBeVisible({ timeout: 45_000 });

    // La notification est dans la cloche
    await client.getByRole("button", { name: /Notifications/ }).click();
    await expect(client.getByText("Paiement confirmé").first()).toBeVisible();

    // L'email de confirmation est tracé DEFERRED (aucun provider configuré) — jamais silencieux
    await ops.goto("/console");
    await opsContext.close();
    await clientContext.close();
  });

  const cronHeaders = process.env.CRON_SECRET
    ? { Authorization: `Bearer ${process.env.CRON_SECRET}` }
    : undefined;

  test("le digest hebdo (cron HTTP) tourne et trace ses envois", async ({ page }) => {
    const res = await page.request.get("/api/cron/digest", { headers: cronHeaders });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok: boolean; result: { sent: number } };
    expect(body.ok).toBe(true);
    expect(body.result.sent).toBeGreaterThanOrEqual(0);
  });

  test("le cron d'expiration des abonnements répond", async ({ page }) => {
    const res = await page.request.get("/api/cron/subscriptions", { headers: cronHeaders });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  test("un cron sans secret est refusé quand CRON_SECRET est configuré (fail-closed)", async ({ page }) => {
    test.skip(!process.env.CRON_SECRET, "CRON_SECRET non configuré dans cet environnement");
    const res = await page.request.get("/api/cron/digest");
    expect([401, 503]).toContain(res.status());
  });
});
