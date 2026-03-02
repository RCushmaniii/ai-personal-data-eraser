import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { BrokerRegistry } from "../src/brokers/registry.js";

const PLAYBOOK_DIR = resolve(import.meta.dir, "../src/brokers/playbooks");

describe("BrokerRegistry", () => {
	test("loads playbooks from directory", () => {
		const registry = new BrokerRegistry();
		registry.loadPlaybooks(PLAYBOOK_DIR);
		expect(registry.size).toBeGreaterThan(0);
	});

	test("loads all 6 sample playbooks", () => {
		const registry = new BrokerRegistry();
		registry.loadPlaybooks(PLAYBOOK_DIR);
		expect(registry.size).toBe(6);
	});

	test("retrieves broker by ID", () => {
		const registry = new BrokerRegistry();
		registry.loadPlaybooks(PLAYBOOK_DIR);
		const spokeo = registry.getBroker("spokeo");
		expect(spokeo).toBeDefined();
		expect(spokeo!.name).toBe("Spokeo");
		expect(spokeo!.domain).toBe("spokeo.com");
	});

	test("retrieves playbook by broker ID", () => {
		const registry = new BrokerRegistry();
		registry.loadPlaybooks(PLAYBOOK_DIR);
		const playbook = registry.getPlaybook("spokeo");
		expect(playbook).toBeDefined();
		expect(playbook!.steps.search.length).toBeGreaterThan(0);
		expect(playbook!.steps.optOut.length).toBeGreaterThan(0);
	});

	test("filters by category", () => {
		const registry = new BrokerRegistry();
		registry.loadPlaybooks(PLAYBOOK_DIR);
		const peopleSearch = registry.getBrokersByCategory("people_search");
		expect(peopleSearch.length).toBeGreaterThan(0);
		for (const broker of peopleSearch) {
			expect(broker.category).toBe("people_search");
		}
	});

	test("filters by difficulty", () => {
		const registry = new BrokerRegistry();
		registry.loadPlaybooks(PLAYBOOK_DIR);
		const easy = registry.getBrokersByDifficulty("easy");
		expect(easy.length).toBeGreaterThan(0);
		for (const broker of easy) {
			expect(broker.difficulty).toBe("easy");
		}
	});

	test("lists all brokers", () => {
		const registry = new BrokerRegistry();
		registry.loadPlaybooks(PLAYBOOK_DIR);
		const all = registry.listBrokers();
		expect(all.length).toBe(6);
	});
});
