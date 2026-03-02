export { Vault, type VaultEntry, type VaultMetadata } from "./vault.js";
export {
	deriveKey,
	generateRandomKey,
	generateNonce,
	secureWipe,
	toBase64,
	fromBase64,
	type DerivedKey,
} from "./keychain.js";
