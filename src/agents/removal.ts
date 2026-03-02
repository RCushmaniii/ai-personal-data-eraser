import { BaseAgent } from "./base-agent.js";
import { getRegistry } from "../brokers/registry.js";
import { PlaybookRunner } from "../brokers/playbook-runner.js";
import { Store } from "../state/store.js";
import type { AgentResult, PiiSearchQuery } from "../types/index.js";

/**
 * Removal Agent — executes opt-out playbooks on brokers where data was found.
 */
export class RemovalAgent extends BaseAgent {
	private runner = new PlaybookRunner();
	private store = new Store();

	constructor() {
		super("removal");
	}

	async execute(payload: Record<string, unknown>): Promise<AgentResult> {
		const { profileId } = payload as { profileId: string };
		const query = payload as unknown as PiiSearchQuery & { profileId: string };
		const registry = getRegistry();

		const records = this.store.getBrokersByStatus("found");
		const profileRecords = records.filter((r) => r.profileId === profileId);

		this.logAction("removal_start", `Processing ${profileRecords.length} brokers for removal`);

		let succeeded = 0;
		let failed = 0;

		for (const record of profileRecords) {
			const playbook = registry.getPlaybook(record.brokerId);
			if (!playbook) {
				this.logAction("skip", `No playbook for ${record.brokerId}`);
				continue;
			}

			this.logAction("optout_start", `Starting opt-out for ${record.brokerId}`, {
				recordId: record.id,
			});
			this.store.updateBrokerStatus(record.id, "opt_out_started");

			try {
				const result = await this.runner.runOptOut(playbook, query);

				if (result.success) {
					this.store.updateBrokerStatus(record.id, "opt_out_submitted");
					this.store.incrementBrokerAttempts(record.id);
					succeeded++;
					this.logAction("optout_submitted", `Opt-out submitted for ${record.brokerId}`);
				} else {
					this.store.updateBrokerStatus(record.id, "removal_failed", "Opt-out playbook failed");
					this.store.incrementBrokerAttempts(record.id);
					failed++;
					this.logAction("optout_failed", `Opt-out failed for ${record.brokerId}`);
				}
			} catch (error) {
				this.store.updateBrokerStatus(
					record.id,
					"removal_failed",
					error instanceof Error ? error.message : String(error),
				);
				failed++;
			}
		}

		return {
			success: failed === 0,
			message: `Removal complete. ${succeeded} succeeded, ${failed} failed out of ${profileRecords.length} brokers.`,
			actions: this.actions,
			data: { succeeded, failed, total: profileRecords.length },
		};
	}
}
