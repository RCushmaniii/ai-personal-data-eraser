// Use require() with -sumo variant — standard libsodium-wrappers lacks crypto_pwhash,
// and Bun's ESM resolution for the package is broken
const sodium = require("libsodium-wrappers-sumo") as typeof import("libsodium-wrappers-sumo");
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type DerivedKey, deriveKey, fromBase64, secureWipe, toBase64 } from "./keychain.js";

let _sodiumReady = false;

async function ensureReady(): Promise<void> {
	if (!_sodiumReady) {
		await sodium.ready;
		_sodiumReady = true;
	}
}

export interface VaultEntry {
	id: string;
	ciphertext: string;
	nonce: string;
	createdAt: string;
	updatedAt: string;
}

export interface VaultMetadata {
	version: number;
	salt: string;
	entries: Record<string, { nonce: string; createdAt: string; updatedAt: string }>;
}

/**
 * Encrypted vault for PII storage.
 * Uses XSalsa20-Poly1305 authenticated encryption with Argon2id key derivation.
 */
export class Vault {
	private dataDir: string;
	private derivedKey: DerivedKey | null = null;
	private metadata: VaultMetadata | null = null;

	constructor(dataDir: string) {
		this.dataDir = dataDir;
	}

	/**
	 * Initializes the vault with a password. Derives encryption key using Argon2id.
	 * If the vault already exists, loads existing metadata and derives key with stored salt.
	 */
	async unlock(password: string, memoryCost = 65536, timeCost = 3): Promise<void> {
		await ensureReady();
		mkdirSync(this.dataDir, { recursive: true });

		const metaPath = join(this.dataDir, "vault.meta.json");

		if (existsSync(metaPath)) {
			const raw = readFileSync(metaPath, "utf-8");
			this.metadata = JSON.parse(raw) as VaultMetadata;
			const salt = fromBase64(this.metadata.salt);
			this.derivedKey = await deriveKey(password, salt, memoryCost, timeCost);
		} else {
			this.derivedKey = await deriveKey(password, undefined, memoryCost, timeCost);
			this.metadata = {
				version: 1,
				salt: toBase64(this.derivedKey.salt),
				entries: {},
			};
			this.saveMetadata();
		}
	}

	/**
	 * Locks the vault by wiping the encryption key from memory.
	 */
	lock(): void {
		if (this.derivedKey) {
			secureWipe(this.derivedKey.key);
			this.derivedKey = null;
		}
		this.metadata = null;
	}

	get isUnlocked(): boolean {
		return this.derivedKey !== null;
	}

	/**
	 * Encrypts and stores data in the vault.
	 */
	async store(id: string, plaintext: string): Promise<void> {
		this.ensureUnlocked();
		await ensureReady();

		const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
		const ciphertext = sodium.crypto_secretbox_easy(
			sodium.from_string(plaintext),
			nonce,
			this.derivedKey!.key,
		);

		const entryPath = join(this.dataDir, `${id}.enc`);
		writeFileSync(entryPath, toBase64(ciphertext));

		const now = new Date().toISOString();
		this.metadata!.entries[id] = {
			nonce: toBase64(nonce),
			createdAt: this.metadata!.entries[id]?.createdAt ?? now,
			updatedAt: now,
		};
		this.saveMetadata();
	}

	/**
	 * Decrypts and retrieves data from the vault.
	 */
	async retrieve(id: string): Promise<string> {
		this.ensureUnlocked();
		await ensureReady();

		const entryMeta = this.metadata!.entries[id];
		if (!entryMeta) {
			throw new Error(`Vault entry not found: ${id}`);
		}

		const entryPath = join(this.dataDir, `${id}.enc`);
		if (!existsSync(entryPath)) {
			throw new Error(`Vault data file missing: ${id}`);
		}

		const ciphertext = fromBase64(readFileSync(entryPath, "utf-8"));
		const nonce = fromBase64(entryMeta.nonce);

		const plaintext = sodium.crypto_secretbox_open_easy(ciphertext, nonce, this.derivedKey!.key);

		return sodium.to_string(plaintext);
	}

	/**
	 * Removes an entry from the vault.
	 */
	remove(id: string): void {
		this.ensureUnlocked();

		const entryPath = join(this.dataDir, `${id}.enc`);
		if (existsSync(entryPath)) {
			unlinkSync(entryPath);
		}

		delete this.metadata!.entries[id];
		this.saveMetadata();
	}

	/**
	 * Lists all entry IDs in the vault.
	 */
	listEntries(): string[] {
		this.ensureUnlocked();
		return Object.keys(this.metadata!.entries);
	}

	/**
	 * Checks if an entry exists in the vault.
	 */
	has(id: string): boolean {
		this.ensureUnlocked();
		return id in this.metadata!.entries;
	}

	private ensureUnlocked(): void {
		if (!this.derivedKey || !this.metadata) {
			throw new Error("Vault is locked. Call unlock() first.");
		}
	}

	private saveMetadata(): void {
		const metaPath = join(this.dataDir, "vault.meta.json");
		writeFileSync(metaPath, JSON.stringify(this.metadata, null, 2));
	}
}
