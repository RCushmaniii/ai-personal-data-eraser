import { useEffect, useState } from "react";
import { BrokerCard } from "../components/BrokerCard.tsx";

interface BrokerRecord {
	id: string;
	brokerId: string;
	name: string;
	domain: string;
	status: string;
	matchConfidence: number;
	attempts: number;
	updatedAt: string;
	difficulty: string;
}

export function BrokersPage() {
	const [brokers, setBrokers] = useState<BrokerRecord[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch("/api/brokers")
			.then((r) => r.json())
			.then((data) => setBrokers(data))
			.catch(() => setBrokers([]))
			.finally(() => setLoading(false));
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-text-muted">Loading...</div>
			</div>
		);
	}

	if (brokers.length === 0) {
		return (
			<div>
				<h2 className="text-2xl font-bold mb-6">Data Brokers</h2>
				<div className="bg-surface-raised border border-border rounded-xl p-8 text-center">
					<p className="text-text-muted">No broker records yet.</p>
					<p className="text-text-muted text-sm mt-1">
						Run <code className="text-accent">bun run dev scan</code> to discover your data.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div>
			<h2 className="text-2xl font-bold mb-6">Data Brokers ({brokers.length})</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{brokers.map((broker) => (
					<BrokerCard
						key={broker.id}
						name={broker.name}
						domain={broker.domain}
						status={broker.status}
						matchConfidence={broker.matchConfidence}
						attempts={broker.attempts}
						lastUpdated={broker.updatedAt?.slice(0, 10) ?? "\u2014"}
						difficulty={broker.difficulty}
					/>
				))}
			</div>
		</div>
	);
}
