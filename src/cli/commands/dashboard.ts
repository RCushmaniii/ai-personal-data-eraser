import { initConfig } from "../../config/index.js";
import * as ui from "../ui.js";

export async function dashboardCommand(): Promise<void> {
	ui.header();

	try {
		initConfig();
	} catch {
		ui.error("Configuration not found. Run `bun run dev setup` first.");
		return;
	}

	ui.info("Starting dashboard server...");

	try {
		await import("../../dashboard/server.js");
	} catch (error) {
		ui.error(`Failed to start dashboard: ${error}`);
	}
}
