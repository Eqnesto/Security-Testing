import path from "path";
import fs from "fs";
import ZapClient from "zaproxy";

/**
 * Executes a ZAP API call with exponential backoff retry logic for transient connection errors.
 * @param zapClient The ZAP client instance.
 * @param apiCall The function that executes the ZAP API command.
 * @param maxRetries Maximum number of retries for the API call.
 * @param initialDelay Initial delay in milliseconds before the first retry.
 */

async function runZapApiCallWithRetry(
  zapClient: ZapClient,
  apiCall: () => Promise<any>,
  maxRetries = 5,
  initialDelay = 2000 // Start with a 2-second delay.
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (e) {
      // Check for transient connection errors like "socket hang up" or "ECONNRESET".
      const isConnectionError = e.message && (e.message.includes('socket hang up') || e.message.includes('ECONNRESET'));

      if (i === maxRetries - 1) {
        throw e;
      }

      if (isConnectionError) {
        const delay = initialDelay * Math.pow(2, i);
        console.log(`ZAP API connection unstable (Attempt ${i + 1}/${maxRetries}). Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw e;
      }
    }
  }
}

// Helper to wait for the ZAP Passive Scan queue to empty.
async function waitForPassiveScanToFinish(zapClient: ZapClient) {
  console.log("⏳ Waiting for ZAP Passive Scanner to finish processing records...");

  // Add a short initial delay to let ZAP stabilize after traffic injection.
  await new Promise((r) => setTimeout(r, 5000));

  // Wait up to 5 minutes (60 retries * 5 seconds each).
  const maxPolls = 60;
  const pollDelay = 5000;

  for (let i = 0; i < maxPolls; i++) {
    try {
      const { recordsToScan } = await runZapApiCallWithRetry(zapClient, () => zapClient.pscan.recordsToScan());
      if (recordsToScan === '0') {
        console.log("✅ ZAP Passive Scan is idle.");
        return;
      }

      console.log(`Processing ${recordsToScan} records. Waiting... (Poll ${i + 1}/${maxPolls})`);
    } catch (e) {
      throw new Error(`Failed to check ZAP Passive Scan status: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, pollDelay));
  }

  console.log("⚠️ Passive Scan wait timed out after 5 minutes, proceeding to report generation.");
}

export async function generateZAPReport(
  zapClient: ZapClient,
  title: string,
  template: any,
  description: string,
  filename: any
) {
  // Define the report directory and path.
  const reportDir = path.join(__dirname, "reports");
  const reportPath = path.join(reportDir, `${filename}.html`);

  // Ensure the report directory exists
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  await waitForPassiveScanToFinish(zapClient);

  console.log(`🔍 Generating ZAP security report at: ${reportPath}`);

  try {
    // Generate the report using the retry wrapper.
    const response = await runZapApiCallWithRetry(zapClient, () =>
      zapClient.reports.generate(
        {
          title: title + " - Security Report",
          template: template || "traditional-html-plus",
          reportFileName: `${filename}.html`,
          reportDir: reportDir,
          display: false,
        }
      )
    );

    console.log("✅ ZAP API Response:", response);
  } catch (e) {
    console.error("❌ Failed to generate ZAP report:", e);
  }
}

export async function waitForZAP() {
  console.log("⚡ Waiting for ZAP to be ready...");
  let isReady = false;
  const maxRetries = 30;
  const retryDelay = 2000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Check for ZAP readiness via its proxy address.
      const response = await fetch("http://127.0.0.1:8080");
      if (response.ok) {
        isReady = true;
        console.log("✅ ZAP is ready!");
        break;
      }
    } catch (e) {
      console.log(`🕐 ZAP not ready yet, retrying (${i + 1}/${maxRetries})...`);
      await new Promise((r) => setTimeout(r, retryDelay));
    }
  }

  if (!isReady) throw new Error("❌ ZAP did not start in time!");
}