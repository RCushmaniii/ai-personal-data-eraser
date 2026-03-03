import * as p from "@clack/prompts";
import { ReconAgent } from "../../agents/recon.js";
import { getConfig, initConfig } from "../../config/index.js";
import { Vault } from "../../security/vault.js";
import { getDatabase } from "../../state/database.js";
import { runMigrations } from "../../state/migrate.js";
import { Store } from "../../state/store.js";
import * as ui from "../ui.js";

export async function scanCommand(): Promise<void> {
	ui.header();
	p.intro("Scanning data brokers for your personal information");

	try {
		initConfig();
	} catch {
		ui.error("Configuration not found. Run `bun run dev setup` first.");
		return;
	}

	const db = getDatabase();
	runMigrations(db);

	// Collect PII for search
	const inputs = await p.group({
		firstName: () =>
			p.text({ message: "First name:", validate: (v) => (!v ? "Required" : undefined) }),
		lastName: () =>
			p.text({ message: "Last name:", validate: (v) => (!v ? "Required" : undefined) }),
		state: () => p.text({ message: "State (optional):", placeholder: "e.g. CA" }),
		city: () => p.text({ message: "City (optional):", placeholder: "e.g. Los Angeles" }),
	});
	if (p.isCancel(inputs)) return;

	// Store PII in vault
	const vaultPassword = await p.password({
		message: "Vault password:",
	});
	if (p.isCancel(vaultPassword)) return;

	const s = p.spinner();
	s.start("Encrypting your data...");

	const vault = new Vault(getConfig().vault.dataDir);
	await vault.unlock(vaultPassword);
	const profileData = JSON.stringify(inputs);
	const store = new Store();
	const profileId = store.createProfile(`profile-${Date.now()}`);
	await vault.store(profileId, profileData);
	vault.lock();
	s.stop("Data encrypted in vault");

	// Run recon
	s.start("Scanning brokers (this may take a while)...");
	const recon = new ReconAgent();
	const result = await recon.run({
		firstName: inputs.firstName,
		lastName: inputs.lastName,
		state: inputs.state || undefined,
		city: inputs.city || undefined,
		profileId,
	});
	s.stop("Scan complete");

	if (result.success) {
		ui.success(result.message);
	} else {
		ui.error(result.message);
	}

	if (result.data) {
		const data = result.data as { totalScanned: number; totalFound: number };
		console.log();
		ui.info(`Scanned: ${data.totalScanned} brokers`);
		ui.info(`Found:   ${data.totalFound} matches`);
	}

	p.outro("Run `bun run dev remove` to start opt-out requests.");
}
