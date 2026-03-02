import Anthropic from "@anthropic-ai/sdk";
import { getConfig } from "../config/index.js";
import type { ClassifiedResponse, LegalFramework, ResponseClassification } from "../types/index.js";
import { LEGAL_REQUEST_SYSTEM, RESPONSE_CLASSIFIER_SYSTEM } from "./prompts.js";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
	if (!_client) {
		const config = getConfig();
		_client = new Anthropic({ apiKey: config.anthropicApiKey });
	}
	return _client;
}

/**
 * Classifies an email response from a data broker.
 */
export async function classifyResponse(
	emailBody: string,
	emailSubject: string,
	brokerId: string,
): Promise<ClassifiedResponse> {
	const client = getClient();
	const config = getConfig();

	const response = await client.messages.create({
		model: config.model,
		max_tokens: 1024,
		system: RESPONSE_CLASSIFIER_SYSTEM,
		messages: [
			{
				role: "user",
				content: `Classify this email response from data broker "${brokerId}":

Subject: ${emailSubject}

Body:
${emailBody}

Return a JSON object with: { classification, confidence, summary, actionRequired }`,
			},
		],
	});

	const text = response.content[0].type === "text" ? response.content[0].text : "";
	const jsonMatch = text.match(/\{[\s\S]*\}/);
	if (!jsonMatch) {
		throw new Error("Failed to parse response classification from Claude");
	}

	const parsed = JSON.parse(jsonMatch[0]) as {
		classification: ResponseClassification;
		confidence: number;
		summary: string;
		actionRequired?: string;
	};

	return {
		messageUid: 0,
		brokerId,
		classification: parsed.classification,
		confidence: parsed.confidence,
		summary: parsed.summary,
		actionRequired: parsed.actionRequired,
	};
}

/**
 * Generates a legal deletion request letter using the appropriate framework.
 */
export async function generateLegalRequest(
	framework: LegalFramework,
	brokerName: string,
	brokerDomain: string,
	senderName: string,
	senderEmail: string,
	piiFields: string[],
): Promise<{ subject: string; body: string }> {
	const client = getClient();
	const config = getConfig();

	const frameworkLabels: Record<LegalFramework, string> = {
		ccpa: "California Consumer Privacy Act (CCPA)",
		gdpr: "General Data Protection Regulation (GDPR)",
		generic: "general privacy right",
	};

	const response = await client.messages.create({
		model: config.model,
		max_tokens: 2048,
		system: LEGAL_REQUEST_SYSTEM,
		messages: [
			{
				role: "user",
				content: `Generate a formal data deletion request under ${frameworkLabels[framework]}.

Broker: ${brokerName} (${brokerDomain})
Requestor: ${senderName} (${senderEmail})
Data to delete: ${piiFields.join(", ")}

Return a JSON object with: { subject: string, body: string }
The body should be the full text of the email (plain text, not HTML).`,
			},
		],
	});

	const text = response.content[0].type === "text" ? response.content[0].text : "";
	const jsonMatch = text.match(/\{[\s\S]*\}/);
	if (!jsonMatch) {
		throw new Error("Failed to parse legal request from Claude");
	}

	return JSON.parse(jsonMatch[0]) as { subject: string; body: string };
}
