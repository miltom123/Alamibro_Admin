import { defineConfig, devices } from "@playwright/test";

const PORT = 4181;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.BASE_URL || `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    locale: "es-PE",
    timezoneId: "America/Lima",
  },
  projects: [{ name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  // Prueba el build tal como se publica (modo demo: sin variables de Supabase).
  webServer: process.env.BASE_URL
    ? undefined
    : { command: `npx vite preview --port ${PORT} --strictPort`, port: PORT, reuseExistingServer: !process.env.CI },
});
