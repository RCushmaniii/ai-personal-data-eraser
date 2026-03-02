import type { Database } from "bun:sqlite";
import { getDatabase } from "./database.js";

interface Migration {
	version: number;
	description: string;
	up: string;
}

const migrations: Migration[] = [
	{
		version: 1,
		description: "Initial schema — profiles, brokers, tasks, audit log, emails",
		up: `
			CREATE TABLE IF NOT EXISTS profiles (
				id TEXT PRIMARY KEY,
				vault_ref TEXT NOT NULL,
				created_at TEXT NOT NULL DEFAULT (datetime('now')),
				updated_at TEXT NOT NULL DEFAULT (datetime('now'))
			);

			CREATE TABLE IF NOT EXISTS broker_records (
				id TEXT PRIMARY KEY,
				broker_id TEXT NOT NULL,
				profile_id TEXT NOT NULL REFERENCES profiles(id),
				status TEXT NOT NULL DEFAULT 'discovered',
				profile_url TEXT,
				match_confidence REAL NOT NULL DEFAULT 0,
				opt_out_submitted_at TEXT,
				removal_confirmed_at TEXT,
				last_checked_at TEXT NOT NULL DEFAULT (datetime('now')),
				next_check_at TEXT,
				attempts INTEGER NOT NULL DEFAULT 0,
				notes TEXT,
				created_at TEXT NOT NULL DEFAULT (datetime('now')),
				updated_at TEXT NOT NULL DEFAULT (datetime('now'))
			);

			CREATE TABLE IF NOT EXISTS agent_tasks (
				id TEXT PRIMARY KEY,
				agent_type TEXT NOT NULL,
				action TEXT NOT NULL,
				payload TEXT NOT NULL DEFAULT '{}',
				priority INTEGER NOT NULL DEFAULT 0,
				status TEXT NOT NULL DEFAULT 'idle',
				result TEXT,
				error TEXT,
				created_at TEXT NOT NULL DEFAULT (datetime('now')),
				started_at TEXT,
				completed_at TEXT
			);

			CREATE TABLE IF NOT EXISTS audit_log (
				id TEXT PRIMARY KEY,
				timestamp TEXT NOT NULL DEFAULT (datetime('now')),
				action TEXT NOT NULL,
				agent_type TEXT NOT NULL,
				broker_id TEXT,
				profile_id TEXT,
				details TEXT NOT NULL,
				success INTEGER NOT NULL DEFAULT 1
			);

			CREATE TABLE IF NOT EXISTS emails (
				id TEXT PRIMARY KEY,
				to_addr TEXT NOT NULL,
				from_addr TEXT NOT NULL,
				subject TEXT NOT NULL,
				html_body TEXT NOT NULL,
				text_body TEXT NOT NULL,
				template_type TEXT NOT NULL,
				broker_id TEXT NOT NULL,
				profile_id TEXT NOT NULL,
				sent_at TEXT,
				status TEXT NOT NULL DEFAULT 'draft'
			);

			CREATE TABLE IF NOT EXISTS schema_migrations (
				version INTEGER PRIMARY KEY,
				description TEXT NOT NULL,
				applied_at TEXT NOT NULL DEFAULT (datetime('now'))
			);

			CREATE INDEX IF NOT EXISTS idx_broker_records_broker_id ON broker_records(broker_id);
			CREATE INDEX IF NOT EXISTS idx_broker_records_profile_id ON broker_records(profile_id);
			CREATE INDEX IF NOT EXISTS idx_broker_records_status ON broker_records(status);
			CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
			CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
			CREATE INDEX IF NOT EXISTS idx_emails_broker_id ON emails(broker_id);
		`,
	},
];

/**
 * Runs all pending migrations against the database.
 */
export function runMigrations(db?: Database): void {
	const database = db ?? getDatabase();

	database.exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			description TEXT NOT NULL,
			applied_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);

	const applied = database
		.query<{ version: number }, []>("SELECT version FROM schema_migrations ORDER BY version")
		.all()
		.map((row) => row.version);

	const pending = migrations.filter((m) => !applied.includes(m.version));

	for (const migration of pending) {
		database.exec(migration.up);
		database
			.query("INSERT INTO schema_migrations (version, description) VALUES (?, ?)")
			.run(migration.version, migration.description);
		console.log(`  Applied migration v${migration.version}: ${migration.description}`);
	}

	if (pending.length === 0) {
		console.log("  Database is up to date.");
	}
}

/** CLI entry point for running migrations */
if (import.meta.main) {
	console.log("Running database migrations...");
	runMigrations();
	console.log("Done.");
}
