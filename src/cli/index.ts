#!/usr/bin/env bun
import { Command } from "commander";
import { configCommand } from "./commands/config.js";
import { dashboardCommand } from "./commands/dashboard.js";
import { removeCommand } from "./commands/remove.js";
import { researchCommand } from "./commands/research.js";
import { scanCommand } from "./commands/scan.js";
import { setupCommand } from "./commands/setup.js";
import { statusCommand } from "./commands/status.js";

const program = new Command();

program.name("ai-eraser").description("AI-powered personal data removal engine").version("0.1.0");

program
	.command("setup")
	.description("Configure AI Eraser — API keys, email, and vault password")
	.action(setupCommand);

program
	.command("scan")
	.description("Scan data brokers for your personal information")
	.action(scanCommand);

program
	.command("remove")
	.description("Start opt-out/removal requests for discovered profiles")
	.action(removeCommand);

program
	.command("status")
	.description("View current campaign status across all brokers")
	.action(statusCommand);

program
	.command("dashboard")
	.description("Launch the web-based monitoring dashboard")
	.action(dashboardCommand);

program
	.command("research")
	.description("Research data brokers — discover opt-out processes and difficulty")
	.action(researchCommand);

program.command("config").description("View current configuration").action(configCommand);

program.parse();
