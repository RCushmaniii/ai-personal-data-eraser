import * as cheerio from "cheerio";
import { analyzeBrokerPage } from "../ai/broker-analyzer.js";
import { scoreDifficulty } from "../brokers/difficulty-scorer.js";
import { cleanHtmlForAnalysis, fetchPage } from "../brokers/page-fetcher.js";
import { getAllSeedBrokers, getSeedBrokers } from "../brokers/seed-brokers.js";
import { getConfig } from "../config/index.js";
import { Store } from "../state/store.js";
import type { AgentResult, BrokerCategory } from "../types/index.js";
import type { DifficultySignals, ResearchQuery } from "../types/research.js";
import { BaseAgent } from "./base-agent.js";

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

/**
 * Research Agent — collects intelligence about data broker opt-out processes.
 * Uses HTTP fetching (Bun fetch + optional Firecrawl) and Claude AI analysis.
 * No browser automation required — this agent only reads pages.
 */
export class ResearchAgent extends BaseAgent {
	private store = new Store();

	constructor() {
		super("research");
	}

	async execute(payload: Record<string, unknown>): Promise<AgentResult> {
		const query = payload as unknown as ResearchQuery;

		const results: { domain: string; name: string; difficulty: string; success: boolean }[] = [];

		if (query.domain) {
			// Research a specific domain
			this.logAction("research_start", `Researching broker: ${query.domain}`);
			const result = await this.researchDomain(query.domain);
			results.push(result);
		} else if (query.category) {
			// Discover brokers by category from seed list
			const limit = query.searchDepth ?? 10;
			this.logAction("discover_start", `Discovering ${query.category} brokers (limit: ${limit})`);
			const domains = this.discoverBrokers(query.category, limit);
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

	/** Get broker domains from the curated seed list */
	private discoverBrokers(category: BrokerCategory, limit: number): string[] {
		const brokers = getSeedBrokers(category, limit);
		return brokers.map((b) => b.domain);
	}

	/** Research a single broker domain end-to-end */
	private async researchDomain(
		domain: string,
	): Promise<{ domain: string; name: string; difficulty: string; success: boolean }> {
		const normalizedDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
		const url = `https://${normalizedDomain}`;

		// Get Firecrawl key if available
		let firecrawlApiKey: string | undefined;
		try {
			const config = getConfig();
			firecrawlApiKey = config.firecrawlApiKey;
		} catch {
			// Config may not be initialized for research (API key not required)
		}

		try {
			// Step 1: Fetch homepage
			this.logAction("fetch", `Fetching ${url}`, { domain: normalizedDomain });
			const homepage = await fetchPage(url, { firecrawlApiKey });

			if (!homepage.text && !homepage.html) {
				this.logAction("fetch_failed", `Could not fetch ${url}`, { domain: normalizedDomain });
				const seedBroker = getAllSeedBrokers().find((b) => b.domain === normalizedDomain);
				this.store.upsertBrokerIntel({
					domain: normalizedDomain,
					name: seedBroker?.name ?? normalizedDomain,
					category: seedBroker?.category ?? "data_aggregator",
					status: "fetch_failed",
					notes: `Tier ${homepage.tier} fetch returned empty content for ${url}`,
					sourceUrls: [url],
					scrapedAt: new Date().toISOString(),
				});
				this.store.addAuditEntry(
					"broker_fetch_failed",
					"research",
					`Fetch failed for ${seedBroker?.name ?? normalizedDomain} (${normalizedDomain}) — empty content`,
					false,
					normalizedDomain,
				);
				return {
					domain: normalizedDomain,
					name: normalizedDomain,
					difficulty: "unknown",
					success: false,
				};
			}

			this.logAction(
				"fetch_complete",
				`Fetched ${url} (Tier ${homepage.tier}, ${homepage.text.length} chars)`,
				{
					domain: normalizedDomain,
					tier: homepage.tier,
				},
			);

			// Step 2: Find opt-out link in homepage content
			const optOutUrl = this.findOptOutLink(homepage.html, url);

			// Step 3: Fetch opt-out page if found
			let optOutPage = null;
			if (optOutUrl) {
				this.logAction("opt_out_found", `Found opt-out page: ${optOutUrl}`, {
					domain: normalizedDomain,
				});
				optOutPage = await fetchPage(optOutUrl, { firecrawlApiKey });
			}

			// Step 4: Analyze with Claude
			// Prefer markdown if available (from Firecrawl), else use cleaned HTML
			let contentForAnalysis: string;
			let contentFormat: "html" | "markdown";

			if (optOutPage?.markdown) {
				contentForAnalysis = `## Homepage\n${homepage.markdown ?? homepage.text}\n\n## Opt-Out Page\n${optOutPage.markdown}`;
				contentFormat = "markdown";
			} else if (homepage.markdown) {
				contentForAnalysis = homepage.markdown;
				contentFormat = "markdown";
			} else {
				// Build combined HTML for analysis
				const homepageClean = cleanHtmlForAnalysis(homepage.html, 15_000);
				const optOutClean = optOutPage ? cleanHtmlForAnalysis(optOutPage.html, 15_000) : "";
				contentForAnalysis = optOutClean
					? `<!-- Homepage -->\n${homepageClean}\n\n<!-- Opt-Out Page -->\n${optOutClean}`
					: homepageClean;
				contentFormat = "html";
			}

			this.logAction("analyze", `Analyzing ${normalizedDomain} with Claude`, {
				domain: normalizedDomain,
			});
			const analysis = await analyzeBrokerPage(
				normalizedDomain,
				contentForAnalysis,
				contentFormat,
				url,
			);

			// Step 5: Score difficulty using existing scorer
			const signals: DifficultySignals = {
				requiresAccount: analysis.requiresAccount,
				hasCaptcha: analysis.hasCaptcha,
				requiresIdUpload: analysis.requiresIdUpload,
				requiresPostalMail: analysis.requiresPostalMail,
				optOutMethod: analysis.optOutMethod,
				verificationSteps: analysis.verificationSteps,
				estimatedDays: analysis.estimatedDays,
			};
			const { score, difficulty } = scoreDifficulty(signals);

			// Use name from seed list or Claude analysis
			const seedBroker = getAllSeedBrokers().find((b) => b.domain === normalizedDomain);
			const name = analysis.name ?? seedBroker?.name ?? normalizedDomain;
			const category = analysis.category ?? seedBroker?.category ?? "data_aggregator";

			// Step 6: Store result
			this.store.upsertBrokerIntel({
				domain: normalizedDomain,
				name,
				category,
				optOutUrl: analysis.optOutUrl ?? optOutUrl ?? null,
				optOutMethod: analysis.optOutMethod,
				privacyContactEmail: analysis.privacyContactEmail,
				requiresAccount: analysis.requiresAccount,
				requiresIdUpload: analysis.requiresIdUpload,
				hasCaptcha: analysis.hasCaptcha,
				requiresPostalMail: analysis.requiresPostalMail,
				verificationSteps: analysis.verificationSteps,
				estimatedDays: analysis.estimatedDays,
				difficulty,
				difficultyScore: score,
				legalFrameworks: analysis.legalFrameworks,
				dataCategories: analysis.dataCategories,
				notes: analysis.notes,
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
			const seedBroker = getAllSeedBrokers().find((b) => b.domain === normalizedDomain);
			this.store.upsertBrokerIntel({
				domain: normalizedDomain,
				name: seedBroker?.name ?? normalizedDomain,
				category: seedBroker?.category ?? "data_aggregator",
				status: "fetch_failed",
				notes: `Research error: ${message}`,
				sourceUrls: [url],
				scrapedAt: new Date().toISOString(),
			});
			this.store.addAuditEntry(
				"broker_fetch_failed",
				"research",
				`Research error for ${seedBroker?.name ?? normalizedDomain} (${normalizedDomain}): ${message}`,
				false,
				normalizedDomain,
			);
			return {
				domain: normalizedDomain,
				name: normalizedDomain,
				difficulty: "unknown",
				success: false,
			};
		}
	}

	/** Scan HTML for opt-out/privacy links using cheerio */
	private findOptOutLink(html: string, baseUrl: string): string | null {
		if (!html) return null;

		try {
			const $ = cheerio.load(html);
			const allKeywords = [...OPT_OUT_KEYWORDS, ...PRIVACY_KEYWORDS];

			// Scan all anchor tags
			let bestMatch: string | null = null;
			let bestPriority = -1;

			$("a[href]").each((_i, el) => {
				const href = $(el).attr("href");
				const text = $(el).text().toLowerCase().trim();
				if (!href) return;

				const hrefLower = href.toLowerCase();
				const combined = `${text} ${hrefLower}`;

				for (let k = 0; k < allKeywords.length; k++) {
					if (combined.includes(allKeywords[k])) {
						// Opt-out keywords have higher priority than privacy keywords
						const priority = k < OPT_OUT_KEYWORDS.length ? 1 : 0;
						if (priority > bestPriority) {
							bestPriority = priority;
							try {
								bestMatch = new URL(href, baseUrl).toString();
							} catch {
								bestMatch = href;
							}
						}
						break;
					}
				}
			});

			return bestMatch;
		} catch {
			return null;
		}
	}
}
