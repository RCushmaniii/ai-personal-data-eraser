/** Configuration types */

export interface AppConfig {
	/** Anthropic API key */
	anthropicApiKey: string;
	/** Claude model to use */
	model: string;
	/** SMTP configuration for sending emails */
	smtp: SmtpConfig;
	/** IMAP configuration for monitoring inbox */
	imap: ImapConfig;
	/** Vault encryption settings */
	vault: VaultConfig;
	/** Dashboard settings */
	dashboard: DashboardConfig;
	/** Scheduler settings */
	scheduler: SchedulerConfig;
	/** Database path */
	dbPath: string;
	/** Log level */
	logLevel: "debug" | "info" | "warn" | "error";
}

export interface SmtpConfig {
	host: string;
	port: number;
	secure: boolean;
	user: string;
	pass: string;
	fromName: string;
	fromEmail: string;
}

export interface ImapConfig {
	host: string;
	port: number;
	user: string;
	pass: string;
	/** Folder to monitor */
	folder: string;
	/** Check interval in seconds */
	pollInterval: number;
}

export interface VaultConfig {
	/** Path to encrypted vault directory */
	dataDir: string;
	/** Argon2id memory cost in KiB */
	memoryCost: number;
	/** Argon2id time cost (iterations) */
	timeCost: number;
}

export interface DashboardConfig {
	port: number;
	host: string;
}

export interface SchedulerConfig {
	/** Cron expression for scan checks */
	scanCron: string;
	/** Cron expression for re-check removed brokers */
	recheckCron: string;
	/** Cron expression for inbox monitoring */
	inboxCron: string;
	/** Enable/disable scheduler */
	enabled: boolean;
}
