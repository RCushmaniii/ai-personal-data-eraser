import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import YAML from "yaml";
import { playbookSchema, type Playbook } from "./playbook-schema.js";
import type { BrokerDefinition } from "../types/index.js";

/**
 * Registry of all known data brokers and their playbooks.
 * Loads broker definitions from YAML playbook files.
 */
export class BrokerRegistry {
	private brokers: Map<string, BrokerDefinition> = new Map();
	private playbooks: Map<string, Playbook> = new Map();

	/**
	 * Loads all playbooks from the given directory.
	 */
	loadPlaybooks(playbookDir?: string): void {
		const dir = playbookDir ?? resolve(import.meta.dir, "playbooks");
		const files = readdirSync(dir).filter(
			(f) => f.endsWith(".yml") || f.endsWith(".yaml"),
		);

		for (const file of files) {
			const filePath = join(dir, file);
			this.loadPlaybook(filePath);
		}
	}

	/**
	 * Loads a single playbook from a YAML file.
	 */
	loadPlaybook(filePath: string): Playbook {
		const raw = readFileSync(filePath, "utf-8");
		const parsed = YAML.parse(raw);
		const result = playbookSchema.safeParse(parsed);

		if (!result.success) {
			const errors = result.error.issues
				.map((i) => `  ${i.path.join(".")}: ${i.message}`)
				.join("\n");
			throw new Error(`Invalid playbook ${filePath}:\n${errors}`);
		}

		const playbook = result.data;
		this.playbooks.set(playbook.id, playbook);

		const broker: BrokerDefinition = {
			id: playbook.id,
			name: playbook.name,
			domain: playbook.domain,
			category: playbook.category,
			optOutMethods: playbook.optOutMethods,
			difficulty: playbook.difficulty,
			searchUrl: playbook.searchUrl,
			optOutUrl: playbook.optOutUrl,
			estimatedDays: playbook.estimatedDays,
			requiresVerification: playbook.requiresVerification,
			legalFrameworks: playbook.legalFrameworks,
			playbookPath: filePath,
			notes: playbook.notes,
		};
		this.brokers.set(broker.id, broker);

		return playbook;
	}

	/**
	 * Gets a broker definition by ID.
	 */
	getBroker(id: string): BrokerDefinition | undefined {
		return this.brokers.get(id);
	}

	/**
	 * Gets a playbook by broker ID.
	 */
	getPlaybook(brokerId: string): Playbook | undefined {
		return this.playbooks.get(brokerId);
	}

	/**
	 * Lists all registered brokers.
	 */
	listBrokers(): BrokerDefinition[] {
		return Array.from(this.brokers.values());
	}

	/**
	 * Filters brokers by category.
	 */
	getBrokersByCategory(category: BrokerDefinition["category"]): BrokerDefinition[] {
		return this.listBrokers().filter((b) => b.category === category);
	}

	/**
	 * Filters brokers by difficulty.
	 */
	getBrokersByDifficulty(difficulty: BrokerDefinition["difficulty"]): BrokerDefinition[] {
		return this.listBrokers().filter((b) => b.difficulty === difficulty);
	}

	/**
	 * Returns the count of registered brokers.
	 */
	get size(): number {
		return this.brokers.size;
	}
}

/** Singleton registry instance */
let _registry: BrokerRegistry | null = null;

export function getRegistry(): BrokerRegistry {
	if (!_registry) {
		_registry = new BrokerRegistry();
		_registry.loadPlaybooks();
	}
	return _registry;
}
