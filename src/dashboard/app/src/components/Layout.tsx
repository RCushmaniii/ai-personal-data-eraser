import type { ReactNode } from "react";

type Page = "dashboard" | "brokers" | "research" | "tasks" | "settings";

interface LayoutProps {
	children: ReactNode;
	currentPage: Page;
	onNavigate: (page: Page) => void;
}

const navItems: { page: Page; label: string; icon: string }[] = [
	{ page: "dashboard", label: "Dashboard", icon: "📊" },
	{ page: "brokers", label: "Brokers", icon: "🏢" },
	{ page: "research", label: "Research", icon: "🔍" },
	{ page: "tasks", label: "Tasks", icon: "📋" },
	{ page: "settings", label: "Settings", icon: "⚙️" },
];

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
	return (
		<div className="min-h-screen bg-gray-950 text-gray-100">
			<nav className="fixed left-0 top-0 bottom-0 w-56 bg-gray-900 border-r border-gray-800 p-4">
				<div className="mb-8">
					<h1 className="text-xl font-bold text-violet-400">ai-eraser</h1>
					<p className="text-xs text-gray-500 mt-1">Data Removal Engine</p>
				</div>
				<ul className="space-y-1">
					{navItems.map((item) => (
						<li key={item.page}>
							<button
								onClick={() => onNavigate(item.page)}
								className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
									currentPage === item.page
										? "bg-violet-600/20 text-violet-300"
										: "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
								}`}
							>
								<span className="mr-2">{item.icon}</span>
								{item.label}
							</button>
						</li>
					))}
				</ul>
			</nav>
			<main className="ml-56 p-8">{children}</main>
		</div>
	);
}
