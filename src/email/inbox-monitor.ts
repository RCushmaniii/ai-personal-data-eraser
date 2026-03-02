import type { InboxMessage, ClassifiedResponse } from "../types/index.js";
import { classifyResponse } from "../ai/response-parser.js";
import { getConfig } from "../config/index.js";

/**
 * Monitors inbox for responses from data brokers.
 *
 * Note: Full IMAP implementation requires an IMAP client library.
 * This module provides the processing pipeline — IMAP connection
 * should be added when the email monitoring feature is activated.
 */

export interface InboxMonitorOptions {
	/** Known broker email domains to watch for */
	brokerDomains: string[];
	/** Callback when a response is classified */
	onResponse?: (response: ClassifiedResponse) => Promise<void>;
}

export class InboxMonitor {
	private brokerDomains: Set<string>;
	private onResponse?: (response: ClassifiedResponse) => Promise<void>;
	private running = false;

	constructor(options: InboxMonitorOptions) {
		this.brokerDomains = new Set(options.brokerDomains);
		this.onResponse = options.onResponse;
	}

	/**
	 * Processes a batch of inbox messages, classifying those from broker domains.
	 */
	async processMessages(messages: InboxMessage[]): Promise<ClassifiedResponse[]> {
		const results: ClassifiedResponse[] = [];

		for (const message of messages) {
			if (message.processed) continue;

			const fromDomain = this.extractDomain(message.from);
			if (!this.isBrokerEmail(fromDomain)) continue;

			const brokerId = this.domainToBrokerId(fromDomain);
			const classified = await classifyResponse(
				message.body,
				message.subject,
				brokerId,
			);
			classified.messageUid = message.uid;

			results.push(classified);

			if (this.onResponse) {
				await this.onResponse(classified);
			}
		}

		return results;
	}

	/**
	 * Adds a broker domain to watch.
	 */
	addBrokerDomain(domain: string): void {
		this.brokerDomains.add(domain.toLowerCase());
	}

	/**
	 * Checks if an email is from a known broker domain.
	 */
	private isBrokerEmail(domain: string): boolean {
		return this.brokerDomains.has(domain.toLowerCase());
	}

	/**
	 * Extracts domain from an email address.
	 */
	private extractDomain(email: string): string {
		const match = email.match(/@([^>]+)/);
		return match ? match[1].toLowerCase() : "";
	}

	/**
	 * Maps a domain to a broker ID (simple version — strips TLD).
	 */
	private domainToBrokerId(domain: string): string {
		return domain.split(".")[0];
	}

	get isRunning(): boolean {
		return this.running;
	}
}
