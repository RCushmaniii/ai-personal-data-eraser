import type { Page } from "playwright";
import { PlaybookRunner } from "../brokers/playbook-runner.js";
import { getRegistry } from "../brokers/registry.js";
import { Store } from "../state/store.js";
import type { AgentResult, PiiSearchQuery } from "../types/index.js";
import { BaseAgent } from "./base-agent.js";

/**
 * Monitor Agent — re-checks brokers to verify removals and detect re-appearances.
 */
export class MonitorAgent extends BaseAgent {
	private page: Page | null;
	private store = new Store();

	constructor(page?: Page) {
		super("monitor");
		this.page = page ?? null;
	}

	async execute(payload: Record<string, unknown>): Promise<AgentResult> {
		const query = payload as unknown as PiiSearchQuery & { profileId: string };
		const registry = getRegistry();
		const runner = new PlaybookRunner(this.page ?? undefined);

		const confirmedRecords = this.store.getBrokersByStatus("removal_confirmed");
		const submittedRecords = this.store.getBrokersByStatus("opt_out_submitted");
		const awaitingRecords = this.store.getBrokersByStatus("awaiting_confirmation");

		const toCheck = [...confirmedRecords, ...submittedRecords, ...awaitingRecords].filter(
			(r) => r.profileId === query.profileId,
		);

		this.logAction("monitor_start", `Checking ${toCheck.length} brokers`);

		let confirmed = 0;
		let reAppeared = 0;
		let stillPending = 0;

		for (const record of toCheck) {
			const playbook = registry.getPlaybook(record.brokerId);
			if (!playbook) continue;

			this.logAction("recheck", `Re-checking ${record.brokerId}`);

			try {
				const verifyResult = await runner.runVerify(playbook, query);

				if (record.status === "removal_confirmed") {
					// Check for re-appearance
					if (verifyResult.success) {
						this.store.updateBrokerStatus(record.id, "re_appeared");
						reAppeared++;
						this.logAction("reappeared", `Data re-appeared on ${record.brokerId}`);
					} else {
						confirmed++;
					}
				} else {
					// Check if removal has taken effect
					if (!verifyResult.success) {
						this.store.updateBrokerStatus(record.id, "removal_confirmed");
						confirmed++;
						this.logAction("confirmed", `Removal confirmed for ${record.brokerId}`);
					} else {
						stillPending++;
					}
				}
			} catch (error) {
				this.logAction("check_error", `Error checking ${record.brokerId}: ${error}`);
				stillPending++;
			}
		}

		return {
			success: true,
			message: `Monitor complete. ${confirmed} confirmed, ${reAppeared} re-appeared, ${stillPending} still pending.`,
			actions: this.actions,
			data: { confirmed, reAppeared, stillPending, totalChecked: toCheck.length },
		};
	}
}
