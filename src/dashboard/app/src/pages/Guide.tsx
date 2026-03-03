import { ExternalLinkIcon, ShieldIcon } from "../components/Icons.tsx";

const steps = [
	{
		number: 1,
		title: "Research Brokers",
		command: "bun run dev research",
		description:
			"Discover data brokers and analyze their opt-out processes. The research agent fetches broker homepages, identifies opt-out pages, and uses Claude AI to score difficulty.",
	},
	{
		number: 2,
		title: "Review Research",
		command: null,
		description:
			"Check the Research tab to see which brokers were found, their difficulty ratings, and opt-out methods. Failed fetches will appear in amber for Tier 2 retry.",
	},
	{
		number: 3,
		title: "Set Up Your Profile",
		command: "bun run dev setup",
		description:
			"Create an encrypted vault with your personal information (name, email, phone, addresses). This data is encrypted at rest and never stored in plaintext.",
	},
	{
		number: 4,
		title: "Scan for Your Data",
		command: "bun run dev scan",
		description:
			"Search known data brokers for listings that match your profile. Results are stored with confidence scores so you can prioritize removals.",
	},
	{
		number: 5,
		title: "Remove Your Data",
		command: "bun run dev remove",
		description:
			"Submit opt-out requests to brokers where your data was found. Requests use CCPA, GDPR, or generic templates depending on the broker's jurisdiction.",
	},
	{
		number: 6,
		title: "Track Progress",
		command: null,
		description:
			"Monitor removal status on the Dashboard and review the audit trail in Tasks. The system will periodically re-check brokers to confirm removal.",
	},
];

const tips = [
	{
		title: "Anthropic API Key",
		text: "Required. Set ANTHROPIC_API_KEY in your .env file. Used for broker page analysis, form detection, and response classification.",
	},
	{
		title: "Firecrawl API Key",
		text: "Optional but recommended. Set FIRECRAWL_API_KEY for better page fetching (handles JavaScript-rendered content). Falls back to direct HTTP fetch without it.",
	},
	{
		title: "Email Configuration",
		text: "Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS to enable email-based removal requests. IMAP settings enable inbox monitoring for responses.",
	},
];

export function GuidePage() {
	return (
		<div>
			<div className="flex items-center gap-3 mb-6">
				<ShieldIcon className="w-6 h-6 text-accent" />
				<h2 className="text-2xl font-bold">Getting Started</h2>
			</div>

			{/* Workflow stepper */}
			<div className="space-y-0 mb-10">
				{steps.map((step, i) => (
					<div key={step.number} className="flex gap-4">
						{/* Vertical line + number */}
						<div className="flex flex-col items-center">
							<div className="w-8 h-8 rounded-full bg-accent-subtle text-accent flex items-center justify-center text-sm font-bold shrink-0">
								{step.number}
							</div>
							{i < steps.length - 1 && <div className="w-px flex-1 bg-border min-h-8" />}
						</div>

						{/* Content */}
						<div className="pb-6">
							<h3 className="font-semibold text-text-primary">{step.title}</h3>
							{step.command && (
								<code className="text-xs text-accent bg-accent-subtle px-2 py-0.5 rounded mt-1 inline-block">
									{step.command}
								</code>
							)}
							<p className="text-sm text-text-secondary mt-1.5 max-w-lg">{step.description}</p>
						</div>
					</div>
				))}
			</div>

			{/* Configuration tips */}
			<h3 className="text-lg font-semibold mb-4 text-text-primary">Configuration</h3>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				{tips.map((tip) => (
					<div key={tip.title} className="bg-surface-raised border border-border rounded-xl p-5">
						<h4 className="font-medium text-text-primary mb-2">{tip.title}</h4>
						<p className="text-sm text-text-secondary">{tip.text}</p>
					</div>
				))}
			</div>

			{/* Link to .env.example */}
			<div className="bg-surface-raised border border-border rounded-xl p-5 flex items-center gap-3">
				<ExternalLinkIcon className="w-4 h-4 text-text-muted shrink-0" />
				<p className="text-sm text-text-secondary">
					Copy <code className="text-accent">.env.example</code> to{" "}
					<code className="text-accent">.env</code> and fill in your keys to get started.
				</p>
			</div>
		</div>
	);
}
