/**
 * Claude-powered broker page analysis.
 * Uses Haiku for cost efficiency (~$0.001 per broker).
 * Follows the same lazy singleton pattern as form-analyzer.ts.
 */

import Anthropic from "@anthropic-ai/sdk";
import { getConfig } from "../config/index.js";
import type { BrokerCategory, LegalFramework, OptOutMethod } from "../types/index.js";
import { BROKER_INTEL_ANALYZER_SYSTEM } from "./prompts.js";

export interface BrokerAnalysisResult {
	name: string | null;
	category: BrokerCategory | null;
	optOutUrl: string | null;
	optOutMethod: OptOutMethod | null;
	privacyContactEmail: string | null;
	requiresAccount: boolean;
	hasCaptcha: boolean;
	requiresIdUpload: boolean;
	requiresPostalMail: boolean;
	verificationSteps: number;
	estimatedDays: number | null;
	dataCategories: string[];
	legalFrameworks: LegalFramework[];
	notes: string | null;
}

let _client: Anthropic | null = null;

function getClient(): Anthropic {
	if (!_client) {
		const config = getConfig();
		_client = new Anthropic({ apiKey: config.anthropicApiKey });
	}
	return _client;
}

/** Content length limits to stay within token budget */
const MAX_HTML_LENGTH = 30_000;
const MAX_MARKDOWN_LENGTH = 20_000;

/**
 * Analyze a broker's page content using Claude Haiku.
 * @param domain - The broker's domain (e.g., "spokeo.com")
 * @param pageContent - HTML or markdown content of the page
 * @param contentFormat - Whether the content is "html" or "markdown"
 * @param pageUrl - The URL the content was fetched from
 */
export async function analyzeBrokerPage(
	domain: string,
	pageContent: string,
	contentFormat: "html" | "markdown",
	pageUrl: string,
): Promise<BrokerAnalysisResult> {
	const client = getClient();

	// Truncate content to stay within token limits
	const maxLength = contentFormat === "html" ? MAX_HTML_LENGTH : MAX_MARKDOWN_LENGTH;
	const truncated = pageContent.slice(0, maxLength);

	const response = await client.messages.create({
		model: "claude-haiku-4-5-20251001",
		max_tokens: 2048,
		system: BROKER_INTEL_ANALYZER_SYSTEM,
		messages: [
			{
				role: "user",
				content: `Analyze this data broker website and extract opt-out intelligence.

Domain: ${domain}
Page URL: ${pageUrl}
Content format: ${contentFormat}

Page content:
\`\`\`${contentFormat}
${truncated}
\`\`\`

Return a single JSON object with the analysis.`,
			},
		],
	});

	const text = response.content[0].type === "text" ? response.content[0].text : "";
	const jsonMatch = text.match(/\{[\s\S]*\}/);
	if (!jsonMatch) {
		throw new Error(`Failed to parse broker analysis response from Claude for ${domain}`);
	}

	const parsed = JSON.parse(jsonMatch[0]) as Partial<BrokerAnalysisResult>;

	// Apply defaults for missing fields
	return {
		name: parsed.name ?? null,
		category: parsed.category ?? null,
		optOutUrl: parsed.optOutUrl ?? null,
		optOutMethod: parsed.optOutMethod ?? null,
		privacyContactEmail: parsed.privacyContactEmail ?? null,
		requiresAccount: parsed.requiresAccount ?? false,
		hasCaptcha: parsed.hasCaptcha ?? false,
		requiresIdUpload: parsed.requiresIdUpload ?? false,
		requiresPostalMail: parsed.requiresPostalMail ?? false,
		verificationSteps: parsed.verificationSteps ?? 0,
		estimatedDays: parsed.estimatedDays ?? null,
		dataCategories: parsed.dataCategories ?? [],
		legalFrameworks: parsed.legalFrameworks ?? ["generic"],
		notes: parsed.notes ?? null,
	};
}
