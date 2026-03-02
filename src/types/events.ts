/** Event system types for inter-agent communication */

export type EventType =
	| "scan:started"
	| "scan:completed"
	| "scan:match_found"
	| "scan:no_match"
	| "optout:started"
	| "optout:submitted"
	| "optout:verification_needed"
	| "optout:confirmed"
	| "optout:failed"
	| "email:sent"
	| "email:received"
	| "email:classified"
	| "monitor:recheck"
	| "monitor:reappeared"
	| "campaign:started"
	| "campaign:completed"
	| "vault:encrypted"
	| "vault:decrypted"
	| "error:agent"
	| "error:network"
	| "error:auth";

export interface AppEvent {
	id: string;
	type: EventType;
	timestamp: string;
	agentType?: string;
	brokerId?: string;
	profileId?: string;
	data?: Record<string, unknown>;
	message: string;
}

export interface AuditLogEntry {
	id: string;
	timestamp: string;
	action: string;
	agentType: string;
	brokerId?: string;
	profileId?: string;
	details: string;
	success: boolean;
}

export type EventHandler = (event: AppEvent) => void | Promise<void>;

export interface EventBus {
	emit(event: AppEvent): void;
	on(type: EventType, handler: EventHandler): void;
	off(type: EventType, handler: EventHandler): void;
}
