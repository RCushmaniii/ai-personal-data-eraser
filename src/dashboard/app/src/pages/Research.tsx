import { useEffect, useState } from "react";
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
	if (!difficulty) return <span className="text-gray-600 text-xs">—</span>;
	const style = DIFFICULTY_COLORS[difficulty] ?? "bg-gray-700 text-gray-300";
	const label = difficulty.replace(/_/g, " ");
	return <span className={`inline-block px-2 py-0.5 rounded text-xs ${style}`}>{label}</span>;
}

export function ResearchPage() {
	const [intel, setIntel] = useState<BrokerIntel[]>([]);
	const [summary, setSummary] = useState<IntelSummary | null>(null);
	const [loading, setLoading] = useState(true);
	const [filterCategory, setFilterCategory] = useState<string>("");
	const [filterDifficulty, setFilterDifficulty] = useState<string>("");

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
				<div className="text-gray-500">Loading...</div>
			</div>
		);
	}

	if (intel.length === 0) {
		return (
			<div>
				<h2 className="text-2xl font-bold mb-6">Broker Research</h2>
				<div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
					<p className="text-gray-500">No broker research data yet.</p>
					<p className="text-gray-600 text-sm mt-1">
						Run <code className="text-violet-400">bun run dev research</code> to discover brokers.
					</p>
				</div>
			</div>
		);
	}

	const stats = summary ?? { total: 0, byDifficulty: {}, byCategory: {}, withPlaybook: 0 };

	const summaryCards = [
		{ label: "Total Researched", value: stats.total, color: "text-gray-100" },
		{ label: "Easy", value: stats.byDifficulty.easy ?? 0, color: "text-green-400" },
		{ label: "Medium", value: stats.byDifficulty.medium ?? 0, color: "text-yellow-400" },
		{ label: "Hard", value: stats.byDifficulty.hard ?? 0, color: "text-orange-400" },
		{ label: "Very Hard", value: stats.byDifficulty.very_hard ?? 0, color: "text-red-400" },
		{ label: "With Playbook", value: stats.withPlaybook, color: "text-violet-400" },
	];

	// Apply filters
	const filtered = intel.filter((item) => {
		if (filterCategory && item.category !== filterCategory) return false;
		if (filterDifficulty && item.difficulty !== filterDifficulty) return false;
		return true;
	});

	const categories = [...new Set(intel.map((i) => i.category).filter(Boolean))] as string[];
	const difficulties = [...new Set(intel.map((i) => i.difficulty).filter(Boolean))] as string[];

	return (
		<div>
			<h2 className="text-2xl font-bold mb-6">Broker Research</h2>

			{/* Summary cards */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
				{summaryCards.map((card) => (
					<div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
						<p className="text-xs text-gray-500 mb-1">{card.label}</p>
						<p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
					</div>
				))}
			</div>

			{/* Filter bar */}
			<div className="flex gap-3 mb-6">
				<select
					value={filterCategory}
					onChange={(e) => setFilterCategory(e.target.value)}
					className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300"
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
					className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300"
				>
					<option value="">All Difficulties</option>
					{difficulties.map((d) => (
						<option key={d} value={d}>
							{d.replace(/_/g, " ")}
						</option>
					))}
				</select>
				<span className="text-sm text-gray-500 self-center ml-auto">
					{filtered.length} broker{filtered.length !== 1 ? "s" : ""}
				</span>
			</div>

			{/* Broker intel cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{filtered.map((item) => (
					<div
						key={item.id}
						className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3"
					>
						<div className="flex items-start justify-between">
							<div>
								<h3 className="font-semibold text-gray-100">{item.name}</h3>
								<p className="text-xs text-gray-500">{item.domain}</p>
							</div>
							<DifficultyBadge difficulty={item.difficulty} />
						</div>

						<div className="flex flex-wrap gap-2 text-xs">
							{item.category && (
								<span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
									{CATEGORY_LABELS[item.category] ?? item.category}
								</span>
							)}
							{item.optOutMethod && (
								<span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
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
						<div className="flex gap-3 text-xs text-gray-500">
							{item.requiresAccount && <span title="Requires account">account</span>}
							{item.hasCaptcha && <span title="Has CAPTCHA">captcha</span>}
							{item.requiresIdUpload && <span title="Requires ID upload">ID upload</span>}
							{item.requiresPostalMail && <span title="Requires postal mail">postal</span>}
							{item.estimatedDays && <span>{item.estimatedDays}d</span>}
						</div>

						{/* Links and contact */}
						<div className="text-xs space-y-1">
							{item.optOutUrl && (
								<a
									href={item.optOutUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-violet-400 hover:text-violet-300 block truncate"
								>
									{item.optOutUrl}
								</a>
							)}
							{item.privacyContactEmail && (
								<p className="text-gray-500">{item.privacyContactEmail}</p>
							)}
						</div>

						{/* Removal status */}
						<div className="flex items-center justify-between pt-2 border-t border-gray-800">
							<div className="text-xs">
								{item.removalStatus ? (
									<StatusBadge status={item.removalStatus} />
								) : (
									<span className="text-gray-600">Not processed</span>
								)}
							</div>
							<StatusBadge status={item.status} />
						</div>

						{item.scrapedAt && (
							<p className="text-xs text-gray-600">Scraped: {item.scrapedAt.slice(0, 10)}</p>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
