/**
 * Tiered page fetching module.
 * Tier 1: Bun fetch() + cheerio (free, fast, works for ~70% of sites)
 * Tier 2: Firecrawl API (JS-rendered, bot-protected sites)
 * Graceful degradation when Firecrawl key is not configured.
 */

import * as cheerio from "cheerio";

export interface FetchedPage {
	url: string;
	html: string;
	markdown: string | null;
	text: string;
	tier: 1 | 2;
	statusCode: number;
}

export interface FetchPageOptions {
	/** Firecrawl API key (enables Tier 2) */
	firecrawlApiKey?: string;
	/** Request timeout in ms (default: 15000) */
	timeout?: number;
	/** Skip Tier 2 even if available */
	skipFirecrawl?: boolean;
}

/** Rotating User-Agent headers to reduce bot detection */
const USER_AGENTS = [
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
];

let _uaIndex = 0;

function getNextUserAgent(): string {
	const ua = USER_AGENTS[_uaIndex % USER_AGENTS.length];
	_uaIndex++;
	return ua;
}

/** Minimum text length to consider a page successfully fetched (not a JS shell/bot block) */
const MIN_TEXT_LENGTH = 200;

/**
 * Fetch a page using tiered approach:
 * 1. Bun fetch() + cheerio parse
 * 2. Firecrawl API (if Tier 1 fails and API key is available)
 */
export async function fetchPage(url: string, options: FetchPageOptions = {}): Promise<FetchedPage> {
	const { timeout = 15_000, firecrawlApiKey, skipFirecrawl = false } = options;

	// Tier 1: Direct HTTP fetch
	const tier1Result = await fetchTier1(url, timeout);

	if (tier1Result && tier1Result.text.length >= MIN_TEXT_LENGTH) {
		return tier1Result;
	}

	// Tier 2: Firecrawl (if available and not skipped)
	if (firecrawlApiKey && !skipFirecrawl) {
		const tier2Result = await fetchTier2(url, firecrawlApiKey);
		if (tier2Result) {
			return tier2Result;
		}
	}

	// Return whatever Tier 1 got (even if thin), or a failure
	if (tier1Result) {
		return tier1Result;
	}

	return {
		url,
		html: "",
		markdown: null,
		text: "",
		tier: 1,
		statusCode: 0,
	};
}

/** Tier 1: Bun fetch + cheerio */
async function fetchTier1(url: string, timeout: number): Promise<FetchedPage | null> {
	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeout);

		const response = await fetch(url, {
			headers: {
				"User-Agent": getNextUserAgent(),
				Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.9",
				"Accept-Encoding": "gzip, deflate, br",
				"Cache-Control": "no-cache",
			},
			redirect: "follow",
			signal: controller.signal,
		});

		clearTimeout(timer);

		if (!response.ok) {
			return null;
		}

		const html = await response.text();
		const $ = cheerio.load(html);

		// Strip non-content elements
		$("script, style, svg, noscript, iframe, nav, footer, header").remove();

		const text = $("body").text().replace(/\s+/g, " ").trim();

		return {
			url: response.url, // may differ from input after redirects
			html,
			markdown: null,
			text,
			tier: 1,
			statusCode: response.status,
		};
	} catch {
		return null;
	}
}

/** Tier 2: Firecrawl API */
async function fetchTier2(url: string, apiKey: string): Promise<FetchedPage | null> {
	try {
		// Dynamic import to avoid loading firecrawl when not needed
		const { default: FirecrawlApp } = await import("@mendable/firecrawl-js");
		const firecrawl = new FirecrawlApp({ apiKey });

		// scrape() throws on failure, returns Document on success
		const result = await firecrawl.scrape(url, {
			formats: ["markdown", "html"],
		});

		const markdown = result.markdown ?? "";
		const html = result.html ?? "";

		// Extract text from markdown (strip markdown formatting)
		const text = markdown
			.replace(/[#*_~`>\[\]()!|]/g, "")
			.replace(/\s+/g, " ")
			.trim();

		return {
			url,
			html,
			markdown,
			text,
			tier: 2,
			statusCode: 200,
		};
	} catch {
		return null;
	}
}

/**
 * Extract visible text from HTML, stripping scripts/styles/SVG.
 * Useful for pre-processing HTML before sending to Claude.
 */
export function cleanHtmlForAnalysis(html: string, maxLength = 30_000): string {
	const $ = cheerio.load(html);
	$("script, style, svg, noscript, iframe, link, meta").remove();

	// Remove all attributes except href (useful for link analysis)
	$("*").each(function () {
		const el = $(this);
		const href = el.attr("href");
		const attribs = (this as unknown as { attribs?: Record<string, string> }).attribs ?? {};
		for (const attr of Object.keys(attribs)) {
			if (attr !== "href") {
				el.removeAttr(attr);
			}
		}
		if (href) {
			el.attr("href", href);
		}
	});

	const cleaned = $("body").html() ?? "";
	return cleaned.slice(0, maxLength);
}
