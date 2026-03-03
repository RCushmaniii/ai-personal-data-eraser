import * as p from "@clack/prompts";
import type { CampaignConfig } from "../../agents/orchestrator.js";
import { OrchestratorAgent } from "../../agents/orchestrator.js";
import { getConfig, initConfig } from "../../config/index.js";
import { Vault } from "../../security/vault.js";
import { getDatabase } from "../../state/database.js";
import { runMigrations } from "../../state/migrate.js";
import { Store } from "../../state/store.js";
import type { LegalFramework, PiiSearchQuery } from "../../types/index.js";
import * as ui from "../ui.js";

export async function campaignCommand(): Promise<void> {
	ui.header();
	p.intro("Run the full removal pipeline");

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
	const vault = new Vault(config.vault.dataDir);

	// --- Profile selection ---
	const profiles = store.listProfiles();
	let profileId: string;
	let query: PiiSearchQuery;
	let vaultPassword: string;

	const profileChoice = await p.select({
		message: "Select a profile or create a new one:",
		options: [
			{ value: "__new__", label: "Create new profile" },
			...profiles.map((prof) => ({
				value: prof.id,
				label: `Profile ${prof.id.slice(0, 8)} (created ${prof.createdAt.slice(0, 10)})`,
			})),
		],
	});
	if (p.isCancel(profileChoice)) return;

	if (profileChoice === "__new__") {
		// Collect PII
		const inputs = await p.group({
			firstName: () =>
				p.text({ message: "First name:", validate: (v) => (!v ? "Required" : undefined) }),
			lastName: () =>
				p.text({ message: "Last name:", validate: (v) => (!v ? "Required" : undefined) }),
			state: () => p.text({ message: "State (optional):", placeholder: "e.g. CA" }),
			city: () => p.text({ message: "City (optional):", placeholder: "e.g. Los Angeles" }),
		});
		if (p.isCancel(inputs)) return;

		const pw = await p.password({
			message: "Vault password:",
			validate: (v) => {
				if (v.length < 8) return "Password must be at least 8 characters";
			},
		});
		if (p.isCancel(pw)) return;
		vaultPassword = pw;

		const s = p.spinner();
		s.start("Encrypting profile data...");

		await vault.unlock(vaultPassword);
		const vaultRef = `profile-${Date.now()}`;
		profileId = store.createProfile(vaultRef);
		const profileData = JSON.stringify({
			firstName: inputs.firstName,
			lastName: inputs.lastName,
			state: inputs.state || undefined,
			city: inputs.city || undefined,
		});
		await vault.store(vaultRef, profileData);
		vault.lock();
		s.stop("Profile created and encrypted");

		// Build query from in-memory data (no re-decrypt needed)
		query = {
			firstName: inputs.firstName,
			lastName: inputs.lastName,
			state: inputs.state || undefined,
			city: inputs.city || undefined,
		};
	} else {
		profileId = profileChoice as string;

		const pw = await p.password({ message: "Vault password:" });
		if (p.isCancel(pw)) return;
		vaultPassword = pw;

		const s = p.spinner();
		s.start("Decrypting profile data...");

		const profile = store.getProfile(profileId);
		if (!profile) {
			s.stop("Failed");
			ui.error("Profile not found.");
			return;
		}

		try {
			await vault.unlock(vaultPassword);
			const raw = await vault.retrieve(profile.vaultRef);
			vault.lock();
			const pii = JSON.parse(raw);
			query = {
				firstName: pii.firstName,
				lastName: pii.lastName,
				state: pii.state || undefined,
				city: pii.city || undefined,
			};
			s.stop("Profile decrypted");
		} catch (error) {
			vault.lock();
			s.stop("Decryption failed");
			ui.error(`Could not decrypt profile: ${error instanceof Error ? error.message : error}`);
			return;
		}
	}

	// --- Phase selection ---
	const phases = await p.multiselect({
		message: "Select campaign phases:",
		options: [
			{ value: "recon", label: "Recon — discover broker listings", hint: "recommended" },
			{ value: "removal", label: "Removal — submit opt-out requests" },
			{ value: "legal", label: "Legal — send CCPA/GDPR emails" },
			{ value: "monitor", label: "Monitor — check removal status" },
		],
		initialValues: ["recon", "removal", "legal", "monitor"],
	});
	if (p.isCancel(phases)) return;

	// --- Legal config (if legal phase selected) ---
	let senderName = "";
	let senderEmail = "";
	let legalFramework: LegalFramework = "ccpa";
	const piiFields: string[] = ["first_name", "last_name"];

	if (phases.includes("legal")) {
		const legalInputs = await p.group({
			framework: () =>
				p.select({
					message: "Legal framework for removal requests:",
					options: [
						{ value: "ccpa", label: "CCPA (California)" },
						{ value: "gdpr", label: "GDPR (EU)" },
						{ value: "generic", label: "Generic opt-out" },
					],
				}),
			senderName: () =>
				p.text({
					message: "Your full name (for legal requests):",
					initialValue: `${query.firstName} ${query.lastName}`,
					validate: (v) => (!v ? "Required" : undefined),
				}),
			senderEmail: () =>
				p.text({
					message: "Your email address (for legal requests):",
					validate: (v) => {
						if (!v) return "Required";
						if (!v.includes("@")) return "Must be a valid email";
					},
				}),
		});
		if (p.isCancel(legalInputs)) return;

		legalFramework = legalInputs.framework as LegalFramework;
		senderName = legalInputs.senderName;
		senderEmail = legalInputs.senderEmail;

		if (query.state) piiFields.push("state");
		if (query.city) piiFields.push("city");
	}

	// --- Headless mode ---
	const headless = await p.confirm({
		message: "Run browser in headless mode?",
		initialValue: true,
	});
	if (p.isCancel(headless)) return;

	// --- Execute campaign ---
	const campaignConfig: CampaignConfig = {
		profileId,
		query,
		senderName,
		senderEmail,
		legalFramework,
		piiFields,
		phases: phases as CampaignConfig["phases"],
		headless,
	};

	console.log();
	ui.info(`Running campaign: ${phases.join(" → ")}`);
	console.log();

	const s = p.spinner();
	s.start("Campaign running (this may take a while)...");

	const orchestrator = new OrchestratorAgent();
	const result = await orchestrator.execute(campaignConfig as unknown as Record<string, unknown>);

	s.stop("Campaign complete");

	// --- Display results ---
	console.log();
	if (result.success) {
		ui.success(result.message);
	} else {
		ui.error(result.message);
	}

	if (result.data) {
		const data = result.data as {
			phaseResults: Record<string, { success: boolean; message: string }>;
			summary?: {
				total: number;
				confirmed: number;
				failed: number;
				pending: number;
			};
		};

		console.log();
		for (const [phase, phaseResult] of Object.entries(data.phaseResults)) {
			const icon = phaseResult.success ? "✓" : "✗";
			const label = phase.charAt(0).toUpperCase() + phase.slice(1);
			ui.info(`${icon} ${label}: ${phaseResult.message}`);
		}

		if (data.summary) {
			console.log();
			ui.info(
				`Summary: ${data.summary.total} brokers | ${data.summary.confirmed} confirmed | ${data.summary.failed} failed | ${data.summary.pending} pending`,
			);
		}
	}

	p.outro("Run `bun run dev status` to see detailed progress.");
}
