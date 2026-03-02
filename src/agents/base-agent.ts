import { randomUUID } from "node:crypto";
import type {
	AgentAction,
	AgentResult,
	AgentStatus,
	AgentType,
	AppEvent,
	EventType,
} from "../types/index.js";

type EventHandler = (event: AppEvent) => void | Promise<void>;

/**
 * Abstract base class for all agents.
 * Provides event emission, action logging, and lifecycle management.
 */
export abstract class BaseAgent {
	readonly type: AgentType;
	protected status: AgentStatus = "idle";
	protected actions: AgentAction[] = [];
	private listeners: Map<EventType, Set<EventHandler>> = new Map();

	constructor(type: AgentType) {
		this.type = type;
	}

	/**
	 * Execute the agent's primary task.
	 */
	abstract execute(payload: Record<string, unknown>): Promise<AgentResult>;

	/**
	 * Runs the agent with lifecycle management.
	 */
	async run(payload: Record<string, unknown>): Promise<AgentResult> {
		this.status = "running";
		this.actions = [];

		this.emit({
			id: randomUUID(),
			type: "campaign:started",
			timestamp: new Date().toISOString(),
			agentType: this.type,
			message: `${this.type} agent started`,
			data: payload,
		});

		try {
			const result = await this.execute(payload);
			this.status = result.success ? "completed" : "error";

			this.emit({
				id: randomUUID(),
				type: "campaign:completed",
				timestamp: new Date().toISOString(),
				agentType: this.type,
				message: `${this.type} agent ${this.status}`,
				data: { result },
			});

			return result;
		} catch (error) {
			this.status = "error";
			const message = error instanceof Error ? error.message : String(error);

			this.emit({
				id: randomUUID(),
				type: "error:agent",
				timestamp: new Date().toISOString(),
				agentType: this.type,
				message: `${this.type} agent error: ${message}`,
			});

			return {
				success: false,
				message,
				actions: this.actions,
			};
		}
	}

	/**
	 * Logs an action taken by this agent.
	 */
	protected logAction(type: string, description: string, metadata?: Record<string, unknown>): void {
		this.actions.push({
			type,
			description,
			timestamp: new Date().toISOString(),
			metadata,
		});
	}

	/**
	 * Emits an event to all registered listeners.
	 */
	protected emit(event: AppEvent): void {
		const handlers = this.listeners.get(event.type);
		if (handlers) {
			for (const handler of handlers) {
				handler(event);
			}
		}
	}

	/**
	 * Registers an event listener.
	 */
	on(type: EventType, handler: EventHandler): void {
		if (!this.listeners.has(type)) {
			this.listeners.set(type, new Set());
		}
		this.listeners.get(type)!.add(handler);
	}

	/**
	 * Removes an event listener.
	 */
	off(type: EventType, handler: EventHandler): void {
		this.listeners.get(type)?.delete(handler);
	}

	getStatus(): AgentStatus {
		return this.status;
	}

	getActions(): AgentAction[] {
		return [...this.actions];
	}
}
