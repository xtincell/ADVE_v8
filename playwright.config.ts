import { defineConfig, devices } from "@playwright/test";

// E2E des parcours d'argent (cahier §11.3). Le serveur est lancé par la config ;
// la base doit être migrée + seedée avant (scripts/init.sh ou CI).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // parcours d'argent séquentiels — état DB partagé
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  // Le serveur de dev compile les routes à la volée (première visite lente) —
  // l'assertion par défaut absorbe cette latence ; la CI sert un build précompilé.
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, grepInvert: /@mobile/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: {
    // CI et runs complets locaux (PW_PROD=1) : l'artefact standalone réel est servi —
    // déterministe (zéro recompilation en vol) et valide l'artefact au passage.
    // Itération locale : le dev server (réutilisé s'il tourne déjà).
    command: process.env.CI || process.env.PW_PROD ? "node .next/standalone/server.js" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
