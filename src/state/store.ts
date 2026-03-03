import type { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import type {
	AgentStatus,
	AgentTask,
	AuditLogEntry,
	BrokerIntel,
	BrokerIntelFilter,
	BrokerIntelSummary,
	BrokerRecord,
	BrokerStatus,
} from "../types/index.js";
import { getDatabase } from "./database.js";

/**
 * CRUD operations for the application database.
 */
export class Store {
	private db: Database;

	constructor(db?: Database) {
		this.db = db ?? getDatabase();
	}

	// --- Profiles ---

	createProfile(vaultRef: string): string {
		const id = randomUUID();
		this.db.query("INSERT INTO profiles (id, vault_ref) VALUES (?, ?)").run(id, vaultRef);
		return id;
	}

	getProfile(
		id: string,
	): { id: string; vaultRef: string; createdAt: string; updatedAt: string } | null {
		const row = this.db
			.query<{ id: string; vault_ref: string; created_at: string; updated_at: string }, [string]>(
				"SELECT * FROM profiles WHERE id = ?",
			)
			.get(id);
		if (!row) return null;
		return {
			id: row.id,
			vaultRef: row.vault_ref,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		};
	}

	listProfiles(): { id: string; vaultRef: string; createdAt: string }[] {
		return this.db
			.query<{ id: string; vault_ref: string; created_at: string }, []>(
				"SELECT id, vault_ref, created_at FROM profiles ORDER BY created_at DESC",
			)
			.all()
			.map((row) => ({
				id: row.id,
				vaultRef: row.vault_ref,
				createdAt: row.created_at,
			}));
	}

	// --- Broker Records ---

	createBrokerRecord(
		brokerId: string,
		profileId: string,
		opts?: { profileUrl?: string; matchConfidence?: number },
	): string {
		const id = randomUUID();
		this.db
			.query(
				`INSERT INTO broker_records (id, broker_id, profile_id, profile_url, match_confidence)
				 VALUES (?, ?, ?, ?, ?)`,
			)
			.run(id, brokerId, profileId, opts?.profileUrl ?? null, opts?.matchConfidence ?? 0);
		return id;
	}

	getBrokerRecord(id: string): BrokerRecord | null {
		const row = this.db
			.query<Record<string, string | number | null>, [string]>(
				"SELECT * FROM broker_records WHERE id = ?",
			)
			.get(id);
		if (!row) return null;
		return this.mapBrokerRecord(row);
	}

	listBrokerRecords(profileId?: string): BrokerRecord[] {
		const query = profileId
			? "SELECT * FROM broker_records WHERE profile_id = ? ORDER BY created_at DESC"
			: "SELECT * FROM broker_records ORDER BY created_at DESC";
		const params = profileId ? [profileId] : [];
		return this.db
			.query<Record<string, string | number | null>, string[]>(query)
			.all(...params)
			.map(this.mapBrokerRecord);
	}

	updateBrokerStatus(id: string, status: BrokerStatus, notes?: string): void {
		const now = new Date().toISOString();
		const updates: string[] = ["status = ?", "updated_at = ?"];
		const params: (string | null)[] = [status, now];

		if (status === "opt_out_submitted") {
			updates.push("opt_out_submitted_at = ?");
			params.push(now);
		}
		if (status === "removal_confirmed") {
			updates.push("removal_confirmed_at = ?");
			params.push(now);
		}
		if (notes !== undefined) {
			updates.push("notes = ?");
			params.push(notes);
		}

		params.push(id);
		this.db.query(`UPDATE broker_records SET ${updates.join(", ")} WHERE id = ?`).run(...params);
	}

	incrementBrokerAttempts(id: string): void {
		this.db
			.query(
				"UPDATE broker_records SET attempts = attempts + 1, updated_at = datetime('now') WHERE id = ?",
			)
			.run(id);
	}

	getBrokersByStatus(status: BrokerStatus): BrokerRecord[] {
		return this.db
			.query<Record<string, string | number | null>, [string]>(
				"SELECT * FROM broker_records WHERE status = ? ORDER BY created_at DESC",
			)
			.all(status)
			.map(this.mapBrokerRecord);
	}

	// --- Agent Tasks ---

	createAgentTask(
		agentType: string,
		action: string,
		payload: Record<string, unknown> = {},
		priority = 0,
	): string {
		const id = randomUUID();
		this.db
			.query(
				`INSERT INTO agent_tasks (id, agent_type, action, payload, priority)
				 VALUES (?, ?, ?, ?, ?)`,
			)
			.run(id, agentType, JSON.stringify(payload), priority);
		return id;
	}

	getAgentTask(id: string): AgentTask | null {
		const row = this.db
			.query<Record<string, string | number | null>, [string]>(
				"SELECT * FROM agent_tasks WHERE id = ?",
			)
			.get(id);
		if (!row) return null;
		return this.mapAgentTask(row);
	}

	updateAgentTaskStatus(id: string, status: AgentStatus, result?: string, error?: string): void {
		const now = new Date().toISOString();
		const updates = ["status = ?"];
		const params: (string | null)[] = [status];

		if (status === "running") {
			updates.push("started_at = ?");
			params.push(now);
		}
		if (status === "completed" || status === "error") {
			updates.push("completed_at = ?");
			params.push(now);
		}
		if (result !== undefined) {
			updates.push("result = ?");
			params.push(result);
		}
		if (error !== undefined) {
			updates.push("error = ?");
			params.push(error);
		}

		params.push(id);
		this.db.query(`UPDATE agent_tasks SET ${updates.join(", ")} WHERE id = ?`).run(...params);
	}

	getPendingTasks(agentType?: string): AgentTask[] {
		const query = agentType
			? "SELECT * FROM agent_tasks WHERE status = 'idle' AND agent_type = ? ORDER BY priority DESC, created_at ASC"
			: "SELECT * FROM agent_tasks WHERE status = 'idle' ORDER BY priority DESC, created_at ASC";
		const params = agentType ? [agentType] : [];
		return this.db
			.query<Record<string, string | number | null>, string[]>(query)
			.all(...params)
			.map(this.mapAgentTask);
	}

	// --- Audit Log ---

	addAuditEntry(
		action: string,
		agentType: string,
		details: string,
		success: boolean,
		brokerId?: string,
		profileId?: string,
	): string {
		const id = randomUUID();
		this.db
			.query(
				`INSERT INTO audit_log (id, action, agent_type, broker_id, profile_id, details, success)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(id, action, agentType, brokerId ?? null, profileId ?? null, details, success ? 1 : 0);
		return id;
	}

	getAuditLog(limit = 50, offset = 0): AuditLogEntry[] {
		return this.db
			.query<Record<string, string | number | null>, [number, number]>(
				"SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ? OFFSET ?",
			)
			.all(limit, offset)
			.map((row) => ({
				id: row.id as string,
				timestamp: row.timestamp as string,
				action: row.action as string,
				agentType: row.agent_type as string,
				brokerId: row.broker_id as string | undefined,
				profileId: row.profile_id as string | undefined,
				details: row.details as string,
				success: row.success === 1,
			}));
	}

	// --- Campaign Summary ---

	getCampaignSummary(profileId?: string): {
		total: number;
		found: number;
		optOutStarted: number;
		confirmed: number;
		failed: number;
		pending: number;
	} {
		const where = profileId ? "WHERE profile_id = ?" : "";
		const params = profileId ? [profileId] : [];

		const rows = this.db
			.query<{ status: string; count: number }, string[]>(
				`SELECT status, COUNT(*) as count FROM broker_records ${where} GROUP BY status`,
			)
			.all(...params);

		const counts: Record<string, number> = {};
		for (const row of rows) {
			counts[row.status] = row.count;
		}

		const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
		return {
			total,
			found: counts.found ?? 0,
			optOutStarted: (counts.opt_out_started ?? 0) + (counts.opt_out_submitted ?? 0),
			confirmed: counts.removal_confirmed ?? 0,
			failed: counts.removal_failed ?? 0,
			pending:
				(counts.discovered ?? 0) +
				(counts.scanning ?? 0) +
				(counts.verification_needed ?? 0) +
				(counts.awaiting_confirmation ?? 0),
		};
	}

	// --- Broker Intel ---

	upsertBrokerIntel(intel: Partial<BrokerIntel> & { domain: string; name: string }): string {
		const existing = this.getBrokerIntel(intel.domain);
		const now = new Date().toISOString();

		if (existing) {
			this.db
				.query(
					`UPDATE broker_intel SET
						name = ?, category = ?, opt_out_url = ?, opt_out_method = ?,
						privacy_contact_email = ?, requires_account = ?, requires_id_upload = ?,
						has_captcha = ?, requires_postal_mail = ?, verification_steps = ?,
						estimated_days = ?, difficulty = ?, difficulty_score = ?,
						legal_frameworks = ?, data_categories = ?, notes = ?,
						source_urls = ?, scraped_at = ?, has_playbook = ?, status = ?,
						updated_at = ?
					 WHERE domain = ?`,
				)
				.run(
					intel.name,
					intel.category ?? existing.category,
					intel.optOutUrl ?? existing.optOutUrl,
					intel.optOutMethod ?? existing.optOutMethod,
					intel.privacyContactEmail ?? existing.privacyContactEmail,
					intel.requiresAccount !== undefined
						? intel.requiresAccount
							? 1
							: 0
						: existing.requiresAccount
							? 1
							: 0,
					intel.requiresIdUpload !== undefined
						? intel.requiresIdUpload
							? 1
							: 0
						: existing.requiresIdUpload
							? 1
							: 0,
					intel.hasCaptcha !== undefined ? (intel.hasCaptcha ? 1 : 0) : existing.hasCaptcha ? 1 : 0,
					intel.requiresPostalMail !== undefined
						? intel.requiresPostalMail
							? 1
							: 0
						: existing.requiresPostalMail
							? 1
							: 0,
					intel.verificationSteps ?? existing.verificationSteps,
					intel.estimatedDays ?? existing.estimatedDays,
					intel.difficulty ?? existing.difficulty,
					intel.difficultyScore ?? existing.difficultyScore,
					intel.legalFrameworks
						? JSON.stringify(intel.legalFrameworks)
						: JSON.stringify(existing.legalFrameworks),
					intel.dataCategories
						? JSON.stringify(intel.dataCategories)
						: JSON.stringify(existing.dataCategories),
					intel.notes ?? existing.notes,
					intel.sourceUrls ? JSON.stringify(intel.sourceUrls) : JSON.stringify(existing.sourceUrls),
					intel.scrapedAt ?? existing.scrapedAt,
					intel.hasPlaybook !== undefined
						? intel.hasPlaybook
							? 1
							: 0
						: existing.hasPlaybook
							? 1
							: 0,
					intel.status ?? existing.status,
					now,
					intel.domain,
				);
			return existing.id;
		}

		const id = randomUUID();
		this.db
			.query(
				`INSERT INTO broker_intel (
					id, domain, name, category, opt_out_url, opt_out_method,
					privacy_contact_email, requires_account, requires_id_upload,
					has_captcha, requires_postal_mail, verification_steps,
					estimated_days, difficulty, difficulty_score,
					legal_frameworks, data_categories, notes,
					source_urls, scraped_at, has_playbook, status,
					created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				id,
				intel.domain,
				intel.name,
				intel.category ?? null,
				intel.optOutUrl ?? null,
				intel.optOutMethod ?? null,
				intel.privacyContactEmail ?? null,
				intel.requiresAccount ? 1 : 0,
				intel.requiresIdUpload ? 1 : 0,
				intel.hasCaptcha ? 1 : 0,
				intel.requiresPostalMail ? 1 : 0,
				intel.verificationSteps ?? 0,
				intel.estimatedDays ?? null,
				intel.difficulty ?? null,
				intel.difficultyScore ?? 0,
				JSON.stringify(intel.legalFrameworks ?? []),
				JSON.stringify(intel.dataCategories ?? []),
				intel.notes ?? null,
				JSON.stringify(intel.sourceUrls ?? []),
				intel.scrapedAt ?? null,
				intel.hasPlaybook ? 1 : 0,
				intel.status ?? "researched",
				now,
				now,
			);
		return id;
	}

	getBrokerIntel(domain: string): BrokerIntel | null {
		const row = this.db
			.query<Record<string, string | number | null>, [string]>(
				"SELECT * FROM broker_intel WHERE domain = ?",
			)
			.get(domain);
		if (!row) return null;
		return this.mapBrokerIntel(row);
	}

	listBrokerIntel(opts?: BrokerIntelFilter): BrokerIntel[] {
		const conditions: string[] = [];
		const params: (string | number)[] = [];

		if (opts?.category) {
			conditions.push("category = ?");
			params.push(opts.category);
		}
		if (opts?.difficulty) {
			conditions.push("difficulty = ?");
			params.push(opts.difficulty);
		}
		if (opts?.hasPlaybook !== undefined) {
			conditions.push("has_playbook = ?");
			params.push(opts.hasPlaybook ? 1 : 0);
		}

		const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
		return this.db
			.query<Record<string, string | number | null>, (string | number)[]>(
				`SELECT * FROM broker_intel ${where} ORDER BY name ASC`,
			)
			.all(...params)
			.map(this.mapBrokerIntel);
	}

	getBrokerIntelSummary(): BrokerIntelSummary {
		const all = this.listBrokerIntel();
		const byDifficulty: Record<string, number> = {};
		const byCategory: Record<string, number> = {};
		let withPlaybook = 0;
		let fetchFailed = 0;

		for (const intel of all) {
			if (intel.status === "fetch_failed") {
				fetchFailed++;
				continue;
			}

			const diff = intel.difficulty ?? "unknown";
			byDifficulty[diff] = (byDifficulty[diff] ?? 0) + 1;

			const cat = intel.category ?? "uncategorized";
			byCategory[cat] = (byCategory[cat] ?? 0) + 1;

			if (intel.hasPlaybook) withPlaybook++;
		}

		return { total: all.length, byDifficulty, byCategory, withPlaybook, fetchFailed };
	}

	// --- Helpers ---

	private mapBrokerRecord(row: Record<string, string | number | null>): BrokerRecord {
		return {
			id: row.id as string,
			brokerId: row.broker_id as string,
			profileId: row.profile_id as string,
			status: row.status as BrokerStatus,
			profileUrl: row.profile_url as string | undefined,
			matchConfidence: row.match_confidence as number,
			optOutSubmittedAt: row.opt_out_submitted_at as string | undefined,
			removalConfirmedAt: row.removal_confirmed_at as string | undefined,
			lastCheckedAt: row.last_checked_at as string,
			nextCheckAt: row.next_check_at as string | undefined,
			attempts: row.attempts as number,
			notes: row.notes as string | undefined,
			createdAt: row.created_at as string,
			updatedAt: row.updated_at as string,
		};
	}

	private mapBrokerIntel(row: Record<string, string | number | null>): BrokerIntel {
		return {
			id: row.id as string,
			domain: row.domain as string,
			name: row.name as string,
			category: (row.category as BrokerIntel["category"]) ?? null,
			optOutUrl: row.opt_out_url as string | null,
			optOutMethod: (row.opt_out_method as BrokerIntel["optOutMethod"]) ?? null,
			privacyContactEmail: row.privacy_contact_email as string | null,
			requiresAccount: row.requires_account === 1,
			requiresIdUpload: row.requires_id_upload === 1,
			hasCaptcha: row.has_captcha === 1,
			requiresPostalMail: row.requires_postal_mail === 1,
			verificationSteps: (row.verification_steps as number) ?? 0,
			estimatedDays: row.estimated_days as number | null,
			difficulty: (row.difficulty as BrokerIntel["difficulty"]) ?? null,
			difficultyScore: (row.difficulty_score as number) ?? 0,
			legalFrameworks: JSON.parse((row.legal_frameworks as string) || "[]"),
			dataCategories: JSON.parse((row.data_categories as string) || "[]"),
			notes: row.notes as string | null,
			sourceUrls: JSON.parse((row.source_urls as string) || "[]"),
			scrapedAt: row.scraped_at as string | null,
			hasPlaybook: row.has_playbook === 1,
			status: (row.status as BrokerIntel["status"]) ?? "researched",
			createdAt: row.created_at as string,
			updatedAt: row.updated_at as string,
		};
	}

	private mapAgentTask(row: Record<string, string | number | null>): AgentTask {
		return {
			id: row.id as string,
			agentType: row.agent_type as AgentTask["agentType"],
			action: row.action as string,
			payload: JSON.parse((row.payload as string) || "{}"),
			priority: row.priority as number,
			status: row.status as AgentTask["status"],
			result: row.result ? JSON.parse(row.result as string) : undefined,
			error: row.error as string | undefined,
			createdAt: row.created_at as string,
			startedAt: row.started_at as string | undefined,
			completedAt: row.completed_at as string | undefined,
		};
	}
}
