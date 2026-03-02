import { Store } from "../../state/store.js";
import { getRegistry } from "../../brokers/registry.js";
import { runMigrations } from "../../state/migrate.js";
import { getDatabase } from "../../state/database.js";
import * as ui from "../ui.js";
import type { BrokerStatus } from "../../types/index.js";

export async function statusCommand(): Promise<void> {
	ui.header();

	const db = getDatabase();
	runMigrations(db);

	const store = new Store();
	const registry = getRegistry();
	const records = store.listBrokerRecords();

	if (records.length === 0) {
		ui.info("No broker records yet. Run `bun run dev scan` first.");
		return;
	}

	console.log();

	const rows = records.map((record) => {
		const broker = registry.getBroker(record.brokerId);
		return [
			broker?.name ?? record.brokerId,
			ui.statusBadge(record.status),
			`${(record.matchConfidence * 100).toFixed(0)}%`,
			`${record.attempts}`,
			record.updatedAt?.slice(0, 10) ?? "—",
		];
	});

	ui.table(rows, ["Broker", "Status", "Confidence", "Attempts", "Updated"]);

	const summary = store.getCampaignSummary();
	console.log();
	ui.info(`Total: ${summary.total} | Found: ${summary.found} | Removed: ${summary.confirmed} | Failed: ${summary.failed} | Pending: ${summary.pending}`);
}
