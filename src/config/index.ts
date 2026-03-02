import type { AppConfig } from "../types/index.js";
import { appConfigSchema } from "./schema.js";
import { loadConfigFromEnv } from "./defaults.js";

let _config: AppConfig | null = null;

export function getConfig(): AppConfig {
	if (!_config) {
		throw new Error("Config not initialized. Call initConfig() first.");
	}
	return _config;
}

export function initConfig(overrides?: Partial<AppConfig>): AppConfig {
	const envConfig = loadConfigFromEnv();
	const merged = { ...envConfig, ...overrides };
	const result = appConfigSchema.safeParse(merged);

	if (!result.success) {
		const errors = result.error.issues
			.map((i) => `  - ${i.path.join(".")}: ${i.message}`)
			.join("\n");
		throw new Error(`Invalid configuration:\n${errors}`);
	}

	_config = result.data as AppConfig;
	return _config;
}

export function resetConfig(): void {
	_config = null;
}

export { appConfigSchema } from "./schema.js";
export { DEFAULT_CONFIG, loadConfigFromEnv } from "./defaults.js";
