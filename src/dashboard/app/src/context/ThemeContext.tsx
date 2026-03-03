import { type ReactNode, createContext, useContext } from "react";
import { type Theme, useTheme } from "../hooks/useTheme.ts";

interface ThemeContextValue {
	theme: Theme;
	setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
	const value = useTheme();
	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error("useThemeContext must be used within ThemeProvider");
	return ctx;
}
