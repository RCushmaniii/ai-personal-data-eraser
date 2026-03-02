import { useEffect, useState } from "react";

interface Summary {
	total: number;
	found: number;
	optOutStarted: number;
	confirmed: number;
	failed: number;
	pending: number;
}

export function DashboardPage() {
	const [summary, setSummary] = useState<Summary | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch("/api/summary")
			.then((r) => r.json())
			.then((data) => setSummary(data))
			.catch(() => setSummary(null))
			.finally(() => setLoading(false));
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-gray-500">Loading...</div>
			</div>
		);
	}

	const stats = summary ?? {
		total: 0,
		found: 0,
		optOutStarted: 0,
		confirmed: 0,
		failed: 0,
		pending: 0,
	};

	const cards = [
		{ label: "Total Brokers", value: stats.total, color: "text-gray-100" },
		{ label: "Data Found", value: stats.found, color: "text-yellow-400" },
		{ label: "Opt-Out Sent", value: stats.optOutStarted, color: "text-cyan-400" },
		{ label: "Removals Confirmed", value: stats.confirmed, color: "text-green-400" },
		{ label: "Failed", value: stats.failed, color: "text-red-400" },
		{ label: "Pending", value: stats.pending, color: "text-gray-400" },
	];

	return (
		<div>
			<h2 className="text-2xl font-bold mb-6">Campaign Overview</h2>

			<div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
				{cards.map((card) => (
					<div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
						<p className="text-sm text-gray-500 mb-1">{card.label}</p>
						<p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
					</div>
				))}
			</div>

			<div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
				<h3 className="font-semibold mb-3">Success Rate</h3>
				<div className="h-4 bg-gray-800 rounded-full overflow-hidden">
					<div
						className="h-full bg-green-500 rounded-full transition-all"
						style={{
							width: `${stats.total > 0 ? (stats.confirmed / stats.total) * 100 : 0}%`,
						}}
					/>
				</div>
				<p className="text-sm text-gray-500 mt-2">
					{stats.total > 0 ? ((stats.confirmed / stats.total) * 100).toFixed(1) : 0}% of brokers
					have confirmed removal
				</p>
			</div>
		</div>
	);
}
