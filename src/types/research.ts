/** Research agent types — broker intelligence gathering */

import type { BrokerCategory, BrokerDifficulty, LegalFramework, OptOutMethod } from "./broker.js";

export type BrokerIntelStatus = "researched" | "verified" | "playbook_drafted";

export interface BrokerIntel {
	id: string;
	domain: string;
	name: string;
	category: BrokerCategory | null;
	optOutUrl: string | null;
	optOutMethod: OptOutMethod | null;
	privacyContactEmail: string | null;
	requiresAccount: boolean;
	requiresIdUpload: boolean;
	hasCaptcha: boolean;
	requiresPostalMail: boolean;
	verificationSteps: number;
	estimatedDays: number | null;
	difficulty: BrokerDifficulty | null;
	difficultyScore: number;
	legalFrameworks: LegalFramework[];
	dataCategories: string[];
	notes: string | null;
	sourceUrls: string[];
	scrapedAt: string | null;
	hasPlaybook: boolean;
	status: BrokerIntelStatus;
	createdAt: string;
	updatedAt: string;
}

export interface ResearchQuery {
	/** Specific domain to research (e.g. "spokeo.com") */
	domain?: string;
	/** Category to discover brokers in */
	category?: BrokerCategory;
	/** How many results to collect per search (default 10) */
	searchDepth?: number;
}

export interface DifficultySignals {
	requiresAccount: boolean;
	hasCaptcha: boolean;
	requiresIdUpload: boolean;
	requiresPostalMail: boolean;
	optOutMethod: OptOutMethod | null;
	verificationSteps: number;
	estimatedDays: number | null;
}

export interface BrokerIntelSummary {
	total: number;
	byDifficulty: Record<string, number>;
	byCategory: Record<string, number>;
	withPlaybook: number;
}

export interface BrokerIntelFilter {
	category?: BrokerCategory;
	difficulty?: BrokerDifficulty;
	hasPlaybook?: boolean;
}
