import type { Page } from "playwright";
import { scoreDifficulty } from "../brokers/difficulty-scorer.js";
import { Store } from "../state/store.js";
import type { AgentResult, BrokerCategory, LegalFramework, OptOutMethod } from "../types/index.js";
import type { DifficultySignals, ResearchQuery } from "../types/research.js";
import { BaseAgent } from "./base-agent.js";

/** Regex to match email addresses in page text */
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Keywords indicating opt-out or removal pages */
const OPT_OUT_KEYWORDS = [
	"opt out",
	"opt-out",
	"optout",
	"remove my",
	"delete my",
	"do not sell",
	"privacy request",
	"data removal",
	"suppress my",
	"right to delete",
	"erasure request",
];

/** Keywords indicating privacy-related pages */
const PRIVACY_KEYWORDS = ["privacy policy", "privacy", "your privacy", "data protection"];

/** Data category keywords to detect */
const DATA_CATEGORY_KEYWORDS: Record<string, string> = {
	"phone number": "phone",
	"email address": "email",
	"home address": "address",
	"mailing address": "address",
	"date of birth": "dob",
	"social security": "ssn",
	"criminal record": "criminal_records",
	"court record": "court_records",
	"employment history": "employment",
	"education history": "education",
	"financial record": "financial",
	"property record": "property",
	"social media": "social_media",
	relative: "relatives",
	associate: "associates",
	photograph: "photos",
	"ip address": "ip_address",
	"browsing history": "browsing_history",
	"location data": "location",
};

/**
 * Research Agent — scrapes data broker websites to collect intelligence
 * about their opt-out processes, difficulty, and data held.
 * Uses Playwright for scraping + heuristic scoring. Zero AI API cost.
 */
export class ResearchAgent extends BaseAgent {
	private page: Page | null;
	private store = new Store();

	constructor(page?: Page) {
		super("research");
		this.page = page ?? null;
	}

	async execute(payload: Record<string, unknown>): Promise<AgentResult> {
		const query = payload as unknown as ResearchQuery;

		if (!this.page) {
			return {
				success: false,
				message: "Research agent requires a Playwright page instance.",
				actions: this.actions,
			};
		}

		const results: { domain: string; name: string; difficulty: string; success: boolean }[] = [];

		if (query.domain) {
			// Research a specific domain
			this.logAction("research_start", `Researching broker: ${query.domain}`);
			const result = await this.researchDomain(query.domain);
			results.push(result);
		} else if (query.category) {
			// Discover brokers by category
			const depth = query.searchDepth ?? 10;
			this.logAction("discover_start", `Discovering ${query.category} brokers (depth: ${depth})`);
			const domains = await this.discoverBrokers(query.category, depth);
			this.logAction("discover_found", `Found ${domains.length} broker domains to research`);

			for (const domain of domains) {
				const result = await this.researchDomain(domain);
				results.push(result);
			}
		} else {
			return {
				success: false,
				message: "ResearchQuery must specify either a domain or a category.",
				actions: this.actions,
			};
		}

		const succeeded = results.filter((r) => r.success).length;
		return {
			success: true,
			message: `Research complete. Analyzed ${succeeded}/${results.length} brokers.`,
			actions: this.actions,
			data: { results, totalAnalyzed: results.length, totalSucceeded: succeeded },
		};
	}

	/** Research a single broker domain end-to-end */
	private async researchDomain(
		domain: string,
	): Promise<{ domain: string; name: string; difficulty: string; success: boolean }> {
		const page = this.page!;
		const normalizedDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
		const url = `https://${normalizedDomain}`;

		try {
			this.logAction("navigate", `Navigating to ${url}`, { domain: normalizedDomain });
			await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

			// Extract site name from title
			const title = await page.title();
			const name = this.extractSiteName(title, normalizedDomain);

			// Find and navigate to opt-out page
			const optOutUrl = await this.findOptOutPage(page, url);

			// If we found an opt-out page, navigate to it and analyze
			let signals: DifficultySignals = {
				requiresAccount: false,
				hasCaptcha: false,
				requiresIdUpload: false,
				requiresPostalMail: false,
				optOutMethod: null,
				verificationSteps: 0,
				estimatedDays: null,
			};
			let optOutMethod: OptOutMethod | null = null;
			let privacyEmail: string | null = null;
			let dataCategories: string[] = [];
			let legalFrameworks: LegalFramework[] = [];

			if (optOutUrl) {
				this.logAction("opt_out_found", `Found opt-out page: ${optOutUrl}`, {
					domain: normalizedDomain,
				});

				try {
					await page.goto(optOutUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
					const formAnalysis = await this.analyzeOptOutForm(page);
					signals = formAnalysis.signals;
					optOutMethod = formAnalysis.method;
				} catch {
					this.logAction("opt_out_nav_failed", "Failed to navigate to opt-out page", {
						domain: normalizedDomain,
					});
				}
			}

			// Try privacy page for email and data categories
			privacyEmail = await this.extractPrivacyContact(page);
			dataCategories = await this.detectDataCategories(page);
			legalFrameworks = await this.detectLegalFrameworks(page);

			// Score difficulty
			const { score, difficulty } = scoreDifficulty(signals);

			// Store result
			this.store.upsertBrokerIntel({
				domain: normalizedDomain,
				name,
				category: this.guessCategory(normalizedDomain, dataCategories),
				optOutUrl: optOutUrl ?? null,
				optOutMethod,
				privacyContactEmail: privacyEmail,
				requiresAccount: signals.requiresAccount,
				requiresIdUpload: signals.requiresIdUpload,
				hasCaptcha: signals.hasCaptcha,
				requiresPostalMail: signals.requiresPostalMail,
				verificationSteps: signals.verificationSteps,
				estimatedDays: signals.estimatedDays,
				difficulty,
				difficultyScore: score,
				legalFrameworks,
				dataCategories,
				sourceUrls: [url, ...(optOutUrl ? [optOutUrl] : [])],
				scrapedAt: new Date().toISOString(),
			});

			// Audit log entry
			this.store.addAuditEntry(
				"broker_researched",
				"research",
				`Researched ${name} (${normalizedDomain}) — difficulty: ${difficulty} (score: ${score})`,
				true,
				normalizedDomain,
			);

			this.logAction("research_complete", `${name}: ${difficulty} (score ${score})`, {
				domain: normalizedDomain,
				difficulty,
				score,
			});

			return { domain: normalizedDomain, name, difficulty, success: true };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logAction("research_error", `Failed to research ${normalizedDomain}: ${message}`, {
				domain: normalizedDomain,
			});
			return {
				domain: normalizedDomain,
				name: normalizedDomain,
				difficulty: "unknown",
				success: false,
			};
		}
	}

	/** Search Google for data brokers in a given category */
	private async discoverBrokers(category: BrokerCategory, depth: number): Promise<string[]> {
		const page = this.page!;
		const searchQuery = `"data broker" "opt out" ${category.replace(/_/g, " ")}`;

		try {
			await page.goto(
				`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=${depth}`,
				{ waitUntil: "domcontentloaded", timeout: 30_000 },
			);

			// Extract domains from search results
			const links = await page.$$eval("a[href]", (anchors) =>
				anchors
					.map((a) => {
						try {
							const url = new URL(a.href);
							return url.hostname;
						} catch {
							return null;
						}
					})
					.filter(Boolean),
			);

			// Deduplicate and filter out Google/common domains
			const excluded = new Set([
				"google.com",
				"www.google.com",
				"accounts.google.com",
				"support.google.com",
				"youtube.com",
				"wikipedia.org",
				"en.wikipedia.org",
				"reddit.com",
				"www.reddit.com",
				"facebook.com",
				"twitter.com",
				"x.com",
			]);

			const domains = [
				...new Set(
					(links as string[])
						.map((d) => d.replace(/^www\./, ""))
						.filter((d) => !excluded.has(d) && d.includes(".")),
				),
			].slice(0, depth);

			return domains;
		} catch (error) {
			this.logAction("discover_error", `Google search failed: ${error}`);
			return [];
		}
	}

	/** Find opt-out page by scanning links on the current page */
	private async findOptOutPage(page: Page, baseUrl: string): Promise<string | null> {
		try {
			// Look for links with opt-out keywords
			const optOutLink = await page.$$eval(
				"a[href]",
				(anchors, keywords) => {
					for (const a of anchors) {
						const text = (a.textContent || "").toLowerCase().trim();
						const href = a.href || "";
						const combined = `${text} ${href.toLowerCase()}`;

						for (const keyword of keywords) {
							if (combined.includes(keyword)) {
								return href;
							}
						}
					}
					return null;
				},
				[...OPT_OUT_KEYWORDS, ...PRIVACY_KEYWORDS],
			);

			if (optOutLink) return optOutLink;

			// Try common opt-out URL patterns
			const commonPaths = [
				"/opt-out",
				"/optout",
				"/remove",
				"/privacy/optout",
				"/do-not-sell",
				"/suppression",
				"/privacy",
				"/data-request",
			];

			for (const path of commonPaths) {
				try {
					const testUrl = new URL(path, baseUrl).toString();
					const response = await page.goto(testUrl, {
						waitUntil: "domcontentloaded",
						timeout: 10_000,
					});
					if (response?.ok()) {
						return testUrl;
					}
				} catch {
					// Path doesn't exist, continue
				}
			}

			return null;
		} catch {
			return null;
		}
	}

	/** Analyze the opt-out form on the current page */
	private async analyzeOptOutForm(
		page: Page,
	): Promise<{ signals: DifficultySignals; method: OptOutMethod | null }> {
		const signals: DifficultySignals = {
			requiresAccount: false,
			hasCaptcha: false,
			requiresIdUpload: false,
			requiresPostalMail: false,
			optOutMethod: null,
			verificationSteps: 0,
			estimatedDays: null,
		};

		const bodyText = (await page.textContent("body"))?.toLowerCase() ?? "";

		// Detect form presence
		const hasForm = (await page.$$("form")).length > 0;
		const hasInputs = (await page.$$("input, select, textarea")).length > 0;
		let method: OptOutMethod | null = null;

		if (hasForm || hasInputs) {
			method = "web_form";
			signals.optOutMethod = "web_form";
		}

		// Detect CAPTCHA
		const captchaSelectors = [
			"iframe[src*='recaptcha']",
			"iframe[src*='hcaptcha']",
			"iframe[src*='captcha']",
			"[class*='captcha']",
			"[id*='captcha']",
			"[class*='recaptcha']",
			"[data-sitekey]",
		];
		for (const selector of captchaSelectors) {
			if ((await page.$$(selector)).length > 0) {
				signals.hasCaptcha = true;
				break;
			}
		}

		// Detect file upload (ID upload requirement)
		const fileInputs = await page.$$("input[type='file']");
		if (fileInputs.length > 0) {
			signals.requiresIdUpload = true;
		}
		if (
			bodyText.includes("upload") &&
			(bodyText.includes("id") ||
				bodyText.includes("identification") ||
				bodyText.includes("driver"))
		) {
			signals.requiresIdUpload = true;
		}

		// Detect account requirement
		const accountKeywords = [
			"create an account",
			"sign up",
			"register",
			"log in to",
			"login required",
			"must have an account",
		];
		for (const keyword of accountKeywords) {
			if (bodyText.includes(keyword)) {
				signals.requiresAccount = true;
				break;
			}
		}

		// Detect postal mail requirement
		const postalKeywords = [
			"mail a letter",
			"send by mail",
			"postal mail",
			"certified mail",
			"written request",
			"mailing address",
			"send a letter",
		];
		for (const keyword of postalKeywords) {
			if (bodyText.includes(keyword)) {
				signals.requiresPostalMail = true;
				if (!method) {
					method = "postal_mail";
					signals.optOutMethod = "postal_mail";
				}
				break;
			}
		}

		// Detect email-only opt-out
		if (!hasForm && !signals.requiresPostalMail) {
			if (
				bodyText.includes("send an email") ||
				bodyText.includes("email us") ||
				bodyText.includes("contact us at")
			) {
				method = "email";
				signals.optOutMethod = "email";
			}
		}

		// Detect verification steps
		const stepPatterns = [
			/step\s+\d/gi,
			/\bverif(y|ication)\b/gi,
			/confirm\s+(your|email|identity)/gi,
		];
		let verificationSteps = 0;
		for (const pattern of stepPatterns) {
			const matches = bodyText.match(pattern);
			if (matches) verificationSteps += matches.length;
		}
		signals.verificationSteps = Math.min(verificationSteps, 5);

		// Detect estimated processing time
		const dayPatterns = [
			/(\d+)\s*(business\s+)?days?/i,
			/up\s+to\s+(\d+)\s*(calendar\s+)?days?/i,
			/within\s+(\d+)\s*days?/i,
		];
		for (const pattern of dayPatterns) {
			const match = bodyText.match(pattern);
			if (match) {
				signals.estimatedDays = Number.parseInt(match[1], 10);
				break;
			}
		}

		return { signals, method };
	}

	/** Extract privacy contact email from page */
	private async extractPrivacyContact(page: Page): Promise<string | null> {
		try {
			const bodyText = (await page.textContent("body")) ?? "";
			const emails = bodyText.match(EMAIL_REGEX) ?? [];

			// Prefer privacy-related emails
			const privacyEmail = emails.find(
				(e) =>
					e.includes("privacy") ||
					e.includes("optout") ||
					e.includes("opt-out") ||
					e.includes("removal") ||
					e.includes("dpo") ||
					e.includes("data"),
			);

			return privacyEmail ?? emails[0] ?? null;
		} catch {
			return null;
		}
	}

	/** Detect what types of data the broker holds by scanning page text */
	private async detectDataCategories(page: Page): Promise<string[]> {
		try {
			const bodyText = (await page.textContent("body"))?.toLowerCase() ?? "";
			const categories = new Set<string>();

			for (const [keyword, category] of Object.entries(DATA_CATEGORY_KEYWORDS)) {
				if (bodyText.includes(keyword)) {
					categories.add(category);
				}
			}

			return [...categories];
		} catch {
			return [];
		}
	}

	/** Detect which legal frameworks are referenced on the page */
	private async detectLegalFrameworks(page: Page): Promise<LegalFramework[]> {
		try {
			const bodyText = (await page.textContent("body"))?.toLowerCase() ?? "";
			const frameworks: LegalFramework[] = [];

			if (
				bodyText.includes("ccpa") ||
				bodyText.includes("california consumer privacy") ||
				bodyText.includes("california privacy rights")
			) {
				frameworks.push("ccpa");
			}
			if (
				bodyText.includes("gdpr") ||
				bodyText.includes("general data protection") ||
				bodyText.includes("right to erasure")
			) {
				frameworks.push("gdpr");
			}
			if (frameworks.length === 0) {
				frameworks.push("generic");
			}

			return frameworks;
		} catch {
			return ["generic"];
		}
	}

	/** Extract a clean site name from page title */
	private extractSiteName(title: string, domain: string): string {
		if (!title || title.trim().length === 0) {
			// Capitalize domain name
			return domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
		}
		// Take the first meaningful segment before separators
		const cleaned = title.split(/[|–—-]/)[0].trim();
		return cleaned || domain;
	}

	/** Guess broker category from domain name and data categories */
	private guessCategory(domain: string, dataCategories: string[]): BrokerCategory {
		const d = domain.toLowerCase();

		// People search indicators
		if (
			d.includes("people") ||
			d.includes("search") ||
			d.includes("finder") ||
			d.includes("lookup") ||
			d.includes("white") ||
			d.includes("been")
		) {
			return "people_search";
		}

		// Background check indicators
		if (d.includes("background") || d.includes("check") || d.includes("verify")) {
			return "background_check";
		}

		// Public records
		if (d.includes("record") || d.includes("court") || d.includes("property")) {
			return "public_records";
		}

		// Social media
		if (d.includes("social") || dataCategories.includes("social_media")) {
			return "social_media";
		}

		// Marketing
		if (
			d.includes("market") ||
			d.includes("data") ||
			d.includes("acxiom") ||
			d.includes("epsilon")
		) {
			return "marketing";
		}

		return "data_aggregator";
	}
}
