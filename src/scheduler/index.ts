import { Cron } from "croner";
import { getConfig } from "../config/index.js";
import { ReconAgent } from "../agents/recon.js";
import { MonitorAgent } from "../agents/monitor.js";
import { Store } from "../state/store.js";

interface SchedulerOptions {
	/** Override scan cron expression */
	scanCron?: string;
	/** Override recheck cron expression */
	recheckCron?: string;
	/** Override inbox cron expression */
	inboxCron?: string;
}

const jobs: Cron[] = [];

/**
 * Starts the scheduled task runner.
 * Runs recon scans, re-checks, and inbox monitoring on cron schedules.
 */
export function startScheduler(options?: SchedulerOptions): void {
	const config = getConfig();
	const store = new Store();

	if (!config.scheduler.enabled) {
		console.log("  Scheduler is disabled. Set SCHEDULER_ENABLED=true to enable.");
		return;
	}

	const scanCron = options?.scanCron ?? config.scheduler.scanCron;
	const recheckCron = options?.recheckCron ?? config.scheduler.recheckCron;
	const inboxCron = options?.inboxCron ?? config.scheduler.inboxCron;

	// Periodic scan for new data appearances
	const scanJob = new Cron(scanCron, async () => {
		console.log(`[${new Date().toISOString()}] Running scheduled scan...`);
		const profiles = store.listProfiles();

		for (const profile of profiles) {
			const recon = new ReconAgent();
			await recon.run({ profileId: profile.id });
		}
	});
	jobs.push(scanJob);

	// Re-check removed brokers for re-appearances
	const recheckJob = new Cron(recheckCron, async () => {
		console.log(`[${new Date().toISOString()}] Running scheduled re-check...`);
		const profiles = store.listProfiles();

		for (const profile of profiles) {
			const monitor = new MonitorAgent();
			await monitor.run({ profileId: profile.id });
		}
	});
	jobs.push(recheckJob);

	// Inbox monitoring
	const inboxJob = new Cron(inboxCron, async () => {
		console.log(`[${new Date().toISOString()}] Checking inbox...`);
		// TODO: Implement IMAP inbox check
	});
	jobs.push(inboxJob);

	console.log("  Scheduler started:");
	console.log(`    Scan:    ${scanCron}`);
	console.log(`    Recheck: ${recheckCron}`);
	console.log(`    Inbox:   ${inboxCron}`);
}

/**
 * Stops all scheduled jobs.
 */
export function stopScheduler(): void {
	for (const job of jobs) {
		job.stop();
	}
	jobs.length = 0;
	console.log("  Scheduler stopped.");
}
