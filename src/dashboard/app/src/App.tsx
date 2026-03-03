import { useState } from "react";
import { Layout, type Page } from "./components/Layout.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { BrokersPage } from "./pages/Brokers.tsx";
import { DashboardPage } from "./pages/Dashboard.tsx";
import { GuidePage } from "./pages/Guide.tsx";
import { ResearchPage } from "./pages/Research.tsx";
import { SettingsPage } from "./pages/Settings.tsx";
import { TasksPage } from "./pages/Tasks.tsx";

export function App() {
	const [currentPage, setCurrentPage] = useState<Page>("research");

	const renderPage = () => {
		switch (currentPage) {
			case "research":
				return <ResearchPage />;
			case "brokers":
				return <BrokersPage />;
			case "dashboard":
				return <DashboardPage />;
			case "tasks":
				return <TasksPage />;
			case "guide":
				return <GuidePage />;
			case "settings":
				return <SettingsPage />;
		}
	};

	return (
		<ThemeProvider>
			<Layout currentPage={currentPage} onNavigate={setCurrentPage}>
				{renderPage()}
			</Layout>
		</ThemeProvider>
	);
}
