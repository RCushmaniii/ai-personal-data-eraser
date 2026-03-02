import chalk from "chalk";
import type { BrokerStatus, CampaignSummary } from "../types/index.js";

export const BRAND = chalk.bold.hex("#7c3aed")("ai-eraser");

export function header(): void {
	console.log();
	console.log(`  ${BRAND} ${chalk.dim("— AI-powered personal data removal")}`);
	console.log();
}

export function success(message: string): void {
	console.log(`  ${chalk.green("✓")} ${message}`);
}

export function error(message: string): void {
	console.log(`  ${chalk.red("✗")} ${message}`);
}

export function warn(message: string): void {
	console.log(`  ${chalk.yellow("!")} ${message}`);
}

export function info(message: string): void {
	console.log(`  ${chalk.blue("ℹ")} ${message}`);
}

export function dim(message: string): void {
	console.log(`  ${chalk.dim(message)}`);
}

const STATUS_COLORS: Record<BrokerStatus, (s: string) => string> = {
	discovered: chalk.gray,
	scanning: chalk.blue,
	found: chalk.yellow,
	not_found: chalk.dim,
	opt_out_started: chalk.cyan,
	opt_out_submitted: chalk.cyan,
	verification_needed: chalk.magenta,
	awaiting_confirmation: chalk.yellow,
	removal_confirmed: chalk.green,
	removal_failed: chalk.red,
	re_appeared: chalk.red.bold,
};

export function statusBadge(status: BrokerStatus): string {
	const colorFn = STATUS_COLORS[status] ?? chalk.white;
	const label = status.replace(/_/g, " ");
	return colorFn(`[${label}]`);
}

export function formatSummary(summary: CampaignSummary): string {
	const lines = [
		`  ${chalk.bold("Campaign Summary")}`,
		`  Total brokers: ${summary.totalBrokers}`,
		`  Scanned:       ${summary.scanned}`,
		`  Found:         ${chalk.yellow(String(summary.found))}`,
		`  Opt-out sent:  ${chalk.cyan(String(summary.optOutStarted))}`,
		`  Confirmed:     ${chalk.green(String(summary.removalConfirmed))}`,
		`  Failed:        ${chalk.red(String(summary.removalFailed))}`,
		`  Pending:       ${summary.pending}`,
		`  Success rate:  ${(summary.successRate * 100).toFixed(1)}%`,
	];
	return lines.join("\n");
}

export function table(rows: string[][], headers?: string[]): void {
	const widths = (headers ?? rows[0] ?? []).map((_, i) =>
		Math.max(...rows.map((r) => (r[i] ?? "").length), headers?.[i]?.length ?? 0),
	);

	if (headers) {
		const headerRow = headers.map((h, i) => chalk.bold(h.padEnd(widths[i]))).join("  ");
		console.log(`  ${headerRow}`);
		console.log(`  ${widths.map((w) => "─".repeat(w)).join("──")}`);
	}

	for (const row of rows) {
		const line = row.map((cell, i) => cell.padEnd(widths[i])).join("  ");
		console.log(`  ${line}`);
	}
}
