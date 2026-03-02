import { BrowserManager } from "../brokers/browser.js";
import { Store } from "../state/store.js";
import type { AgentResult, LegalFramework, PiiSearchQuery } from "../types/index.js";
import { BaseAgent } from "./base-agent.js";
import { LegalAgent } from "./legal.js";
import { MonitorAgent } from "./monitor.js";
import { ReconAgent } from "./recon.js";
import { RemovalAgent } from "./removal.js";

export interface CampaignConfig {
	profileId: string;
	query: PiiSearchQuery;
	senderName: string;
	senderEmail: string;
	legalFramework: LegalFramework;
	piiFields: string[];
	/** Run specific phases only */
	phases?: ("recon" | "removal" | "legal" | "monitor")[];
	/** Run browser in headed mode for debugging */
	headless?: boolean;
}

/**
 * Orchestrator Agent — coordinates campaign execution across all specialized agents.
 * Manages the full lifecycle: recon → removal → legal follow-up → monitoring.
 * Launches a shared browser instance for recon/removal/monitor agents.
 */
export class OrchestratorAgent extends BaseAgent {
	private store = new Store();

	constructor() {
		super("orchestrator");
	}

	async execute(payload: Record<string, unknown>): Promise<AgentResult> {
		const config = payload as unknown as CampaignConfig;
		const phases = config.phases ?? ["recon", "removal", "legal", "monitor"];
		const phaseResults: Record<string, AgentResult> = {};

		this.logAction("campaign_start", `Starting campaign with phases: ${phases.join(", ")}`);

		// Launch browser for phases that need it
		const browserPhases = phases.filter((p) => p !== "legal");
		const browserManager = new BrowserManager();
		let page: Awaited<ReturnType<BrowserManager["newPage"]>> | null = null;

		if (browserPhases.length > 0) {
			try {
				await browserManager.launch(config.headless ?? true);
				page = await browserManager.newPage();
				this.logAction("browser_launched", "Browser launched for automation");
			} catch (error) {
				this.logAction(
					"browser_fallback",
					`Browser launch failed, falling back to dry-run: ${error instanceof Error ? error.message : error}`,
				);
				// page stays null — agents will run in dry-run mode
			}
		}

		try {
			// Create agents with optional page
			const recon = new ReconAgent(page ?? undefined);
			const removal = new RemovalAgent(page ?? undefined);
			const legal = new LegalAgent();
			const monitor = new MonitorAgent(page ?? undefined);

			// Phase 1: Reconnaissance
			if (phases.includes("recon")) {
				this.logAction("phase", "Starting reconnaissance phase");
				const reconResult = await recon.run({
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
				const removalResult = await removal.run({
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

			// Phase 3: Legal requests (no browser needed)
			if (phases.includes("legal")) {
				this.logAction("phase", "Starting legal request phase");
				const legalResult = await legal.run({
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
				const monitorResult = await monitor.run({
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
		} finally {
			// Always close browser
			if (browserManager.isRunning) {
				await browserManager.close();
				this.logAction("browser_closed", "Browser closed");
			}
		}
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
