import * as p from "@clack/prompts";
import { writeFileSync, existsSync } from "node:fs";
import { Vault } from "../../security/vault.js";
import { runMigrations } from "../../state/migrate.js";
import { getDatabase } from "../../state/database.js";
import { Store } from "../../state/store.js";
import * as ui from "../ui.js";

export async function setupCommand(): Promise<void> {
	ui.header();
	p.intro("Let's set up your AI Eraser instance");

	// Step 1: API key
	const anthropicKey = await p.text({
		message: "Enter your Anthropic API key:",
		placeholder: "sk-ant-...",
		validate: (v) => {
			if (!v.startsWith("sk-ant-")) return "API key should start with sk-ant-";
		},
	});
	if (p.isCancel(anthropicKey)) return;

	// Step 2: Email config
	const setupEmail = await p.confirm({
		message: "Configure email for sending removal requests?",
		initialValue: false,
	});
	if (p.isCancel(setupEmail)) return;

	let smtpHost = "";
	let smtpUser = "";
	let smtpPass = "";

	if (setupEmail) {
		const emailInputs = await p.group({
			host: () =>
				p.text({
					message: "SMTP host:",
					placeholder: "smtp.gmail.com",
					initialValue: "smtp.gmail.com",
				}),
			user: () =>
				p.text({
					message: "SMTP username (email):",
					placeholder: "your-email@gmail.com",
				}),
			pass: () =>
				p.password({
					message: "SMTP password (app password):",
				}),
		});
		if (p.isCancel(emailInputs)) return;
		smtpHost = emailInputs.host;
		smtpUser = emailInputs.user;
		smtpPass = emailInputs.pass;
	}

	// Step 3: Vault password
	const vaultPassword = await p.password({
		message: "Create a vault password (encrypts your PII data):",
		validate: (v) => {
			if (v.length < 8) return "Password must be at least 8 characters";
		},
	});
	if (p.isCancel(vaultPassword)) return;

	const confirmPassword = await p.password({
		message: "Confirm vault password:",
	});
	if (p.isCancel(confirmPassword)) return;

	if (vaultPassword !== confirmPassword) {
		ui.error("Passwords do not match. Please run setup again.");
		return;
	}

	// Step 4: Write .env file
	const s = p.spinner();
	s.start("Writing configuration...");

	const envContent = [
		`ANTHROPIC_API_KEY=${anthropicKey}`,
		"",
		`SMTP_HOST=${smtpHost || "smtp.gmail.com"}`,
		"SMTP_PORT=587",
		`SMTP_USER=${smtpUser}`,
		`SMTP_PASS=${smtpPass}`,
		"",
		`IMAP_HOST=${smtpHost ? smtpHost.replace("smtp", "imap") : "imap.gmail.com"}`,
		"IMAP_PORT=993",
		`IMAP_USER=${smtpUser}`,
		`IMAP_PASS=${smtpPass}`,
		"",
		"DASHBOARD_PORT=3847",
		"LOG_LEVEL=info",
	].join("\n");

	writeFileSync(".env", envContent);
	s.stop("Configuration saved to .env");

	// Step 5: Initialize database
	s.start("Setting up database...");
	const db = getDatabase();
	runMigrations(db);
	s.stop("Database initialized");

	// Step 6: Initialize vault
	s.start("Initializing encrypted vault...");
	const vault = new Vault("data/vault");
	await vault.unlock(vaultPassword);
	vault.lock();
	s.stop("Vault initialized");

	p.outro("Setup complete! Run `bun run dev scan` to start scanning brokers.");
}
