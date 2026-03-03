import { StatusBadge } from "./StatusBadge.tsx";

interface BrokerCardProps {
	name: string;
	domain: string;
	status: string;
	matchConfidence: number;
	attempts: number;
	lastUpdated: string;
	difficulty: string;
}

export function BrokerCard({
	name,
	domain,
	status,
	matchConfidence,
	attempts,
	lastUpdated,
	difficulty,
}: BrokerCardProps) {
	return (
		<div className="bg-surface-raised border border-border rounded-xl p-4 hover:border-text-muted transition-colors">
			<div className="flex items-start justify-between mb-3">
				<div>
					<h3 className="font-semibold text-text-primary">{name}</h3>
					<p className="text-xs text-text-muted">{domain}</p>
				</div>
				<StatusBadge status={status} />
			</div>
			<div className="grid grid-cols-3 gap-2 text-xs">
				<div>
					<span className="text-text-muted">Confidence</span>
					<p className="text-text-secondary font-mono">{(matchConfidence * 100).toFixed(0)}%</p>
				</div>
				<div>
					<span className="text-text-muted">Attempts</span>
					<p className="text-text-secondary font-mono">{attempts}</p>
				</div>
				<div>
					<span className="text-text-muted">Difficulty</span>
					<p className="text-text-secondary capitalize">{difficulty}</p>
				</div>
			</div>
			<p className="text-xs text-text-muted mt-3">Updated {lastUpdated}</p>
		</div>
	);
}
