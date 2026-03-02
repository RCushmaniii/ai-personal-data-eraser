import type { Page } from "playwright";
import type { PiiSearchQuery } from "../types/index.js";
import type { Playbook, PlaybookStepAction } from "./playbook-schema.js";

interface ResolvedStep {
	name: string;
	action: PlaybookStepAction;
	onFailure: "retry" | "skip" | "abort";
	maxRetries: number;
}

export interface StepResult {
	stepName: string;
	success: boolean;
	action: PlaybookStepAction["type"];
	message: string;
	data?: Record<string, unknown>;
	duration: number;
}

export interface PlaybookRunResult {
	brokerId: string;
	phase: "search" | "optOut" | "verify";
	success: boolean;
	steps: StepResult[];
	totalDuration: number;
}

/**
 * Executes broker playbook steps.
 * When constructed with a Playwright Page, performs real browser actions.
 * Without a Page, falls back to dry-run stubs for backward compatibility.
 */
export class PlaybookRunner {
	private page: Page | null;

	constructor(page?: Page) {
		this.page = page ?? null;
	}

	/**
	 * Runs the search phase of a playbook to check if a person's data exists.
	 */
	async runSearch(playbook: Playbook, query: PiiSearchQuery): Promise<PlaybookRunResult> {
		return this.runPhase(playbook, "search", query);
	}

	/**
	 * Runs the opt-out phase to submit removal requests.
	 */
	async runOptOut(playbook: Playbook, query: PiiSearchQuery): Promise<PlaybookRunResult> {
		return this.runPhase(playbook, "optOut", query);
	}

	/**
	 * Runs the verification phase to check if removal was successful.
	 */
	async runVerify(playbook: Playbook, query: PiiSearchQuery): Promise<PlaybookRunResult> {
		return this.runPhase(playbook, "verify", query);
	}

	private async runPhase(
		playbook: Playbook,
		phase: "search" | "optOut" | "verify",
		query: PiiSearchQuery,
	): Promise<PlaybookRunResult> {
		const steps = playbook.steps[phase] as ResolvedStep[];
		const results: StepResult[] = [];
		const startTime = Date.now();

		for (const step of steps) {
			const stepResult = await this.executeStep(step, query);
			results.push(stepResult);

			if (!stepResult.success && step.onFailure === "abort") {
				break;
			}
		}

		return {
			brokerId: playbook.id,
			phase,
			success: results.every((r) => r.success),
			steps: results,
			totalDuration: Date.now() - startTime,
		};
	}

	private async executeStep(step: ResolvedStep, query: PiiSearchQuery): Promise<StepResult> {
		const startTime = Date.now();
		let attempts = 0;

		while (attempts <= step.maxRetries) {
			try {
				const result = await this.executeAction(step.action, query);
				return {
					stepName: step.name,
					success: true,
					action: step.action.type,
					message: result.message,
					data: result.data,
					duration: Date.now() - startTime,
				};
			} catch (error) {
				attempts++;
				if (attempts > step.maxRetries || step.onFailure !== "retry") {
					return {
						stepName: step.name,
						success: false,
						action: step.action.type,
						message: error instanceof Error ? error.message : String(error),
						duration: Date.now() - startTime,
					};
				}
			}
		}

		return {
			stepName: step.name,
			success: false,
			action: step.action.type,
			message: "Max retries exceeded",
			duration: Date.now() - startTime,
		};
	}

	private async executeAction(
		action: PlaybookStepAction,
		query: PiiSearchQuery,
	): Promise<{ message: string; data?: Record<string, unknown> }> {
		switch (action.type) {
			case "navigate":
				return this.executeNavigate(action.url, query);
			case "fill_form":
				return this.executeFillForm(action.fields, query);
			case "click":
				return this.executeClick(action.selector);
			case "wait":
				return this.executeWait(action.seconds);
			case "send_email":
				return this.executeSendEmail(action.template, action.to);
			case "ai_analyze":
				return this.executeAiAnalyze(action.prompt);
			case "verify_removal":
				return this.executeVerifyRemoval(action.checkUrl, query);
			case "captcha":
				return this.executeCaptcha(action.handler);
		}
	}

	private async executeNavigate(
		urlTemplate: string,
		query: PiiSearchQuery,
	): Promise<{ message: string; data?: Record<string, unknown> }> {
		const url = this.interpolateUrl(urlTemplate, query);

		if (!this.page) {
			return { message: `[dry-run] Would navigate to: ${url}`, data: { url } };
		}

		await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
		const title = await this.page.title();
		const pageUrl = this.page.url();
		return {
			message: `Navigated to: ${pageUrl} (${title})`,
			data: { url: pageUrl, title },
		};
	}

	private async executeFillForm(
		fields: Record<string, string>,
		query: PiiSearchQuery,
	): Promise<{ message: string; data?: Record<string, unknown> }> {
		const resolved = Object.fromEntries(
			Object.entries(fields).map(([k, v]) => [k, this.interpolateValue(v, query)]),
		);

		if (!this.page) {
			return {
				message: `[dry-run] Would fill form fields: ${Object.keys(resolved).join(", ")}`,
				data: resolved,
			};
		}

		for (const [selector, value] of Object.entries(resolved)) {
			await this.page.fill(selector, value, { timeout: 10_000 });
		}
		return {
			message: `Filled ${Object.keys(resolved).length} form fields`,
			data: resolved,
		};
	}

	private async executeClick(selector: string): Promise<{ message: string }> {
		if (!this.page) {
			return { message: `[dry-run] Would click: ${selector}` };
		}

		await this.page.click(selector, { timeout: 10_000 });
		// Brief wait for page reaction
		await this.page.waitForTimeout(500);
		return { message: `Clicked: ${selector}` };
	}

	private async executeWait(seconds: number): Promise<{ message: string }> {
		await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
		return { message: `Waited ${seconds} seconds` };
	}

	private async executeSendEmail(template: string, to: string): Promise<{ message: string }> {
		// TODO: Integrate with email sender
		return { message: `Would send ${template} email to ${to}` };
	}

	private async executeAiAnalyze(
		prompt: string,
	): Promise<{ message: string; data?: Record<string, unknown> }> {
		if (!this.page) {
			return { message: `[dry-run] Would analyze with AI: ${prompt}` };
		}

		const bodyText = await this.page.innerText("body");
		return {
			message: `Captured page content for AI analysis (${bodyText.length} chars)`,
			data: { prompt, contentLength: bodyText.length, content: bodyText.slice(0, 5000) },
		};
	}

	private async executeVerifyRemoval(
		checkUrl: string,
		query: PiiSearchQuery,
	): Promise<{ message: string; data?: Record<string, unknown> }> {
		const url = this.interpolateUrl(checkUrl, query);

		if (!this.page) {
			return { message: `[dry-run] Would verify removal at: ${url}`, data: { url } };
		}

		await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
		const bodyText = await this.page.innerText("body");
		const lowerText = bodyText.toLowerCase();

		const notFoundIndicators = [
			"no results",
			"not found",
			"no records",
			"no matching",
			"0 results",
			"we could not find",
			"no information",
		];

		const removed = notFoundIndicators.some((indicator) => lowerText.includes(indicator));
		return {
			message: removed
				? `Verified: profile not found at ${url}`
				: `Profile may still exist at ${url}`,
			data: { url, removed, contentLength: bodyText.length },
		};
	}

	private async executeCaptcha(handler: "manual" | "ai_assist"): Promise<{ message: string }> {
		if (!this.page || handler !== "manual") {
			return { message: `[dry-run] Would handle captcha via: ${handler}` };
		}

		// Manual mode: pause and let user solve in the visible browser
		console.log("\n  ⚠ CAPTCHA detected — please solve it in the browser window.");
		console.log("  Waiting up to 120 seconds...\n");

		try {
			// Wait for navigation or significant DOM change after captcha solve
			await this.page.waitForNavigation({ timeout: 120_000 });
			return { message: "CAPTCHA solved by user" };
		} catch {
			return { message: "CAPTCHA timeout — user did not solve within 120 seconds" };
		}
	}

	private interpolateUrl(template: string, query: PiiSearchQuery): string {
		return template
			.replace("{{firstName}}", encodeURIComponent(query.firstName))
			.replace("{{lastName}}", encodeURIComponent(query.lastName))
			.replace("{{state}}", encodeURIComponent(query.state ?? ""))
			.replace("{{city}}", encodeURIComponent(query.city ?? ""));
	}

	private interpolateValue(template: string, query: PiiSearchQuery): string {
		return template
			.replace("{{firstName}}", query.firstName)
			.replace("{{lastName}}", query.lastName)
			.replace("{{state}}", query.state ?? "")
			.replace("{{city}}", query.city ?? "");
	}
}
