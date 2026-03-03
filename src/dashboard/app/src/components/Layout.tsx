import type { ReactNode } from "react";
import { useThemeContext } from "../context/ThemeContext.tsx";
import type { Theme } from "../hooks/useTheme.ts";
import {
	BookOpenIcon,
	BuildingIcon,
	ChartBarIcon,
	ClipboardListIcon,
	CogIcon,
	MonitorIcon,
	MoonIcon,
	SearchIcon,
	SunIcon,
} from "./Icons.tsx";

export type Page = "research" | "brokers" | "dashboard" | "tasks" | "guide" | "settings";

interface LayoutProps {
	children: ReactNode;
	currentPage: Page;
	onNavigate: (page: Page) => void;
}

const navItems: { page: Page; label: string; Icon: React.ComponentType<{ className?: string }> }[] =
	[
		{ page: "research", label: "Research", Icon: SearchIcon },
		{ page: "brokers", label: "Brokers", Icon: BuildingIcon },
		{ page: "dashboard", label: "Dashboard", Icon: ChartBarIcon },
		{ page: "tasks", label: "Tasks", Icon: ClipboardListIcon },
		{ page: "guide", label: "Guide", Icon: BookOpenIcon },
		{ page: "settings", label: "Settings", Icon: CogIcon },
	];

const themeButtons: { value: Theme; Icon: React.ComponentType<{ className?: string }> }[] = [
	{ value: "light", Icon: SunIcon },
	{ value: "dark", Icon: MoonIcon },
	{ value: "system", Icon: MonitorIcon },
];

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
	const { theme, setTheme } = useThemeContext();

	return (
		<div className="min-h-screen bg-surface text-text-primary">
			<nav className="fixed left-0 top-0 bottom-0 w-56 bg-surface-raised border-r border-border p-4 flex flex-col">
				<div className="mb-8">
					<h1 className="text-xl font-bold text-accent">ai-eraser</h1>
					<p className="text-xs text-text-muted mt-1">Data Removal Engine</p>
				</div>

				<ul className="space-y-1 flex-1">
					{navItems.map((item) => {
						const isActive = currentPage === item.page;
						return (
							<li key={item.page}>
								<button
									type="button"
									onClick={() => onNavigate(item.page)}
									className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 transition-colors ${
										isActive
											? "bg-accent-subtle text-accent border-l-2 border-accent"
											: "text-text-secondary hover:text-text-primary hover:bg-surface-overlay"
									}`}
								>
									<item.Icon className="w-4 h-4 shrink-0" />
									{item.label}
								</button>
							</li>
						);
					})}
				</ul>

				{/* Theme toggle */}
				<div className="border-t border-border pt-3 mt-3">
					<div className="flex items-center justify-center gap-1 bg-surface-overlay rounded-lg p-1">
						{themeButtons.map((btn) => (
							<button
								key={btn.value}
								type="button"
								onClick={() => setTheme(btn.value)}
								className={`p-1.5 rounded transition-colors ${
									theme === btn.value
										? "bg-accent-subtle text-accent"
										: "text-text-muted hover:text-text-secondary"
								}`}
								title={btn.value.charAt(0).toUpperCase() + btn.value.slice(1)}
							>
								<btn.Icon className="w-3.5 h-3.5" />
							</button>
						))}
					</div>
				</div>
			</nav>
			<main className="ml-56 p-8">{children}</main>
		</div>
	);
}
