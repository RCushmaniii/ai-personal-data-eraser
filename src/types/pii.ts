/** PII (Personally Identifiable Information) types */

export type PiiFieldType =
	| "first_name"
	| "last_name"
	| "full_name"
	| "email"
	| "phone"
	| "address_line1"
	| "address_line2"
	| "city"
	| "state"
	| "zip"
	| "country"
	| "date_of_birth"
	| "ssn_last4"
	| "ip_address"
	| "username";

export interface PiiField {
	type: PiiFieldType;
	value: string;
	/** ISO 8601 timestamp of when this field was added */
	addedAt: string;
}

export interface PiiProfile {
	id: string;
	fields: PiiField[];
	/** Encrypted blob reference in vault */
	vaultRef: string;
	createdAt: string;
	updatedAt: string;
}

export interface PiiSearchQuery {
	firstName: string;
	lastName: string;
	state?: string;
	city?: string;
	age?: number;
}

export interface PiiMatch {
	brokerId: string;
	profileUrl: string;
	matchConfidence: number;
	fieldsFound: PiiFieldType[];
	discoveredAt: string;
	screenshotPath?: string;
}
