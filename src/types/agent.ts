/** Agent system types */

export type AgentType = "orchestrator" | "recon" | "removal" | "legal" | "monitor" | "research";

export type AgentStatus = "idle" | "running" | "paused" | "error" | "completed";

export interface AgentTask {
	id: string;
	agentType: AgentType;
	action: string;
	payload: Record<string, unknown>;
	priority: number;
	status: AgentStatus;
	result?: AgentResult;
	error?: string;
	createdAt: string;
	startedAt?: string;
	completedAt?: string;
}

export interface AgentResult {
	success: boolean;
	data?: Record<string, unknown>;
	message: string;
	/** Actions taken by the agent */
	actions: AgentAction[];
}

export interface AgentAction {
	type: string;
	description: string;
	timestamp: string;
	metadata?: Record<string, unknown>;
}

export interface AgentCapabilities {
	type: AgentType;
	actions: string[];
	description: string;
}

export interface CampaignSummary {
	totalBrokers: number;
	scanned: number;
	found: number;
	optOutStarted: number;
	removalConfirmed: number;
	removalFailed: number;
	pending: number;
	successRate: number;
}
