import { describe, test, expect } from "bun:test";
import { appConfigSchema } from "../src/config/schema.js";
import { playbookSchema } from "../src/brokers/playbook-schema.js";

describe("Config Schema", () => {
	test("validates a complete config", () => {
		const result = appConfigSchema.safeParse({
			anthropicApiKey: "sk-ant-test123",
			model: "claude-sonnet-4-20250514",
			smtp: {
				host: "smtp.gmail.com",
				port: 587,
				secure: false,
				user: "test@gmail.com",
				pass: "pass123",
				fromName: "Test",
				fromEmail: "test@gmail.com",
			},
			imap: {
				host: "imap.gmail.com",
				port: 993,
				user: "test@gmail.com",
				pass: "pass123",
			},
			vault: {},
			dashboard: {},
			scheduler: {},
			dbPath: "data/test.db",
			logLevel: "info",
		});

		expect(result.success).toBe(true);
	});

	test("rejects config without API key", () => {
		const result = appConfigSchema.safeParse({
			anthropicApiKey: "",
			smtp: {
				host: "smtp.gmail.com",
				port: 587,
				secure: false,
				user: "test@gmail.com",
				pass: "pass123",
				fromEmail: "test@gmail.com",
			},
			imap: {
				host: "imap.gmail.com",
				port: 993,
				user: "test@gmail.com",
				pass: "pass123",
			},
		});

		expect(result.success).toBe(false);
	});

	test("applies default values", () => {
		const result = appConfigSchema.safeParse({
			anthropicApiKey: "sk-ant-test123",
			smtp: {
				host: "smtp.gmail.com",
				user: "test@gmail.com",
				pass: "pass123",
				fromEmail: "test@gmail.com",
			},
			imap: {
				host: "imap.gmail.com",
				user: "test@gmail.com",
				pass: "pass123",
			},
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.model).toBe("claude-sonnet-4-20250514");
			expect(result.data.dashboard.port).toBe(3847);
			expect(result.data.logLevel).toBe("info");
		}
	});
});

describe("Playbook Schema", () => {
	test("validates a minimal playbook", () => {
		const result = playbookSchema.safeParse({
			id: "test-broker",
			name: "Test Broker",
			domain: "test.com",
			category: "people_search",
			difficulty: "easy",
			estimatedDays: 3,
			legalFrameworks: ["ccpa"],
			searchUrl: "https://test.com/search",
			optOutUrl: "https://test.com/optout",
			optOutMethods: ["web_form"],
			steps: {
				search: [
					{
						name: "Navigate",
						action: { type: "navigate", url: "https://test.com" },
					},
				],
				optOut: [
					{
						name: "Submit",
						action: { type: "click", selector: "#submit" },
					},
				],
				verify: [
					{
						name: "Check",
						action: { type: "verify_removal", checkUrl: "https://test.com" },
					},
				],
			},
		});

		expect(result.success).toBe(true);
	});

	test("rejects invalid step action type", () => {
		const result = playbookSchema.safeParse({
			id: "test",
			name: "Test",
			domain: "test.com",
			category: "people_search",
			difficulty: "easy",
			estimatedDays: 1,
			legalFrameworks: ["ccpa"],
			searchUrl: "https://test.com",
			optOutUrl: "https://test.com",
			optOutMethods: ["web_form"],
			steps: {
				search: [
					{
						name: "Bad step",
						action: { type: "invalid_action" },
					},
				],
				optOut: [],
				verify: [],
			},
		});

		expect(result.success).toBe(false);
	});
});
