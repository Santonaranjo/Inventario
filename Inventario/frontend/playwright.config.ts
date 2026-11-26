import { defineConfig, devices } from "@playwright/test";

// E2E contra la API REAL: requiere el backend en http://localhost:8000 con el seed cargado.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  // PW_CHANNEL=chrome (o msedge) usa el navegador ya instalado y evita `npx playwright install`.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: process.env.PW_CHANNEL || undefined } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
