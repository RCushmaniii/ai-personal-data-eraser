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
		<div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
			<div className="flex items-start justify-between mb-3">
				<div>
					<h3 className="font-semibold text-gray-100">{name}</h3>
					<p className="text-xs text-gray-500">{domain}</p>
				</div>
				<StatusBadge status={status} />
			</div>
			<div className="grid grid-cols-3 gap-2 text-xs">
				<div>
					<span className="text-gray-500">Confidence</span>
					<p className="text-gray-300 font-mono">{(matchConfidence * 100).toFixed(0)}%</p>
				</div>
				<div>
					<span className="text-gray-500">Attempts</span>
					<p className="text-gray-300 font-mono">{attempts}</p>
				</div>
				<div>
					<span className="text-gray-500">Difficulty</span>
					<p className="text-gray-300 capitalize">{difficulty}</p>
				</div>
			</div>
			<p className="text-xs text-gray-600 mt-3">Updated {lastUpdated}</p>
		</div>
	);
}
