import * as ui from "../ui.js";

export async function dashboardCommand(): Promise<void> {
	ui.header();
	ui.info("Starting dashboard server...");

	try {
		await import("../../dashboard/server.js");
	} catch (error) {
		ui.error(`Failed to start dashboard: ${error}`);
	}
}
