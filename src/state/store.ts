import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import type { BrokerRecord, BrokerStatus, AgentTask, AuditLogEntry, AgentStatus } from "../types/index.js";
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
		this.db
			.query("INSERT INTO profiles (id, vault_ref) VALUES (?, ?)")
			.run(id, vaultRef);
		return id;
	}

	getProfile(id: string): { id: string; vaultRef: string; createdAt: string; updatedAt: string } | null {
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
		this.db
			.query(`UPDATE broker_records SET ${updates.join(", ")} WHERE id = ?`)
			.run(...params);
	}

	incrementBrokerAttempts(id: string): void {
		this.db
			.query("UPDATE broker_records SET attempts = attempts + 1, updated_at = datetime('now') WHERE id = ?")
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

	createAgentTask(agentType: string, action: string, payload: Record<string, unknown> = {}, priority = 0): string {
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
		this.db
			.query(`UPDATE agent_tasks SET ${updates.join(", ")} WHERE id = ?`)
			.run(...params);
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
