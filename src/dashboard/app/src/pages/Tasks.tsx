import { useEffect, useState } from "react";
import { CheckIcon, XIcon } from "../components/Icons.tsx";
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
				<div className="text-text-muted">Loading...</div>
			</div>
		);
	}

	return (
		<div>
			<h2 className="text-2xl font-bold mb-6">Audit Log</h2>

			{entries.length === 0 ? (
				<div className="bg-surface-raised border border-border rounded-xl p-8 text-center">
					<p className="text-text-muted">No audit entries yet.</p>
				</div>
			) : (
				<div className="bg-surface-raised border border-border rounded-xl overflow-hidden">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border text-text-muted text-left">
								<th className="px-4 py-3">Time</th>
								<th className="px-4 py-3">Agent</th>
								<th className="px-4 py-3">Action</th>
								<th className="px-4 py-3">Details</th>
								<th className="px-4 py-3">Status</th>
							</tr>
						</thead>
						<tbody>
							{entries.map((entry) => (
								<tr
									key={entry.id}
									className="border-b border-border/50 hover:bg-surface-overlay/30 transition-colors"
								>
									<td className="px-4 py-3 text-text-secondary font-mono text-xs">
										{entry.timestamp?.slice(0, 19).replace("T", " ")}
									</td>
									<td className="px-4 py-3">
										<StatusBadge status={entry.agentType} />
									</td>
									<td className="px-4 py-3 text-text-secondary">{entry.action}</td>
									<td className="px-4 py-3 text-text-secondary max-w-xs truncate">
										{entry.details}
									</td>
									<td className="px-4 py-3">
										{entry.success ? (
											<CheckIcon className="w-4 h-4 text-green-400" />
										) : (
											<XIcon className="w-4 h-4 text-red-400" />
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
