import { initConfig } from "../../config/index.js";
import { startScheduler } from "../../scheduler/index.js";
import * as ui from "../ui.js";

export async function dashboardCommand(): Promise<void> {
	ui.header();

	// Initialize config — dashboard should work even if config is incomplete
	try {
		initConfig();
	} catch {
		ui.warn("Config not fully initialized. Some features may be limited.");
	}

	ui.info("Starting dashboard server...");

	try {
		await import("../../dashboard/server.js");
	} catch (error) {
		ui.error(`Failed to start dashboard: ${error}`);
		return;
	}

	// Start scheduler (checks config.scheduler.enabled internally)
	try {
		startScheduler();
	} catch (error) {
		ui.warn(`Scheduler failed to start: ${error instanceof Error ? error.message : error}`);
	}
}
