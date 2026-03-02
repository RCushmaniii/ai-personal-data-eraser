import Anthropic from "@anthropic-ai/sdk";
import { getConfig } from "../config/index.js";
import type { PiiMatch, PiiSearchQuery } from "../types/index.js";
import { FORM_ANALYZER_SYSTEM, SEARCH_RESULT_ANALYZER_SYSTEM } from "./prompts.js";

export interface FormFieldMapping {
	selector: string;
	fieldName: string;
	fieldType: "text" | "email" | "tel" | "select" | "checkbox" | "radio" | "hidden" | "unknown";
	piiMapping: string | null;
	required: boolean;
	isHoneypot: boolean;
}

export interface FormAnalysisResult {
	fields: FormFieldMapping[];
	submitSelector: string | null;
	formAction: string | null;
	notes: string;
}

export interface SearchAnalysisResult {
	matches: PiiMatch[];
	totalResults: number;
	analysisNotes: string;
}

let _client: Anthropic | null = null;

function getClient(): Anthropic {
	if (!_client) {
		const config = getConfig();
		_client = new Anthropic({ apiKey: config.anthropicApiKey });
	}
	return _client;
}

/**
 * Analyzes a web form's HTML to map fields to PII data for auto-filling.
 */
export async function analyzeForm(
	formHtml: string,
	brokerName: string,
	availableFields: string[],
): Promise<FormAnalysisResult> {
	const client = getClient();
	const config = getConfig();

	const response = await client.messages.create({
		model: config.model,
		max_tokens: 2048,
		system: FORM_ANALYZER_SYSTEM,
		messages: [
			{
				role: "user",
				content: `Analyze this opt-out form from ${brokerName}. Map each form field to the appropriate PII field.

Available PII fields: ${availableFields.join(", ")}

Form HTML:
\`\`\`html
${formHtml}
\`\`\`

Return a JSON object with: { fields: FormFieldMapping[], submitSelector: string|null, formAction: string|null, notes: string }`,
			},
		],
	});

	const text = response.content[0].type === "text" ? response.content[0].text : "";
	const jsonMatch = text.match(/\{[\s\S]*\}/);
	if (!jsonMatch) {
		throw new Error("Failed to parse form analysis response from Claude");
	}

	return JSON.parse(jsonMatch[0]) as FormAnalysisResult;
}

/**
 * Analyzes search results page to find matching person profiles.
 */
export async function analyzeSearchResults(
	pageContent: string,
	query: PiiSearchQuery,
	brokerId: string,
): Promise<SearchAnalysisResult> {
	const client = getClient();
	const config = getConfig();

	const response = await client.messages.create({
		model: config.model,
		max_tokens: 2048,
		system: SEARCH_RESULT_ANALYZER_SYSTEM,
		messages: [
			{
				role: "user",
				content: `Analyze these search results from broker "${brokerId}" for this person:
- Name: ${query.firstName} ${query.lastName}
- State: ${query.state ?? "unknown"}
- City: ${query.city ?? "unknown"}
- Age: ${query.age ?? "unknown"}

Search results content:
\`\`\`
${pageContent}
\`\`\`

Return a JSON object with: { matches: PiiMatch[], totalResults: number, analysisNotes: string }`,
			},
		],
	});

	const text = response.content[0].type === "text" ? response.content[0].text : "";
	const jsonMatch = text.match(/\{[\s\S]*\}/);
	if (!jsonMatch) {
		throw new Error("Failed to parse search analysis response from Claude");
	}

	return JSON.parse(jsonMatch[0]) as SearchAnalysisResult;
}
