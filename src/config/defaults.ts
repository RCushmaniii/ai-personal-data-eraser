import type { AppConfig } from "../types/index.js";

export const DEFAULT_CONFIG: Partial<AppConfig> = {
	model: "claude-sonnet-4-20250514",
	smtp: {
		host: "smtp.gmail.com",
		port: 587,
		secure: false,
		user: "",
		pass: "",
		fromName: "AI Eraser",
		fromEmail: "",
	},
	imap: {
		host: "imap.gmail.com",
		port: 993,
		user: "",
		pass: "",
		folder: "INBOX",
		pollInterval: 300,
	},
	vault: {
		dataDir: "data/vault",
		memoryCost: 65536,
		timeCost: 3,
	},
	dashboard: {
		port: 3847,
		host: "127.0.0.1",
	},
	scheduler: {
		scanCron: "0 6 * * 1",
		recheckCron: "0 8 * * 3",
		inboxCron: "*/5 * * * *",
		enabled: false,
	},
	dbPath: "data/ai-eraser.db",
	logLevel: "info",
};

export function loadConfigFromEnv(): Partial<AppConfig> {
	return {
		anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
		model: process.env.ANTHROPIC_MODEL ?? DEFAULT_CONFIG.model,
		smtp: {
			host: process.env.SMTP_HOST ?? DEFAULT_CONFIG.smtp!.host,
			port: Number(process.env.SMTP_PORT) || DEFAULT_CONFIG.smtp!.port,
			secure: process.env.SMTP_SECURE === "true",
			user: process.env.SMTP_USER ?? "",
			pass: process.env.SMTP_PASS ?? "",
			fromName: process.env.SMTP_FROM_NAME ?? DEFAULT_CONFIG.smtp!.fromName,
			fromEmail: process.env.SMTP_USER ?? "",
		},
		imap: {
			host: process.env.IMAP_HOST ?? DEFAULT_CONFIG.imap!.host,
			port: Number(process.env.IMAP_PORT) || DEFAULT_CONFIG.imap!.port,
			user: process.env.IMAP_USER ?? "",
			pass: process.env.IMAP_PASS ?? "",
			folder: process.env.IMAP_FOLDER ?? DEFAULT_CONFIG.imap!.folder,
			pollInterval: Number(process.env.IMAP_POLL_INTERVAL) || DEFAULT_CONFIG.imap!.pollInterval,
		},
		vault: {
			dataDir: process.env.VAULT_DATA_DIR ?? DEFAULT_CONFIG.vault!.dataDir,
			memoryCost: Number(process.env.VAULT_MEMORY_COST) || DEFAULT_CONFIG.vault!.memoryCost,
			timeCost: Number(process.env.VAULT_TIME_COST) || DEFAULT_CONFIG.vault!.timeCost,
		},
		dashboard: {
			port: Number(process.env.DASHBOARD_PORT) || DEFAULT_CONFIG.dashboard!.port,
			host: process.env.DASHBOARD_HOST ?? DEFAULT_CONFIG.dashboard!.host,
		},
		scheduler: {
			...DEFAULT_CONFIG.scheduler!,
			enabled: process.env.SCHEDULER_ENABLED === "true",
		},
		dbPath: process.env.DB_PATH ?? DEFAULT_CONFIG.dbPath,
		logLevel: (process.env.LOG_LEVEL as AppConfig["logLevel"]) ?? DEFAULT_CONFIG.logLevel,
		firecrawlApiKey: process.env.FIRECRAWL_API_KEY || undefined,
	};
}
