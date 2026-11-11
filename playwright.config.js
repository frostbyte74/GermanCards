import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:4173/GermanCards/", headless: true },
  webServer: { command: "npm start", url: "http://127.0.0.1:4173/GermanCards/", reuseExistingServer: false },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 1100 } } },
    { name: "mobile", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ]
});
