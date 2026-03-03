import * as p from "@clack/prompts";
import { getDatabase } from "../../state/database.js";
import { runMigrations } from "../../state/migrate.js";
import { Store } from "../../state/store.js";
import type { BrokerStatus } from "../../types/index.js";
import * as ui from "../ui.js";

const ALL_STATUSES: BrokerStatus[] = [
	"discovered",
	"scanning",
	"found",
	"not_found",
	"opt_out_started",
	"opt_out_submitted",
	"verification_needed",
	"awaiting_confirmation",
	"removal_confirmed",
	"removal_failed",
	"re_appeared",
];

export async function updateCommand(): Promise<void> {
	ui.header();
	p.intro("Manually update a broker record's status");

	const db = getDatabase();
	runMigrations(db);

	const store = new Store();
	const records = store.listBrokerRecords();

	if (records.length === 0) {
		ui.warn("No broker records found. Run `bun run dev scan` first.");
		return;
	}

	// Select record
	const recordId = await p.select({
		message: "Select a broker record:",
		options: records.map((r) => ({
			value: r.id,
			label: `${r.brokerId} — [${r.status}] (${r.updatedAt.slice(0, 10)})`,
		})),
	});
	if (p.isCancel(recordId)) return;

	const record = store.getBrokerRecord(recordId as string)!;

	// Show current info
	console.log();
	ui.info(`Broker:  ${record.brokerId}`);
	ui.info(`Status:  ${ui.statusBadge(record.status)}`);
	ui.info(`Notes:   ${record.notes ?? "(none)"}`);
	console.log();

	// Select new status (filter out current)
	const availableStatuses = ALL_STATUSES.filter((s) => s !== record.status);

	const newStatus = await p.select({
		message: "New status:",
		options: availableStatuses.map((s) => ({
			value: s,
			label: s.replace(/_/g, " "),
		})),
	});
	if (p.isCancel(newStatus)) return;

	// Optional notes
	const notes = await p.text({
		message: "Notes (optional):",
		placeholder: "Reason for status change",
	});
	if (p.isCancel(notes)) return;

	// Apply update
	store.updateBrokerStatus(record.id, newStatus as BrokerStatus, notes || undefined);

	// Audit log
	store.addAuditEntry(
		"manual_status_update",
		"cli",
		JSON.stringify({
			brokerId: record.brokerId,
			before: record.status,
			after: newStatus,
			notes: notes || undefined,
		}),
		true,
		record.brokerId,
		record.profileId,
	);

	console.log();
	ui.success(`Updated ${record.brokerId}: ${record.status} → ${newStatus as string}`);
	p.outro("Done.");
}
