interface StatusBadgeProps {
	status: string;
}

const STATUS_STYLES: Record<string, string> = {
	discovered: "bg-gray-700 text-gray-300",
	scanning: "bg-blue-900/50 text-blue-300",
	found: "bg-yellow-900/50 text-yellow-300",
	not_found: "bg-gray-800 text-gray-500",
	opt_out_started: "bg-cyan-900/50 text-cyan-300",
	opt_out_submitted: "bg-cyan-900/50 text-cyan-300",
	verification_needed: "bg-purple-900/50 text-purple-300",
	awaiting_confirmation: "bg-yellow-900/50 text-yellow-300",
	removal_confirmed: "bg-green-900/50 text-green-300",
	removal_failed: "bg-red-900/50 text-red-300",
	re_appeared: "bg-red-900/50 text-red-400 font-bold",
	idle: "bg-gray-700 text-gray-300",
	running: "bg-blue-900/50 text-blue-300",
	completed: "bg-green-900/50 text-green-300",
	error: "bg-red-900/50 text-red-300",
	// Research statuses
	researched: "bg-blue-900/50 text-blue-300",
	verified: "bg-emerald-900/50 text-emerald-300",
	playbook_drafted: "bg-violet-900/50 text-violet-300",
};

export function StatusBadge({ status }: StatusBadgeProps) {
	const style = STATUS_STYLES[status] ?? "bg-gray-700 text-gray-300";
	const label = status.replace(/_/g, " ");

	return <span className={`inline-block px-2 py-0.5 rounded text-xs ${style}`}>{label}</span>;
}
