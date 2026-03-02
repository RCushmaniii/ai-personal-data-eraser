import { useEffect, useState } from "react";
import { StatusBadge } from "../components/StatusBadge.tsx";

interface AuditEntry {
	id: string;
	timestamp: string;
	action: string;
	agentType: string;
	details: string;
	success: boolean;
}

export function TasksPage() {
	const [entries, setEntries] = useState<AuditEntry[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch("/api/audit")
			.then((r) => r.json())
			.then((data) => setEntries(data))
			.catch(() => setEntries([]))
			.finally(() => setLoading(false));
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-gray-500">Loading...</div>
			</div>
		);
	}

	return (
		<div>
			<h2 className="text-2xl font-bold mb-6">Audit Log</h2>

			{entries.length === 0 ? (
				<div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
					<p className="text-gray-500">No audit entries yet.</p>
				</div>
			) : (
				<div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-gray-800 text-gray-500 text-left">
								<th className="px-4 py-3">Time</th>
								<th className="px-4 py-3">Agent</th>
								<th className="px-4 py-3">Action</th>
								<th className="px-4 py-3">Details</th>
								<th className="px-4 py-3">Status</th>
							</tr>
						</thead>
						<tbody>
							{entries.map((entry) => (
								<tr key={entry.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
									<td className="px-4 py-3 text-gray-400 font-mono text-xs">
										{entry.timestamp?.slice(0, 19).replace("T", " ")}
									</td>
									<td className="px-4 py-3">
										<StatusBadge status={entry.agentType} />
									</td>
									<td className="px-4 py-3 text-gray-300">{entry.action}</td>
									<td className="px-4 py-3 text-gray-400 max-w-xs truncate">{entry.details}</td>
									<td className="px-4 py-3">
										{entry.success ? (
											<span className="text-green-400">✓</span>
										) : (
											<span className="text-red-400">✗</span>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
