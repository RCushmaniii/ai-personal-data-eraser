import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Vault } from "../src/security/vault.js";

const TEST_DIR = join(import.meta.dir, ".test-vault");
const PASSWORD = "test-password-12345";

describe("Vault", () => {
	let vault: Vault;

	beforeEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true });
		vault = new Vault(TEST_DIR);
	});

	afterEach(() => {
		vault.lock();
		rmSync(TEST_DIR, { recursive: true, force: true });
	});

	test("initializes and creates metadata file", async () => {
		await vault.unlock(PASSWORD, 1024, 1);
		expect(vault.isUnlocked).toBe(true);
		expect(existsSync(join(TEST_DIR, "vault.meta.json"))).toBe(true);
	});

	test("stores and retrieves data", async () => {
		await vault.unlock(PASSWORD, 1024, 1);
		await vault.store("test-entry", "Hello, World!");
		const retrieved = await vault.retrieve("test-entry");
		expect(retrieved).toBe("Hello, World!");
	});

	test("stores and retrieves JSON data", async () => {
		await vault.unlock(PASSWORD, 1024, 1);
		const data = { name: "John Doe", email: "john@example.com" };
		await vault.store("profile-1", JSON.stringify(data));
		const retrieved = JSON.parse(await vault.retrieve("profile-1"));
		expect(retrieved).toEqual(data);
	});

	test("locks and prevents access", async () => {
		await vault.unlock(PASSWORD, 1024, 1);
		await vault.store("secret", "data");
		vault.lock();
		expect(vault.isUnlocked).toBe(false);
		expect(() => vault.listEntries()).toThrow("Vault is locked");
	});

	test("re-opens existing vault with same password", async () => {
		await vault.unlock(PASSWORD, 1024, 1);
		await vault.store("persistent", "my data");
		vault.lock();

		const vault2 = new Vault(TEST_DIR);
		await vault2.unlock(PASSWORD, 1024, 1);
		const retrieved = await vault2.retrieve("persistent");
		expect(retrieved).toBe("my data");
		vault2.lock();
	});

	test("fails to decrypt with wrong password", async () => {
		await vault.unlock(PASSWORD, 1024, 1);
		await vault.store("secret", "data");
		vault.lock();

		const vault2 = new Vault(TEST_DIR);
		await vault2.unlock("wrong-password", 1024, 1);
		expect(vault2.retrieve("secret")).rejects.toThrow();
		vault2.lock();
	});

	test("removes entries", async () => {
		await vault.unlock(PASSWORD, 1024, 1);
		await vault.store("to-delete", "gone");
		expect(vault.has("to-delete")).toBe(true);
		vault.remove("to-delete");
		expect(vault.has("to-delete")).toBe(false);
	});

	test("lists entries", async () => {
		await vault.unlock(PASSWORD, 1024, 1);
		await vault.store("entry-1", "data1");
		await vault.store("entry-2", "data2");
		const entries = vault.listEntries();
		expect(entries).toContain("entry-1");
		expect(entries).toContain("entry-2");
		expect(entries.length).toBe(2);
	});
});
