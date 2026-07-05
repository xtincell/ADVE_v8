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
  use: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
