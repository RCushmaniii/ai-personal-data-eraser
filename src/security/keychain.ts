// Use require() with -sumo variant — standard libsodium-wrappers lacks crypto_pwhash,
// and Bun's ESM resolution for the package is broken
const sodium = require("libsodium-wrappers-sumo") as typeof import("libsodium-wrappers-sumo");

let _initialized = false;

async function ensureReady(): Promise<void> {
	if (!_initialized) {
		await sodium.ready;
		_initialized = true;
	}
}

export interface DerivedKey {
	key: Uint8Array;
	salt: Uint8Array;
}

/**
 * Derives an encryption key from a password using Argon2id.
 * Uses libsodium's crypto_pwhash for memory-hard key derivation.
 */
export async function deriveKey(
	password: string,
	salt?: Uint8Array,
	memoryCost = 65536,
	timeCost = 3,
): Promise<DerivedKey> {
	await ensureReady();

	const keySalt = salt ?? sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
	const key = sodium.crypto_pwhash(
		sodium.crypto_secretbox_KEYBYTES,
		password,
		keySalt,
		timeCost,
		memoryCost * 1024,
		sodium.crypto_pwhash_ALG_ARGON2ID13,
	);

	return { key, salt: keySalt };
}

/**
 * Generates a random encryption key (for session keys, not password-derived).
 */
export async function generateRandomKey(): Promise<Uint8Array> {
	await ensureReady();
	return sodium.crypto_secretbox_keygen();
}

/**
 * Generates a random nonce for XSalsa20-Poly1305.
 */
export async function generateNonce(): Promise<Uint8Array> {
	await ensureReady();
	return sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
}

/**
 * Securely zeroes memory containing sensitive data.
 */
export function secureWipe(data: Uint8Array): void {
	sodium.memzero(data);
}

/**
 * Encodes bytes to base64 for safe storage.
 */
export function toBase64(data: Uint8Array): string {
	return sodium.to_base64(data, sodium.base64_variants.ORIGINAL);
}

/**
 * Decodes base64 string back to bytes.
 */
export function fromBase64(encoded: string): Uint8Array {
	return sodium.from_base64(encoded, sodium.base64_variants.ORIGINAL);
}
