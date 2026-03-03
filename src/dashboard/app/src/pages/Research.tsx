import { useEffect, useState } from "react";
import { AlertTriangleIcon, ExternalLinkIcon } from "../components/Icons.tsx";
import { StatusBadge } from "../components/StatusBadge.tsx";

interface BrokerIntel {
	id: string;
	domain: string;
	name: string;
	category: string | null;
	optOutUrl: string | null;
	optOutMethod: string | null;
	privacyContactEmail: string | null;
	requiresAccount: boolean;
	requiresIdUpload: boolean;
	hasCaptcha: boolean;
	requiresPostalMail: boolean;
	verificationSteps: number;
	estimatedDays: number | null;
	difficulty: string | null;
	difficultyScore: number;
	legalFrameworks: string[];
	dataCategories: string[];
	notes: string | null;
	hasPlaybook: boolean;
	status: string;
	scrapedAt: string | null;
	removalStatus: string | null;
}

interface IntelSummary {
	total: number;
	byDifficulty: Record<string, number>;
	byCategory: Record<string, number>;
	withPlaybook: number;
	fetchFailed: number;
}

const DIFFICULTY_COLORS: Record<string, string> = {
	easy: "bg-green-900/50 text-green-300",
	medium: "bg-yellow-900/50 text-yellow-300",
	hard: "bg-orange-900/50 text-orange-300",
	very_hard: "bg-red-900/50 text-red-300",
};

const CATEGORY_LABELS: Record<string, string> = {
	people_search: "People Search",
	background_check: "Background Check",
	marketing: "Marketing",
	data_aggregator: "Data Aggregator",
	social_media: "Social Media",
	public_records: "Public Records",
};

function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
	if (!difficulty) return <span className="text-text-muted text-xs">{"\u2014"}</span>;
	const style = DIFFICULTY_COLORS[difficulty] ?? "bg-surface-overlay text-text-secondary";
	const label = difficulty.replace(/_/g, " ");
	return <span className={`inline-block px-2 py-0.5 rounded text-xs ${style}`}>{label}</span>;
}

export function ResearchPage() {
	const [intel, setIntel] = useState<BrokerIntel[]>([]);
	const [summary, setSummary] = useState<IntelSummary | null>(null);
	const [loading, setLoading] = useState(true);
	const [filterCategory, setFilterCategory] = useState<string>("");
	const [filterDifficulty, setFilterDifficulty] = useState<string>("");
	const [filterStatus, setFilterStatus] = useState<string>("");

	useEffect(() => {
		Promise.all([
			fetch("/api/broker-intel").then((r) => r.json()),
			fetch("/api/broker-intel/summary").then((r) => r.json()),
		])
			.then(([intelData, summaryData]) => {
				setIntel(intelData);
				setSummary(summaryData);
			})
			.catch(() => {
				setIntel([]);
				setSummary(null);
			})
			.finally(() => setLoading(false));
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-text-muted">Loading...</div>
			</div>
		);
	}

	if (intel.length === 0) {
		return (
			<div>
				<h2 className="text-2xl font-bold mb-6">Broker Research</h2>
				<div className="bg-surface-raised border border-border rounded-xl p-8 text-center">
					<p className="text-text-muted">No broker research data yet.</p>
					<p className="text-text-muted text-sm mt-1">
						Run <code className="text-accent">bun run dev research</code> to discover brokers.
					</p>
				</div>
			</div>
		);
	}

	const stats = summary ?? {
		total: 0,
		byDifficulty: {},
		byCategory: {},
		withPlaybook: 0,
		fetchFailed: 0,
	};

	const summaryCards = [
		{ label: "Total Researched", value: stats.total, color: "text-text-primary" },
		{ label: "Easy", value: stats.byDifficulty.easy ?? 0, color: "text-green-400" },
		{ label: "Medium", value: stats.byDifficulty.medium ?? 0, color: "text-yellow-400" },
		{ label: "Hard", value: stats.byDifficulty.hard ?? 0, color: "text-orange-400" },
		{ label: "Very Hard", value: stats.byDifficulty.very_hard ?? 0, color: "text-red-400" },
		{ label: "With Playbook", value: stats.withPlaybook, color: "text-accent" },
	];

	// Apply filters
	const filtered = intel.filter((item) => {
		if (filterCategory && item.category !== filterCategory) return false;
		if (filterDifficulty && item.difficulty !== filterDifficulty) return false;
		if (filterStatus && item.status !== filterStatus) return false;
		return true;
	});

	const categories = [...new Set(intel.map((i) => i.category).filter(Boolean))] as string[];
	const difficulties = [...new Set(intel.map((i) => i.difficulty).filter(Boolean))] as string[];
	const statuses = [...new Set(intel.map((i) => i.status))] as string[];

	return (
		<div>
			<h2 className="text-2xl font-bold mb-6">Broker Research</h2>

			{/* Summary cards */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
				{summaryCards.map((card) => (
					<div key={card.label} className="bg-surface-raised border border-border rounded-xl p-4">
						<p className="text-xs text-text-muted mb-1">{card.label}</p>
						<p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
					</div>
				))}
				{/* Fetch Failed card — amber */}
				{stats.fetchFailed > 0 && (
					<div className="bg-surface-raised border border-amber-600/40 rounded-xl p-4">
						<p className="text-xs text-amber-400 mb-1 flex items-center gap-1">
							<AlertTriangleIcon className="w-3 h-3" />
							Fetch Failed
						</p>
						<p className="text-2xl font-bold text-amber-400">{stats.fetchFailed}</p>
					</div>
				)}
			</div>

			{/* Filter bar */}
			<div className="flex flex-wrap gap-3 mb-6">
				<select
					value={filterCategory}
					onChange={(e) => setFilterCategory(e.target.value)}
					className="bg-surface-raised border border-border rounded-lg px-3 py-1.5 text-sm text-text-secondary"
				>
					<option value="">All Categories</option>
					{categories.map((cat) => (
						<option key={cat} value={cat}>
							{CATEGORY_LABELS[cat] ?? cat}
						</option>
					))}
				</select>
				<select
					value={filterDifficulty}
					onChange={(e) => setFilterDifficulty(e.target.value)}
					className="bg-surface-raised border border-border rounded-lg px-3 py-1.5 text-sm text-text-secondary"
				>
					<option value="">All Difficulties</option>
					{difficulties.map((d) => (
						<option key={d} value={d}>
							{d.replace(/_/g, " ")}
						</option>
					))}
				</select>
				<select
					value={filterStatus}
					onChange={(e) => setFilterStatus(e.target.value)}
					className="bg-surface-raised border border-border rounded-lg px-3 py-1.5 text-sm text-text-secondary"
				>
					<option value="">All Statuses</option>
					{statuses.map((s) => (
						<option key={s} value={s}>
							{s.replace(/_/g, " ")}
						</option>
					))}
				</select>
				<span className="text-sm text-text-muted self-center ml-auto">
					{filtered.length} broker{filtered.length !== 1 ? "s" : ""}
				</span>
			</div>

			{/* Broker intel cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{filtered.map((item) => {
					const isFetchFailed = item.status === "fetch_failed";
					return (
						<div
							key={item.id}
							className={`bg-surface-raised border rounded-xl p-5 space-y-3 ${
								isFetchFailed ? "border-amber-600/40" : "border-border"
							}`}
						>
							<div className="flex items-start justify-between">
								<div>
									<h3 className="font-semibold text-text-primary">{item.name}</h3>
									<p className="text-xs text-text-muted">{item.domain}</p>
								</div>
								<DifficultyBadge difficulty={item.difficulty} />
							</div>

							<div className="flex flex-wrap gap-2 text-xs">
								{item.category && (
									<span className="bg-surface-overlay text-text-secondary px-2 py-0.5 rounded">
										{CATEGORY_LABELS[item.category] ?? item.category}
									</span>
								)}
								{item.optOutMethod && (
									<span className="bg-surface-overlay text-text-secondary px-2 py-0.5 rounded">
										{item.optOutMethod.replace(/_/g, " ")}
									</span>
								)}
								{item.hasPlaybook && (
									<span className="bg-violet-900/50 text-violet-300 px-2 py-0.5 rounded">
										playbook
									</span>
								)}
							</div>

							{/* Flags */}
							<div className="flex gap-3 text-xs text-text-muted">
								{item.requiresAccount && <span title="Requires account">account</span>}
								{item.hasCaptcha && <span title="Has CAPTCHA">captcha</span>}
								{item.requiresIdUpload && <span title="Requires ID upload">ID upload</span>}
								{item.requiresPostalMail && <span title="Requires postal mail">postal</span>}
								{item.estimatedDays && <span>{item.estimatedDays}d</span>}
							</div>

							{/* Fetch failed notes */}
							{isFetchFailed && item.notes && (
								<div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-900/20 rounded p-2">
									<AlertTriangleIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
									<span>{item.notes}</span>
								</div>
							)}

							{/* Links and contact */}
							<div className="text-xs space-y-1">
								{item.optOutUrl && (
									<a
										href={item.optOutUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="text-accent hover:opacity-80 flex items-center gap-1 transition-colors"
									>
										<ExternalLinkIcon className="w-3 h-3 shrink-0" />
										<span className="truncate">{item.optOutUrl}</span>
									</a>
								)}
								{item.privacyContactEmail && (
									<p className="text-text-muted">{item.privacyContactEmail}</p>
								)}
							</div>

							{/* Removal status */}
							<div className="flex items-center justify-between pt-2 border-t border-border">
								<div className="text-xs">
									{item.removalStatus ? (
										<StatusBadge status={item.removalStatus} />
									) : (
										<span className="text-text-muted">Not processed</span>
									)}
								</div>
								<StatusBadge status={item.status} />
							</div>

							{item.scrapedAt && (
								<p className="text-xs text-text-muted">Scraped: {item.scrapedAt.slice(0, 10)}</p>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
