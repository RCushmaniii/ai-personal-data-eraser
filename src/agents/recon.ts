import type { Page } from "playwright";
import { PlaybookRunner } from "../brokers/playbook-runner.js";
import { getRegistry } from "../brokers/registry.js";
import { Store } from "../state/store.js";
import type { AgentResult, PiiSearchQuery } from "../types/index.js";
import { BaseAgent } from "./base-agent.js";

/**
 * Recon Agent — scans data brokers to find where a person's data appears.
 */
export class ReconAgent extends BaseAgent {
	private page: Page | null;
	private store = new Store();

	constructor(page?: Page) {
		super("recon");
		this.page = page ?? null;
	}

	async execute(payload: Record<string, unknown>): Promise<AgentResult> {
		const query = payload as unknown as PiiSearchQuery & { profileId: string };
		const registry = getRegistry();
		const brokers = registry.listBrokers();
		const runner = new PlaybookRunner(this.page ?? undefined);

		this.logAction("scan_start", `Scanning ${brokers.length} brokers`, {
			query: `${query.firstName} ${query.lastName}`,
		});

		const results: { brokerId: string; found: boolean; url?: string }[] = [];

		for (const broker of brokers) {
			const playbook = registry.getPlaybook(broker.id);
			if (!playbook) continue;

			this.logAction("scan_broker", `Scanning ${broker.name}`, { brokerId: broker.id });

			try {
				const searchResult = await runner.runSearch(playbook, query);

				if (searchResult.success) {
					this.store.createBrokerRecord(broker.id, query.profileId, {
						matchConfidence: 0.5,
					});
					results.push({ brokerId: broker.id, found: true });
					this.logAction("match_found", `Found on ${broker.name}`, { brokerId: broker.id });
				} else {
					results.push({ brokerId: broker.id, found: false });
				}
			} catch (error) {
				this.logAction("scan_error", `Error scanning ${broker.name}: ${error}`, {
					brokerId: broker.id,
				});
				results.push({ brokerId: broker.id, found: false });
			}
		}

		const found = results.filter((r) => r.found).length;
		return {
			success: true,
			message: `Scan complete. Found data on ${found}/${brokers.length} brokers.`,
			actions: this.actions,
			data: { results, totalScanned: brokers.length, totalFound: found },
		};
	}
}
