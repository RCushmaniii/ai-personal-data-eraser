import { type Browser, type BrowserContext, type Page, chromium } from "playwright";

const USER_AGENTS = [
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
];

const VIEWPORTS = [
	{ width: 1920, height: 1080 },
	{ width: 1536, height: 864 },
	{ width: 1440, height: 900 },
	{ width: 1366, height: 768 },
];

function randomPick<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Manages a Chromium browser instance for broker automation.
 * One BrowserManager per campaign — launch, create pages, close.
 */
export class BrowserManager {
	private browser: Browser | null = null;
	private context: BrowserContext | null = null;

	/**
	 * Launch Chromium with anti-detection settings.
	 */
	async launch(headless = true): Promise<void> {
		this.browser = await chromium.launch({
			// Use full Chromium channel instead of chromium_headless_shell,
			// which has DevTools pipe connection issues on Windows
			channel: "chromium",
			headless,
			timeout: 30_000,
			args: [
				"--disable-blink-features=AutomationControlled",
				"--no-first-run",
				"--no-default-browser-check",
			],
		});

		const userAgent = randomPick(USER_AGENTS);
		const viewport = randomPick(VIEWPORTS);

		this.context = await this.browser.newContext({
			userAgent,
			viewport,
			locale: "en-US",
			timezoneId: "America/New_York",
		});

		// Remove webdriver indicator
		await this.context.addInitScript(() => {
			Object.defineProperty(navigator, "webdriver", { get: () => false });
		});
	}

	/**
	 * Create a new page in the current browser context.
	 */
	async newPage(): Promise<Page> {
		if (!this.context) {
			throw new Error("BrowserManager not launched. Call launch() first.");
		}
		return this.context.newPage();
	}

	/**
	 * Close the browser and release all resources.
	 */
	async close(): Promise<void> {
		if (this.context) {
			await this.context.close();
			this.context = null;
		}
		if (this.browser) {
			await this.browser.close();
			this.browser = null;
		}
	}

	/**
	 * Check if the browser is currently running.
	 */
	get isRunning(): boolean {
		return this.browser?.isConnected() ?? false;
	}
}
