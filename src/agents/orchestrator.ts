import { BaseAgent } from "./base-agent.js";
import { ReconAgent } from "./recon.js";
import { RemovalAgent } from "./removal.js";
import { LegalAgent } from "./legal.js";
import { MonitorAgent } from "./monitor.js";
import { Store } from "../state/store.js";
import type { AgentResult, AgentType, PiiSearchQuery, LegalFramework } from "../types/index.js";

export interface CampaignConfig {
	profileId: string;
	query: PiiSearchQuery;
	senderName: string;
	senderEmail: string;
	legalFramework: LegalFramework;
	piiFields: string[];
	/** Run specific phases only */
	phases?: ("recon" | "removal" | "legal" | "monitor")[];
}

/**
 * Orchestrator Agent — coordinates campaign execution across all specialized agents.
 * Manages the full lifecycle: recon → removal → legal follow-up → monitoring.
 */
export class OrchestratorAgent extends BaseAgent {
	private recon = new ReconAgent();
	private removal = new RemovalAgent();
	private legal = new LegalAgent();
	private monitor = new MonitorAgent();
	private store = new Store();

	constructor() {
		super("orchestrator");
	}

	async execute(payload: Record<string, unknown>): Promise<AgentResult> {
		const config = payload as unknown as CampaignConfig;
		const phases = config.phases ?? ["recon", "removal", "legal", "monitor"];
		const phaseResults: Record<string, AgentResult> = {};

		this.logAction("campaign_start", `Starting campaign with phases: ${phases.join(", ")}`);

		// Phase 1: Reconnaissance
		if (phases.includes("recon")) {
			this.logAction("phase", "Starting reconnaissance phase");
			const reconResult = await this.recon.run({
				...config.query,
				profileId: config.profileId,
			});
			phaseResults.recon = reconResult;

			if (!reconResult.success) {
				return {
					success: false,
					message: `Recon failed: ${reconResult.message}`,
					actions: this.actions,
					data: { phaseResults },
				};
			}

			this.store.addAuditEntry(
				"recon_complete",
				"orchestrator",
				reconResult.message,
				true,
				undefined,
				config.profileId,
			);
		}

		// Phase 2: Removal
		if (phases.includes("removal")) {
			this.logAction("phase", "Starting removal phase");
			const removalResult = await this.removal.run({
				...config.query,
				profileId: config.profileId,
			});
			phaseResults.removal = removalResult;

			this.store.addAuditEntry(
				"removal_complete",
				"orchestrator",
				removalResult.message,
				removalResult.success,
				undefined,
				config.profileId,
			);
		}

		// Phase 3: Legal requests
		if (phases.includes("legal")) {
			this.logAction("phase", "Starting legal request phase");
			const legalResult = await this.legal.run({
				profileId: config.profileId,
				senderName: config.senderName,
				senderEmail: config.senderEmail,
				framework: config.legalFramework,
				piiFields: config.piiFields,
			});
			phaseResults.legal = legalResult;

			this.store.addAuditEntry(
				"legal_complete",
				"orchestrator",
				legalResult.message,
				legalResult.success,
				undefined,
				config.profileId,
			);
		}

		// Phase 4: Monitoring
		if (phases.includes("monitor")) {
			this.logAction("phase", "Starting monitor phase");
			const monitorResult = await this.monitor.run({
				...config.query,
				profileId: config.profileId,
			});
			phaseResults.monitor = monitorResult;
		}

		const summary = this.store.getCampaignSummary(config.profileId);

		return {
			success: true,
			message: `Campaign complete. ${summary.total} brokers tracked, ${summary.confirmed} removals confirmed.`,
			actions: this.actions,
			data: { phaseResults, summary },
		};
	}

	/**
	 * Runs a single phase independently.
	 */
	async runPhase(
		phase: "recon" | "removal" | "legal" | "monitor",
		config: CampaignConfig,
	): Promise<AgentResult> {
		return this.execute({ ...config, phases: [phase] } as unknown as Record<string, unknown>);
	}
}
