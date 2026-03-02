import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mjml2html from "mjml";
import type { EmailTemplateData, EmailTemplateType } from "../types/index.js";

const TEMPLATE_DIR = resolve(import.meta.dir, "templates");

/**
 * Renders an MJML email template with the given data.
 */
export function renderTemplate(
	templateType: EmailTemplateType,
	data: EmailTemplateData,
): { html: string; text: string } {
	const templatePath = resolve(TEMPLATE_DIR, `${templateType}.mjml`);
	const mjmlSource = readFileSync(templatePath, "utf-8");

	const interpolated = interpolateTemplate(mjmlSource, data);

	const result = mjml2html(interpolated, {
		validationLevel: "soft",
		minify: true,
	});

	if (result.errors.length > 0) {
		console.warn(
			`MJML warnings for ${templateType}:`,
			result.errors.map((e) => e.message).join(", "),
		);
	}

	const text = generatePlainText(templateType, data);

	return { html: result.html, text };
}

/**
 * Interpolates template variables in MJML source.
 */
function interpolateTemplate(source: string, data: EmailTemplateData): string {
	return source
		.replace(/\{\{recipientName\}\}/g, data.recipientName)
		.replace(/\{\{recipientEmail\}\}/g, data.recipientEmail)
		.replace(/\{\{senderName\}\}/g, data.senderName)
		.replace(/\{\{senderEmail\}\}/g, data.senderEmail)
		.replace(/\{\{brokerName\}\}/g, data.brokerName)
		.replace(/\{\{brokerDomain\}\}/g, data.brokerDomain)
		.replace(/\{\{profileUrl\}\}/g, data.profileUrl ?? "N/A")
		.replace(/\{\{piiFields\}\}/g, data.piiFields.join(", "))
		.replace(/\{\{legalReference\}\}/g, data.legalReference)
		.replace(/\{\{deadline\}\}/g, data.deadline)
		.replace(/\{\{requestId\}\}/g, data.requestId);
}

/**
 * Generates a plain-text version of the email.
 */
function generatePlainText(templateType: EmailTemplateType, data: EmailTemplateData): string {
	switch (templateType) {
		case "ccpa_delete":
			return `Data Deletion Request Under CCPA — Request ID: ${data.requestId}

To: ${data.recipientName} (${data.brokerDomain})

I am writing to exercise my right to deletion under the California Consumer Privacy Act (CCPA), Cal. Civ. Code §1798.105.

I request that ${data.brokerName} delete all personal information collected about me, including but not limited to: ${data.piiFields.join(", ")}.

${data.profileUrl ? `My profile URL: ${data.profileUrl}` : ""}

Please confirm deletion within 45 days as required by CCPA.

Name: ${data.senderName}
Email: ${data.senderEmail}
Request ID: ${data.requestId}
Deadline: ${data.deadline}`;

		case "gdpr_delete":
			return `Right to Erasure Request Under GDPR — Request ID: ${data.requestId}

To: ${data.recipientName} (${data.brokerDomain})

I am writing to exercise my right to erasure (right to be forgotten) under Article 17 of the General Data Protection Regulation (GDPR).

I request that ${data.brokerName} erase all personal data held about me, including: ${data.piiFields.join(", ")}.

${data.profileUrl ? `Profile reference: ${data.profileUrl}` : ""}

Please confirm erasure within 30 days as required by GDPR Art. 12(3).

Name: ${data.senderName}
Email: ${data.senderEmail}
Request ID: ${data.requestId}
Deadline: ${data.deadline}`;

		case "generic_optout":
			return `Personal Data Opt-Out Request — Request ID: ${data.requestId}

To: ${data.recipientName} (${data.brokerDomain})

I am writing to request removal of my personal information from your database.

Please remove the following data: ${data.piiFields.join(", ")}.

${data.profileUrl ? `Profile URL: ${data.profileUrl}` : ""}

Please confirm removal at your earliest convenience.

Name: ${data.senderName}
Email: ${data.senderEmail}
Request ID: ${data.requestId}`;

		case "followup":
			return `Follow-Up: Data Deletion Request ${data.requestId}

To: ${data.recipientName} (${data.brokerDomain})

I am following up on my previous data deletion request (ID: ${data.requestId}).

I have not yet received confirmation that my personal data has been deleted from ${data.brokerName}.

The compliance deadline is ${data.deadline}. Please provide a status update.

Name: ${data.senderName}
Email: ${data.senderEmail}
Request ID: ${data.requestId}`;
	}
}
