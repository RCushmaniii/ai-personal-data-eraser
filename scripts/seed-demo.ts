/**
 * Seed script — populates the database with demo data for dashboard testing.
 * Run: bun run seed
 */
import { getDatabase } from "../src/state/database.js";
import { runMigrations } from "../src/state/migrate.js";
import { Store } from "../src/state/store.js";

const db = getDatabase();
runMigrations(db);
const store = new Store(db);

// --- Demo Profile ---
const profileId = store.createProfile("demo-vault-ref-encrypted");
console.log(`  Created demo profile: ${profileId}`);

// --- 6 Broker Records (varied statuses) ---
const brokers = [
	{ id: "spokeo", status: "removal_confirmed" as const, confidence: 0.92, attempts: 2 },
	{ id: "whitepages", status: "opt_out_submitted" as const, confidence: 0.87, attempts: 1 },
	{ id: "beenverified", status: "found" as const, confidence: 0.78, attempts: 0 },
	{ id: "radaris", status: "removal_failed" as const, confidence: 0.65, attempts: 3 },
	{ id: "peoplefinder", status: "awaiting_confirmation" as const, confidence: 0.95, attempts: 1 },
	{ id: "mylife", status: "opt_out_started" as const, confidence: 0.71, attempts: 1 },
];

for (const b of brokers) {
	const recordId = store.createBrokerRecord(b.id, profileId, {
		profileUrl: `https://${b.id}.com/profile/demo-user`,
		matchConfidence: b.confidence,
	});

	// Advance status from "discovered" to target
	if (b.status !== "discovered") {
		store.updateBrokerStatus(recordId, b.status);
	}

	// Set attempts
	for (let i = 0; i < b.attempts; i++) {
		store.incrementBrokerAttempts(recordId);
	}

	console.log(`  Created broker record: ${b.id} (${b.status})`);
}

// --- Audit Log Entries ---
const auditEntries: {
	action: string;
	agent: string;
	details: string;
	success: boolean;
	brokerId?: string;
}[] = [
	{
		action: "campaign_start",
		agent: "orchestrator",
		details: "Campaign started with phases: recon, removal, legal, monitor",
		success: true,
	},
	{
		action: "scan_start",
		agent: "recon",
		details: "Scanning 6 brokers for John Demo",
		success: true,
	},
	{
		action: "match_found",
		agent: "recon",
		details: "Found profile on Spokeo",
		success: true,
		brokerId: "spokeo",
	},
	{
		action: "match_found",
		agent: "recon",
		details: "Found profile on Whitepages",
		success: true,
		brokerId: "whitepages",
	},
	{
		action: "match_found",
		agent: "recon",
		details: "Found profile on BeenVerified",
		success: true,
		brokerId: "beenverified",
	},
	{
		action: "match_found",
		agent: "recon",
		details: "Found profile on Radaris",
		success: true,
		brokerId: "radaris",
	},
	{
		action: "match_found",
		agent: "recon",
		details: "Found profile on PeopleFinder",
		success: true,
		brokerId: "peoplefinder",
	},
	{
		action: "match_found",
		agent: "recon",
		details: "Found profile on MyLife",
		success: true,
		brokerId: "mylife",
	},
	{
		action: "recon_complete",
		agent: "orchestrator",
		details: "Scan complete. Found data on 6/6 brokers.",
		success: true,
	},
	{
		action: "optout_submitted",
		agent: "removal",
		details: "Opt-out submitted for Spokeo",
		success: true,
		brokerId: "spokeo",
	},
	{
		action: "optout_submitted",
		agent: "removal",
		details: "Opt-out submitted for Whitepages",
		success: true,
		brokerId: "whitepages",
	},
	{
		action: "optout_failed",
		agent: "removal",
		details: "Opt-out failed for Radaris — CAPTCHA not solved",
		success: false,
		brokerId: "radaris",
	},
	{
		action: "confirmed",
		agent: "monitor",
		details: "Removal confirmed for Spokeo",
		success: true,
		brokerId: "spokeo",
	},
	{
		action: "legal_sent",
		agent: "legal",
		details: "Sent CCPA deletion request to Radaris",
		success: true,
		brokerId: "radaris",
	},
];

for (const entry of auditEntries) {
	store.addAuditEntry(
		entry.action,
		entry.agent,
		entry.details,
		entry.success,
		entry.brokerId,
		profileId,
	);
}
console.log(`  Created ${auditEntries.length} audit log entries`);

// --- Broker Intel (Research Data) ---
const brokerIntel: {
	domain: string;
	name: string;
	category: string;
	optOutUrl: string;
	optOutMethod: string;
	privacyContactEmail: string | null;
	requiresAccount: boolean;
	requiresIdUpload: boolean;
	hasCaptcha: boolean;
	requiresPostalMail: boolean;
	verificationSteps: number;
	estimatedDays: number;
	difficulty: string;
	difficultyScore: number;
	legalFrameworks: string[];
	dataCategories: string[];
	hasPlaybook: boolean;
	status: string;
}[] = [
	{
		domain: "spokeo.com",
		name: "Spokeo",
		category: "people_search",
		optOutUrl: "https://www.spokeo.com/optout",
		optOutMethod: "web_form",
		privacyContactEmail: "privacy@spokeo.com",
		requiresAccount: false,
		requiresIdUpload: false,
		hasCaptcha: true,
		requiresPostalMail: false,
		verificationSteps: 1,
		estimatedDays: 3,
		difficulty: "medium",
		difficultyScore: 3,
		legalFrameworks: ["ccpa", "gdpr"],
		dataCategories: ["phone", "email", "address", "relatives", "social_media"],
		hasPlaybook: true,
		status: "verified",
	},
	{
		domain: "whitepages.com",
		name: "Whitepages",
		category: "people_search",
		optOutUrl: "https://www.whitepages.com/suppression-requests",
		optOutMethod: "web_form",
		privacyContactEmail: "support@whitepages.com",
		requiresAccount: false,
		requiresIdUpload: false,
		hasCaptcha: true,
		requiresPostalMail: false,
		verificationSteps: 1,
		estimatedDays: 7,
		difficulty: "medium",
		difficultyScore: 3,
		legalFrameworks: ["ccpa"],
		dataCategories: ["phone", "email", "address", "relatives"],
		hasPlaybook: true,
		status: "verified",
	},
	{
		domain: "beenverified.com",
		name: "BeenVerified",
		category: "people_search",
		optOutUrl: "https://www.beenverified.com/app/optout/search",
		optOutMethod: "web_form",
		privacyContactEmail: "privacy@beenverified.com",
		requiresAccount: false,
		requiresIdUpload: false,
		hasCaptcha: true,
		requiresPostalMail: false,
		verificationSteps: 2,
		estimatedDays: 14,
		difficulty: "medium",
		difficultyScore: 4,
		legalFrameworks: ["ccpa"],
		dataCategories: ["phone", "email", "address", "criminal_records", "property"],
		hasPlaybook: true,
		status: "verified",
	},
	{
		domain: "radaris.com",
		name: "Radaris",
		category: "people_search",
		optOutUrl: "https://radaris.com/control/privacy",
		optOutMethod: "account_deletion",
		privacyContactEmail: "support@radaris.com",
		requiresAccount: true,
		requiresIdUpload: false,
		hasCaptcha: true,
		requiresPostalMail: false,
		verificationSteps: 2,
		estimatedDays: 30,
		difficulty: "hard",
		difficultyScore: 6,
		legalFrameworks: ["ccpa"],
		dataCategories: ["phone", "email", "address", "employment", "relatives", "court_records"],
		hasPlaybook: true,
		status: "verified",
	},
	{
		domain: "peoplefinder.com",
		name: "PeopleFinder",
		category: "people_search",
		optOutUrl: "https://www.peoplefinder.com/optout",
		optOutMethod: "web_form",
		privacyContactEmail: null,
		requiresAccount: false,
		requiresIdUpload: false,
		hasCaptcha: false,
		requiresPostalMail: false,
		verificationSteps: 1,
		estimatedDays: 5,
		difficulty: "easy",
		difficultyScore: 1,
		legalFrameworks: ["ccpa"],
		dataCategories: ["phone", "address", "relatives"],
		hasPlaybook: true,
		status: "verified",
	},
	{
		domain: "mylife.com",
		name: "MyLife",
		category: "people_search",
		optOutUrl: "https://www.mylife.com/privacy-policy#optout",
		optOutMethod: "email",
		privacyContactEmail: "privacy@mylife.com",
		requiresAccount: true,
		requiresIdUpload: true,
		hasCaptcha: false,
		requiresPostalMail: false,
		verificationSteps: 3,
		estimatedDays: 45,
		difficulty: "very_hard",
		difficultyScore: 8,
		legalFrameworks: ["ccpa"],
		dataCategories: ["phone", "email", "address", "employment", "education", "social_media"],
		hasPlaybook: true,
		status: "verified",
	},
	{
		domain: "intelius.com",
		name: "Intelius",
		category: "background_check",
		optOutUrl: "https://www.intelius.com/opt-out",
		optOutMethod: "web_form",
		privacyContactEmail: "privacy@intelius.com",
		requiresAccount: false,
		requiresIdUpload: true,
		hasCaptcha: true,
		requiresPostalMail: false,
		verificationSteps: 2,
		estimatedDays: 14,
		difficulty: "hard",
		difficultyScore: 7,
		legalFrameworks: ["ccpa", "gdpr"],
		dataCategories: ["phone", "email", "address", "criminal_records", "court_records", "property"],
		hasPlaybook: false,
		status: "researched",
	},
	{
		domain: "acxiom.com",
		name: "Acxiom",
		category: "marketing",
		optOutUrl: "https://isapps.acxiom.com/optout/optout.aspx",
		optOutMethod: "web_form",
		privacyContactEmail: "consumeradvo@acxiom.com",
		requiresAccount: false,
		requiresIdUpload: false,
		hasCaptcha: false,
		requiresPostalMail: false,
		verificationSteps: 1,
		estimatedDays: 10,
		difficulty: "easy",
		difficultyScore: 1,
		legalFrameworks: ["ccpa", "gdpr"],
		dataCategories: ["email", "address", "browsing_history", "location"],
		hasPlaybook: false,
		status: "researched",
	},
];

for (const bi of brokerIntel) {
	store.upsertBrokerIntel({
		domain: bi.domain,
		name: bi.name,
		category: bi.category as Parameters<typeof store.upsertBrokerIntel>[0]["category"],
		optOutUrl: bi.optOutUrl,
		optOutMethod: bi.optOutMethod as Parameters<typeof store.upsertBrokerIntel>[0]["optOutMethod"],
		privacyContactEmail: bi.privacyContactEmail,
		requiresAccount: bi.requiresAccount,
		requiresIdUpload: bi.requiresIdUpload,
		hasCaptcha: bi.hasCaptcha,
		requiresPostalMail: bi.requiresPostalMail,
		verificationSteps: bi.verificationSteps,
		estimatedDays: bi.estimatedDays,
		difficulty: bi.difficulty as Parameters<typeof store.upsertBrokerIntel>[0]["difficulty"],
		difficultyScore: bi.difficultyScore,
		legalFrameworks: bi.legalFrameworks as Parameters<
			typeof store.upsertBrokerIntel
		>[0]["legalFrameworks"],
		dataCategories: bi.dataCategories,
		hasPlaybook: bi.hasPlaybook,
		status: bi.status as Parameters<typeof store.upsertBrokerIntel>[0]["status"],
		sourceUrls: [`https://${bi.domain}`],
		scrapedAt: new Date().toISOString(),
	});
	console.log(`  Created broker intel: ${bi.name} (${bi.difficulty})`);
}
console.log(`  Created ${brokerIntel.length} broker intel entries`);

console.log("\n  Demo data seeded successfully!");
console.log("  View at: bun run dashboard → http://127.0.0.1:3847");
