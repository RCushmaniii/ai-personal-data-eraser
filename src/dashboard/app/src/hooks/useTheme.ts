import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

function getSystemTheme(): "light" | "dark" {
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
	const resolved = theme === "system" ? getSystemTheme() : theme;
	document.documentElement.setAttribute("data-theme", resolved);
}

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(() => {
		const stored = localStorage.getItem("ai-eraser-theme");
		return (stored as Theme) ?? "dark";
	});

	const setTheme = useCallback((next: Theme) => {
		setThemeState(next);
		localStorage.setItem("ai-eraser-theme", next);
		applyTheme(next);
	}, []);

	// Apply on mount and when theme changes
	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	// Listen for system preference changes when in "system" mode
	useEffect(() => {
		if (theme !== "system") return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = () => applyTheme("system");
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [theme]);

	return { theme, setTheme } as const;
}
