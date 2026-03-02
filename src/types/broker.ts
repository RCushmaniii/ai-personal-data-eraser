/** Data broker types */

export type BrokerCategory =
	| "people_search"
	| "background_check"
	| "marketing"
	| "data_aggregator"
	| "social_media"
	| "public_records";

export type OptOutMethod =
	| "web_form"
	| "email"
	| "postal_mail"
	| "phone"
	| "api"
	| "account_deletion";

export type BrokerDifficulty = "easy" | "medium" | "hard" | "very_hard";

export interface BrokerDefinition {
	id: string;
	name: string;
	domain: string;
	category: BrokerCategory;
	optOutMethods: OptOutMethod[];
	difficulty: BrokerDifficulty;
	searchUrl: string;
	optOutUrl: string;
	/** Estimated days for removal to take effect */
	estimatedDays: number;
	/** Whether identity verification is required */
	requiresVerification: boolean;
	/** Supported legal frameworks */
	legalFrameworks: LegalFramework[];
	/** Path to the YAML playbook */
	playbookPath: string;
	notes?: string;
}

export type LegalFramework = "ccpa" | "gdpr" | "generic";

export type BrokerStatus =
	| "discovered"
	| "scanning"
	| "found"
	| "not_found"
	| "opt_out_started"
	| "opt_out_submitted"
	| "verification_needed"
	| "awaiting_confirmation"
	| "removal_confirmed"
	| "removal_failed"
	| "re_appeared";

export interface BrokerRecord {
	id: string;
	brokerId: string;
	profileId: string;
	status: BrokerStatus;
	profileUrl?: string;
	matchConfidence: number;
	optOutSubmittedAt?: string;
	removalConfirmedAt?: string;
	lastCheckedAt: string;
	nextCheckAt?: string;
	attempts: number;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}
