import { BaseAgent } from "./base-agent.js";
import { generateLegalRequest } from "../ai/response-parser.js";
import { renderTemplate } from "../email/template-renderer.js";
import { sendEmail } from "../email/sender.js";
import { Store } from "../state/store.js";
import { getRegistry } from "../brokers/registry.js";
import { randomUUID } from "node:crypto";
import type { AgentResult, EmailMessage, LegalFramework } from "../types/index.js";

/**
 * Legal Agent — generates and sends formal data deletion requests under CCPA/GDPR.
 */
export class LegalAgent extends BaseAgent {
	private store = new Store();

	constructor() {
		super("legal");
	}

	async execute(payload: Record<string, unknown>): Promise<AgentResult> {
		const {
			profileId,
			senderName,
			senderEmail,
			framework,
			piiFields,
		} = payload as {
			profileId: string;
			senderName: string;
			senderEmail: string;
			framework: LegalFramework;
			piiFields: string[];
		};

		const registry = getRegistry();
		const records = this.store.getBrokersByStatus("found");
		const profileRecords = records.filter((r) => r.profileId === profileId);

		this.logAction("legal_start", `Generating ${framework} requests for ${profileRecords.length} brokers`);

		let sent = 0;

		for (const record of profileRecords) {
			const broker = registry.getBroker(record.brokerId);
			if (!broker) continue;

			const templateType = framework === "ccpa" ? "ccpa_delete" : framework === "gdpr" ? "gdpr_delete" : "generic_optout";
			const requestId = randomUUID().slice(0, 8).toUpperCase();
			const deadline = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

			this.logAction("generate_request", `Generating ${framework} request for ${broker.name}`);

			try {
				const { html, text } = renderTemplate(templateType, {
					recipientName: "Privacy Department",
					recipientEmail: `privacy@${broker.domain}`,
					senderName,
					senderEmail,
					brokerName: broker.name,
					brokerDomain: broker.domain,
					profileUrl: record.profileUrl,
					piiFields,
					legalReference: `Request made under ${framework.toUpperCase()} provisions`,
					deadline,
					requestId,
				});

				const message: EmailMessage = {
					id: randomUUID(),
					to: `privacy@${broker.domain}`,
					from: senderEmail,
					subject: `Data Deletion Request — ${framework.toUpperCase()} — Ref: ${requestId}`,
					htmlBody: html,
					textBody: text,
					templateType,
					brokerId: broker.id,
					profileId,
					status: "queued",
				};

				await sendEmail(message);
				sent++;
				this.logAction("email_sent", `Sent ${framework} request to ${broker.name}`);
			} catch (error) {
				this.logAction("email_error", `Failed to send to ${broker.name}: ${error}`);
			}
		}

		return {
			success: true,
			message: `Sent ${sent} ${framework.toUpperCase()} deletion requests.`,
			actions: this.actions,
			data: { sent, total: profileRecords.length, framework },
		};
	}
}
