import { chromium } from '@playwright/test';

const routes = [
  // Standalone (no sidebar)
  { path: "/welcome", name: "01-welcome" },
  { path: "/login", name: "02-login" },
  { path: "/select-workspace", name: "03-select-workspace" },
  { path: "/first-run", name: "04-first-run" },
  { path: "/announcement", name: "05-announcement" },
  // Main app (with sidebar)
  { path: "/", name: "10-main-workbench" },
  { path: "/debug", name: "11-debug" },
  { path: "/diff", name: "12-diff" },
  { path: "/plan-summary", name: "13-plan-summary" },
  { path: "/file-preview", name: "14-file-preview" },
  { path: "/inbox", name: "15-inbox" },
  { path: "/skills", name: "16-skills" },
  { path: "/settings", name: "17-settings" },
];

const baseUrl = "http://localhost:5173";
const outputDir = "./output/qa-screenshots";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

console.log("Starting visual QA screenshots...\n");

for (const route of routes) {
  try {
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: "networkidle", timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${outputDir}/${route.name}.png`, fullPage: true });
    console.log(`✓ ${route.name}: ${route.path}`);
  } catch (err) {
    console.log(`✗ ${route.name}: ${route.path} - ${err.message}`);
  }
}

await browser.close();
console.log("\nDone! Screenshots saved to:", outputDir);
