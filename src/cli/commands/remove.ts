import * as p from "@clack/prompts";
import { RemovalAgent } from "../../agents/removal.js";
import { Store } from "../../state/store.js";
import { initConfig } from "../../config/index.js";
import { runMigrations } from "../../state/migrate.js";
import { getDatabase } from "../../state/database.js";
import * as ui from "../ui.js";

export async function removeCommand(): Promise<void> {
	ui.header();
	p.intro("Starting data removal campaigns");

	try {
		initConfig();
	} catch {
		ui.error("Configuration not found. Run `bun run dev setup` first.");
		return;
	}

	const db = getDatabase();
	runMigrations(db);

	const store = new Store();
	const profiles = store.listProfiles();

	if (profiles.length === 0) {
		ui.warn("No profiles found. Run `bun run dev scan` first.");
		return;
	}

	const profileId = await p.select({
		message: "Select profile to process:",
		options: profiles.map((p) => ({
			value: p.id,
			label: `Profile ${p.id.slice(0, 8)} (created ${p.createdAt})`,
		})),
	});
	if (p.isCancel(profileId)) return;

	const foundRecords = store.getBrokersByStatus("found").filter((r) => r.profileId === profileId);

	if (foundRecords.length === 0) {
		ui.warn("No brokers with matching data found for this profile.");
		return;
	}

	ui.info(`Found ${foundRecords.length} brokers with your data.`);

	const confirm = await p.confirm({
		message: `Start opt-out process for ${foundRecords.length} brokers?`,
	});
	if (p.isCancel(confirm) || !confirm) return;

	const s = p.spinner();
	s.start("Processing removal requests...");

	const agent = new RemovalAgent();
	const result = await agent.run({ profileId });

	s.stop("Removal processing complete");

	if (result.success) {
		ui.success(result.message);
	} else {
		ui.warn(result.message);
	}

	p.outro("Run `bun run dev status` to check progress.");
}
