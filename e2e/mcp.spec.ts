import { expect, test, type Page } from "@playwright/test";

// Tranche S10 (cahier §6.2) : API MCP facturable — clé hashée affichée UNE fois,
// endpoint JSON-RPC unique (/api/mcp), appels d'outils gatés abonnement et
// comptés, relevé mensuel gelé puis encaissé par les rails de paiement réels.

const cronHeaders = process.env.CRON_SECRET
  ? { Authorization: `Bearer ${process.env.CRON_SECRET}` }
  : undefined;

async function login(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill("demo1234");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/(cockpit|console|creator|agency)$/);
}

function rpc(page: Page, key: string | null, body: Record<string, unknown>) {
  return page.request.post("/api/mcp", {
    headers: key ? { Authorization: `Bearer ${key}` } : {},
    data: { jsonrpc: "2.0", ...body },
  });
}

const keyLabel = `Clé E2E ${Date.now()}`;

test.describe("API MCP facturable", () => {
  test("création de clé (clair une fois) → appels JSON-RPC scopés et comptés → révocation", async ({ page }) => {
    await login(page, "fondateur@demo.test");
    await page.goto("/cockpit/reglages");

    // ── Création : le clair n'apparaît qu'une fois
    await page.getByLabel("Nom de la clé").fill(keyLabel);
    await page.getByRole("button", { name: "Créer une clé" }).click();
    await expect(page.getByText("copiez-la maintenant, elle ne sera plus jamais affichée")).toBeVisible();
    const plaintext = (await page.locator("code", { hasText: /^fusee_mcp_/ }).textContent())!.trim();
    expect(plaintext).toMatch(/^fusee_mcp_[0-9a-f]{48}$/);
    const keyRow = page.locator("li").filter({ hasText: keyLabel });
    await expect(keyRow.getByText(/fusee_mcp_[0-9a-f]{6}…/)).toBeVisible();

    // ── Sans Bearer : refus propre
    const anon = await rpc(page, null, { id: 1, method: "initialize" });
    expect(anon.status()).toBe(401);

    // ── Handshake MCP
    const init = await rpc(page, plaintext, {
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "1.0" } },
    });
    expect(init.ok()).toBeTruthy();
    const initJson = await init.json();
    expect(initJson.result.serverInfo.name).toBe("la-fusee-mcp");
    expect(initJson.result.protocolVersion).toBe("2025-06-18");

    // ── Découverte des outils (non facturée)
    const list = await (await rpc(page, plaintext, { id: 2, method: "tools/list" })).json();
    const names = list.result.tools.map((t: { name: string }) => t.name);
    expect(names).toEqual(["list_brands", "get_brand", "get_score_history", "list_missions"]);

    // ── Appels réels : la marque du porteur, avec son score déterministe
    const brands = await (
      await rpc(page, plaintext, { id: 3, method: "tools/call", params: { name: "list_brands", arguments: {} } })
    ).json();
    expect(brands.result.isError).toBe(false);
    const brandList = JSON.parse(brands.result.content[0].text) as { slug: string; score: number }[];
    const nyama = brandList.find((b) => b.slug === "nyama-cafe");
    expect(nyama).toBeTruthy();
    expect(nyama!.score).toBeGreaterThan(0);

    const detail = await (
      await rpc(page, plaintext, {
        id: 4,
        method: "tools/call",
        params: { name: "get_brand", arguments: { slug: "nyama-cafe" } },
      })
    ).json();
    expect(detail.result.isError).toBe(false);
    const brand = JSON.parse(detail.result.content[0].text);
    expect(brand.pillars).toHaveLength(8);
    const histoire = brand.pillars
      .find((p: { kind: string }) => p.kind === "AUTHENTICITE")
      .fields.find((f: { key: string }) => f.key === "histoire");
    expect(histoire.certainty).toBeTruthy();

    // ── Scoping : la marque canon (admin) est refusée au founder — erreur d'outil, non facturée
    const denied = await (
      await rpc(page, plaintext, {
        id: 5,
        method: "tools/call",
        params: { name: "get_brand", arguments: { slug: "la-fusee" } },
      })
    ).json();
    expect(denied.result.isError).toBe(true);

    // ── Comptage : 2 appels facturables (le refus ne compte pas)
    await page.goto("/cockpit/reglages");
    await expect(page.locator("li").filter({ hasText: keyLabel }).getByText("2 appels ce mois")).toBeVisible();

    // ── Révocation → la clé meurt
    await page
      .locator("li")
      .filter({ hasText: keyLabel })
      .getByRole("button", { name: "Révoquer" })
      .click();
    await expect(page.locator("li").filter({ hasText: keyLabel }).getByText("Révoquée")).toBeVisible();
    const dead = await rpc(page, plaintext, { id: 6, method: "initialize" });
    expect(dead.status()).toBe(401);
  });

  test("relevé mensuel gelé (cron) → encaissement Console par les rails réels", async ({ page }) => {
    test.skip(!cronHeaders, "CRON_SECRET non configuré dans cet environnement");

    // ── Gel du mois courant (ref = 1er du mois suivant) — idempotent
    const now = new Date();
    const ref = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
    const freeze = await page.request.get(`/api/cron/statements?ref=${ref}`, { headers: cronHeaders });
    expect(freeze.ok()).toBeTruthy();
    const frozen = await freeze.json();
    expect(frozen.result.frozen).toBeGreaterThanOrEqual(1);

    // ── Côté porteur : relevé visible, à encaisser (2 appels × 100 FCFA)
    await login(page, "fondateur@demo.test");
    await page.goto("/cockpit/reglages");
    const ownStatement = page.locator("li").filter({ hasText: keyLabel }).filter({ hasText: "appels" });
    await expect(ownStatement.getByText("200 FCFA")).toBeVisible();
    await expect(ownStatement.getByText("À encaisser")).toBeVisible();

    // ── Console : le relevé porte l'usage réel, l'encaissement suit la règle des fonds reçus
    await page.context().clearCookies();
    await login(page, "ops@demo.test");
    await page.goto("/console/argent");
    const row = page.locator("li").filter({ hasText: keyLabel });
    await expect(row.getByText("2 appels")).toBeVisible();
    await expect(row.getByText("200 FCFA")).toBeVisible();
    await row.getByRole("button", { name: "Encaisser (fonds reçus)" }).click();
    // Réglé = Payment créé + settlePayment (facture, audit) + relevé lié — tout ou rien.
    await expect(row.getByText("Réglé")).toBeVisible();
  });

  test("sans abonnement : la création de clé est fermée (TIER_GATE_DENIED)", async ({ page }) => {
    await login(page, "gratuit@demo.test");
    await page.goto("/cockpit/reglages");
    await expect(page.getByText("TIER_GATE_DENIED")).toBeVisible();
    await expect(page.getByRole("button", { name: "Créer une clé" })).toHaveCount(0);
  });
});
