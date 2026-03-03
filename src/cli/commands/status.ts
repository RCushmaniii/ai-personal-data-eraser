import chalk from "chalk";
import { getRegistry } from "../../brokers/registry.js";
import { getDatabase } from "../../state/database.js";
import { runMigrations } from "../../state/migrate.js";
import { Store } from "../../state/store.js";
import type { BrokerDifficulty, BrokerIntel } from "../../types/index.js";
import * as ui from "../ui.js";

const TIER_ORDER: (BrokerDifficulty | "unknown")[] = [
	"easy",
	"medium",
	"hard",
	"very_hard",
	"unknown",
];

const TIER_LABELS: Record<string, string> = {
	easy: chalk.green("Easy"),
	medium: chalk.yellow("Medium"),
	hard: chalk.red("Hard"),
	very_hard: chalk.red.bold("Very Hard"),
	unknown: chalk.dim("Unknown"),
};

export async function statusCommand(): Promise<void> {
	ui.header();

	const db = getDatabase();
	runMigrations(db);

	const store = new Store();
	const records = store.listBrokerRecords();
	const intel = store.listBrokerIntel();

	// If nothing at all exists, bail early
	if (records.length === 0 && intel.length === 0) {
		ui.info("No data yet. Run `bun run dev scan` or `bun run dev research` first.");
		return;
	}

	// --- Campaign summary (if broker records exist) ---
	if (records.length > 0) {
		const summary = store.getCampaignSummary();
		console.log();
		console.log(`  ${chalk.bold("Campaign Summary")}`);
		console.log(
			`  Total: ${summary.total}  |  Found: ${chalk.yellow(String(summary.found))}  |  Opt-out: ${chalk.cyan(String(summary.optOutStarted))}  |  Confirmed: ${chalk.green(String(summary.confirmed))}  |  Failed: ${chalk.red(String(summary.failed))}  |  Pending: ${summary.pending}`,
		);
		console.log();
	}

	// --- Tier-grouped display (if broker intel exists) ---
	if (intel.length > 0) {
		// Build a lookup: brokerId → record status
		const statusByBroker = new Map<string, string>();
		for (const record of records) {
			statusByBroker.set(record.brokerId, record.status);
		}

		// Group intel by difficulty tier
		const tiers = new Map<string, BrokerIntel[]>();
		for (const item of intel) {
			if (item.status === "fetch_failed") continue;
			const tier = item.difficulty ?? "unknown";
			if (!tiers.has(tier)) tiers.set(tier, []);
			tiers.get(tier)!.push(item);
		}

		// Display each tier in order
		for (const tier of TIER_ORDER) {
			const items = tiers.get(tier);
			if (!items || items.length === 0) continue;

			console.log(`  ${TIER_LABELS[tier]} (${items.length})`);

			const rows = items.map((item) => {
				const removalStatus =
					statusByBroker.get(item.domain) ?? statusByBroker.get(item.id) ?? "not started";
				const method = item.optOutMethod ?? "—";
				const days = item.estimatedDays != null ? `${item.estimatedDays}d` : "—";
				const statusDisplay =
					removalStatus === "not started"
						? chalk.dim(removalStatus)
						: ui.statusBadge(removalStatus as Parameters<typeof ui.statusBadge>[0]);

				return [item.name, method, days, statusDisplay];
			});

			ui.table(rows, ["Broker", "Opt-out Method", "Est. Days", "Removal Status"]);
			console.log();
		}

		// Tier counts summary
		const tierCounts = TIER_ORDER.filter((t) => tiers.has(t))
			.map((t) => `${TIER_LABELS[t]}: ${tiers.get(t)!.length}`)
			.join("  |  ");
		ui.dim(tierCounts);
	} else if (records.length > 0) {
		// Fallback: flat table if no broker intel exists
		let registry: ReturnType<typeof getRegistry> | null = null;
		try {
			registry = getRegistry();
		} catch {
			// Registry may not be available
		}

		const rows = records.map((record) => {
			const broker = registry?.getBroker(record.brokerId);
			return [
				broker?.name ?? record.brokerId,
				ui.statusBadge(record.status),
				`${(record.matchConfidence * 100).toFixed(0)}%`,
				`${record.attempts}`,
				record.updatedAt?.slice(0, 10) ?? "—",
			];
		});

		ui.table(rows, ["Broker", "Status", "Confidence", "Attempts", "Updated"]);
	}
}
