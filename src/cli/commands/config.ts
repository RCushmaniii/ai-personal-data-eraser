import * as p from "@clack/prompts";
import { existsSync, readFileSync } from "node:fs";
import * as ui from "../ui.js";

export async function configCommand(): Promise<void> {
	ui.header();

	if (!existsSync(".env")) {
		ui.error("No .env file found. Run `bun run dev setup` first.");
		return;
	}

	const envContent = readFileSync(".env", "utf-8");
	const lines = envContent.split("\n").filter((l) => l.trim() && !l.startsWith("#"));

	console.log();
	ui.info("Current configuration:");
	console.log();

	for (const line of lines) {
		const [key, ...valueParts] = line.split("=");
		const value = valueParts.join("=");

		// Mask sensitive values
		const sensitiveKeys = ["API_KEY", "PASS", "PASSWORD", "SECRET", "TOKEN"];
		const isSensitive = sensitiveKeys.some((sk) => key.includes(sk));
		const displayValue = isSensitive && value ? `${value.slice(0, 4)}${"*".repeat(Math.max(0, value.length - 4))}` : value || "(empty)";

		console.log(`  ${key} = ${displayValue}`);
	}

	console.log();
	ui.dim("Edit .env directly to change configuration, or run `bun run dev setup` to reconfigure.");
}
