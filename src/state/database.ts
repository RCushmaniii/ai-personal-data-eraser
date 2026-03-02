import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

let _db: Database | null = null;

/**
 * Opens or returns the singleton SQLite database connection.
 * Uses WAL mode for better concurrent read performance.
 */
export function getDatabase(dbPath = "data/ai-eraser.db"): Database {
	if (_db) return _db;

	mkdirSync(dirname(dbPath), { recursive: true });

	_db = new Database(dbPath, { create: true });
	_db.exec("PRAGMA journal_mode = WAL");
	_db.exec("PRAGMA foreign_keys = ON");
	_db.exec("PRAGMA busy_timeout = 5000");

	return _db;
}

/**
 * Closes the database connection and resets the singleton.
 */
export function closeDatabase(): void {
	if (_db) {
		_db.close();
		_db = null;
	}
}

/**
 * Creates a database for testing (in-memory).
 */
export function createTestDatabase(): Database {
	const db = new Database(":memory:");
	db.exec("PRAGMA journal_mode = WAL");
	db.exec("PRAGMA foreign_keys = ON");
	return db;
}
