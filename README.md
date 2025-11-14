# 🛡️ Security Testing

This repository contains automated security tests for a store demo website using Playwright for browser interaction and passing URLs to OWASP ZAP for security scanning. It identifies vulnerabilities like XSS, SQL Injection, and security misconfigurations.

## 🔧 How to Run

1. Download and install [ZAP](https://www.zaproxy.org/download/).
1. Open ZAP and navigate to Tools > Options > API.
1. Checkmark the these options: `Disable the API key` & `Do not require an API key for safe operations`.
1. Click OK button.
1. Clone repository:
    ```shell
    git clone https://github.com/Eqnesto/Security-Testing
    ```
1. Install dependencies:
    ```bash
    npm install
    npx playwright install
    ```
1. Run the scripts:
   ```bash
   npx playwright test
   ```
   1. Playwright report will open automatically.
   1. ZAP report you need to open manually which it's located in your Windows user folder.
