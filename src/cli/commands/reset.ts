import { readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { getConfig, initConfig } from "../../config/index.js";
import { getDatabase } from "../../state/database.js";
import { runMigrations } from "../../state/migrate.js";
import { Store } from "../../state/store.js";
import * as ui from "../ui.js";

export async function resetCommand(): Promise<void> {
	ui.header();
	p.intro("Clear campaign data from the database");

	try {
		initConfig();
	} catch {
		ui.error("Configuration not found. Run `bun run dev setup` first.");
		return;
	}

	const config = getConfig();
	const db = getDatabase();
	runMigrations(db);

	const store = new Store();

	// Show current data counts
	const counts = store.getDataCounts();
	console.log();
	ui.info("Current data:");
	ui.dim(`  Profiles:        ${counts.profiles}`);
	ui.dim(`  Broker records:  ${counts.broker_records}`);
	ui.dim(`  Agent tasks:     ${counts.agent_tasks}`);
	ui.dim(`  Audit log:       ${counts.audit_log}`);
	ui.dim(`  Emails:          ${counts.emails}`);
	ui.dim(`  Broker intel:    ${counts.broker_intel}`);
	console.log();

	const totalRows = Object.values(counts).reduce((sum, c) => sum + c, 0);
	if (totalRows === 0) {
		ui.info("Nothing to clear.");
		return;
	}

	// Select mode
	const mode = await p.select({
		message: "What would you like to clear?",
		options: [
			{
				value: "campaign",
				label: "Campaign data only",
				hint: "keeps broker intel (research data)",
			},
			{
				value: "everything",
				label: "Everything",
				hint: "all tables including broker intel",
			},
		],
	});
	if (p.isCancel(mode)) return;

	// Vault cleanup
	const deleteVault = await p.confirm({
		message: "Also delete encrypted vault files?",
		initialValue: true,
	});
	if (p.isCancel(deleteVault)) return;

	// Final confirmation
	const confirm = await p.confirm({
		message: "This will permanently delete data. Are you sure?",
		initialValue: false,
	});
	if (p.isCancel(confirm) || !confirm) {
		ui.info("Reset cancelled.");
		return;
	}

	// Log reset to audit before clearing
	store.addAuditEntry("data_reset", "cli", `Reset mode: ${mode}, vault: ${deleteVault}`, true);

	const s = p.spinner();
	s.start("Clearing data...");

	if (mode === "campaign") {
		store.clearCampaignData();
	} else {
		store.clearAll();
	}

	// Delete vault files
	if (deleteVault) {
		try {
			const vaultDir = config.vault.dataDir;
			const files = readdirSync(vaultDir);
			for (const file of files) {
				unlinkSync(join(vaultDir, file));
			}
		} catch {
			// Vault dir may not exist yet — that's fine
		}
	}

	s.stop("Data cleared");

	// Show what was cleared
	const after = store.getDataCounts();
	console.log();
	if (mode === "campaign") {
		ui.success("Campaign data cleared. Broker intel preserved.");
		ui.dim(`  Broker intel remaining: ${after.broker_intel}`);
	} else {
		ui.success("All data cleared.");
	}

	p.outro("Reset complete.");
}
