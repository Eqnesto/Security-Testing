import "dotenv/config";
import { test, chromium } from "@playwright/test";
import { generateZAPReport, waitForZAP } from "../helpers/zap-helper";
import ZapClient from "zaproxy";

// Define the target URL for the security scan.
const TARGET_URL = "https://ecommerce-playground.lambdatest.io/";

// This proxy URL is used by Playwright to send traffic through ZAP.
const playwrightProxy = "http://127.0.0.1:8080";

const zapOptions = {
  apiKey: process.env.ZAP_API_KEY,
  proxy: {
    host: "127.0.0.1",
    port: 8080,
  },
};

let zapClient: ZapClient;

test.describe("Security Testing", () => {

  test.setTimeout(500000); 
  test.beforeAll(async () => {
    await waitForZAP(); // Ensure ZAP is ready.
    zapClient = new ZapClient(zapOptions);
  });

  test.beforeEach(async ({ page }) => {
    const browser = await chromium.launch({
      headless: true,
      proxy: { server: playwrightProxy }, // Tell Playwright to use ZAP.
    });
    // Ignore HTTPS errors for the proxy connection.
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    page = await context.newPage();

    await page.goto(TARGET_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000); // Wait for any dynamic content.
  });

  test.afterEach(async ({ page }) => {
    await page.close();
  });

  test("Store - Verify Home Page", async ({ page }) => {
    console.log(`Running ZAP security test for the home page of: ${TARGET_URL}`);
    
    await generateZAPReport(
      zapClient,
      "Store - Home Page",
      "traditional-html-plus",
      "Store Home Page",
      "zap-report"
    );
    console.log("ZAP security test completed.");
  });
});