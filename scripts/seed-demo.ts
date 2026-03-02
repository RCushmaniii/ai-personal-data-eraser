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

console.log("\n  Demo data seeded successfully!");
console.log("  View at: bun run dashboard → http://127.0.0.1:3847");
