import * as p from "@clack/prompts";
import { ResearchAgent } from "../../agents/research.js";
import { initConfig } from "../../config/index.js";
import { getDatabase } from "../../state/database.js";
import { runMigrations } from "../../state/migrate.js";
import { Store } from "../../state/store.js";
import type { BrokerCategory } from "../../types/index.js";
import * as ui from "../ui.js";

const CATEGORIES: { value: BrokerCategory; label: string }[] = [
	{ value: "people_search", label: "People Search" },
	{ value: "background_check", label: "Background Check" },
	{ value: "marketing", label: "Marketing / Advertising" },
	{ value: "data_aggregator", label: "Data Aggregator" },
	{ value: "social_media", label: "Social Media" },
	{ value: "public_records", label: "Public Records" },
];

export async function researchCommand(): Promise<void> {
	ui.header();
	p.intro("Broker Intelligence — Research & Discovery");

	// Config is required — research needs the Anthropic API key
	try {
		initConfig();
	} catch (error) {
		ui.error(`Configuration failed: ${error instanceof Error ? error.message : String(error)}`);
		p.outro("Set ANTHROPIC_API_KEY in .env and try again.");
		return;
	}

	const db = getDatabase();
	runMigrations(db);

	// Research mode
	const mode = await p.select({
		message: "What would you like to do?",
		options: [
			{ value: "specific", label: "Research a specific broker" },
			{ value: "discover", label: "Discover brokers by category" },
		],
	});
	if (p.isCancel(mode)) return;

	let domain: string | undefined;
	let category: BrokerCategory | undefined;

	if (mode === "specific") {
		const input = await p.text({
			message: "Broker domain:",
			placeholder: "e.g. spokeo.com",
			validate: (v) => (!v ? "Domain is required" : undefined),
		});
		if (p.isCancel(input)) return;
		domain = input;
	} else {
		const catChoice = await p.select({
			message: "Select broker category:",
			options: CATEGORIES,
		});
		if (p.isCancel(catChoice)) return;
		category = catChoice as BrokerCategory;
	}

	const s = p.spinner();

	s.start(
		domain ? `Researching ${domain}...` : `Discovering ${category?.replace(/_/g, " ")} brokers...`,
	);

	const agent = new ResearchAgent();
	const result = await agent.run({ domain, category });
	s.stop("Research complete");

	if (result.success) {
		ui.success(result.message);
	} else {
		ui.error(result.message);
	}

	// Display results table
	if (result.data) {
		const results = result.data.results as {
			domain: string;
			name: string;
			difficulty: string;
			success: boolean;
		}[];

		if (results.length > 0) {
			console.log();
			const store = new Store();
			const succeeded = results.filter((r) => r.success);
			const failed = results.filter((r) => !r.success);

			if (succeeded.length > 0) {
				const rows = succeeded.map((r) => {
					const intel = store.getBrokerIntel(r.domain);
					return [
						r.domain,
						r.name,
						r.difficulty,
						intel?.optOutMethod ?? "-",
						intel?.optOutUrl ?? "-",
					];
				});
				ui.table(rows, ["Domain", "Name", "Difficulty", "Method", "Opt-Out URL"]);
			}

			if (failed.length > 0) {
				console.log();
				p.log.warn(`${failed.length} broker(s) failed:`);
				for (const f of failed) {
					p.log.message(`  ${f.domain}`);
				}

				// Surface error details from agent actions
				const errorActions = agent.getActions().filter((a) => a.type === "research_error");
				if (errorActions.length > 0) {
					console.log();
					for (const a of errorActions) {
						p.log.error(a.description);
					}
				}
			}
		}
	}

	console.log();
	p.outro("View results: bun run dashboard → Research page");
}
