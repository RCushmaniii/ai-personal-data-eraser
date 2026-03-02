import { useState } from "react";
import { Layout } from "./components/Layout.tsx";
import { BrokersPage } from "./pages/Brokers.tsx";
import { DashboardPage } from "./pages/Dashboard.tsx";
import { SettingsPage } from "./pages/Settings.tsx";
import { TasksPage } from "./pages/Tasks.tsx";

type Page = "dashboard" | "brokers" | "tasks" | "settings";

export function App() {
	const [currentPage, setCurrentPage] = useState<Page>("dashboard");

	const renderPage = () => {
		switch (currentPage) {
			case "dashboard":
				return <DashboardPage />;
			case "brokers":
				return <BrokersPage />;
			case "tasks":
				return <TasksPage />;
			case "settings":
				return <SettingsPage />;
		}
	};

	return (
		<Layout currentPage={currentPage} onNavigate={setCurrentPage}>
			{renderPage()}
		</Layout>
	);
}
