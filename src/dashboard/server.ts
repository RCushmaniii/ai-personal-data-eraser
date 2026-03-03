import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { getRegistry } from "../brokers/registry.js";
import { getDatabase } from "../state/database.js";
import { runMigrations } from "../state/migrate.js";
import { Store } from "../state/store.js";
import type { BrokerStatus } from "../types/index.js";
import { resolveResource } from "../utils/resolve-resource.js";

const PORT = Number(process.env.DASHBOARD_PORT) || 3847;
const HOST = process.env.DASHBOARD_HOST || "127.0.0.1";

// Initialize database
const db = getDatabase();
runMigrations(db);
const store = new Store();

// Try loading broker registry
try {
	getRegistry();
} catch {
	// Registry may fail if playbooks directory doesn't exist yet
}

const staticDir = resolveResource(resolve(import.meta.dir, "app/dist"), "dashboard");

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

const VALID_STATUSES: BrokerStatus[] = [
	"discovered",
	"scanning",
	"found",
	"not_found",
	"opt_out_started",
	"opt_out_submitted",
	"verification_needed",
	"awaiting_confirmation",
	"removal_confirmed",
	"removal_failed",
	"re_appeared",
];

const server = Bun.serve({
	port: PORT,
	hostname: HOST,

	async fetch(req) {
		const url = new URL(req.url);
		const path = url.pathname;

		// CORS preflight
		if (req.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		// API routes
		if (path.startsWith("/api/")) {
			return handleApi(path, req);
		}

		// Static file serving for dashboard SPA
		if (existsSync(staticDir)) {
			const filePath = resolve(staticDir, path === "/" ? "index.html" : path.slice(1));
			const file = Bun.file(filePath);
			if (await file.exists()) {
				return new Response(file);
			}
			// SPA fallback
			return new Response(Bun.file(resolve(staticDir, "index.html")));
		}

		return new Response("Dashboard not built. Run: cd src/dashboard/app && bun run build", {
			status: 404,
		});
	},
});

async function handleApi(path: string, req: Request): Promise<Response> {
	const headers = { "Content-Type": "application/json", ...CORS_HEADERS };

	try {
		// Parameterized route: PATCH /api/brokers/:id/status
		const brokerStatusMatch = path.match(/^\/api\/brokers\/([^/]+)\/status$/);
		if (brokerStatusMatch) {
			if (req.method !== "PATCH") {
				return Response.json({ error: "Method not allowed. Use PATCH." }, { status: 405, headers });
			}

			const recordId = brokerStatusMatch[1];
			const record = store.getBrokerRecord(recordId);
			if (!record) {
				return Response.json({ error: "Broker record not found" }, { status: 404, headers });
			}

			const body = (await req.json()) as { status?: string; notes?: string };

			if (!body.status || !VALID_STATUSES.includes(body.status as BrokerStatus)) {
				return Response.json(
					{
						error: `Invalid status. Valid values: ${VALID_STATUSES.join(", ")}`,
					},
					{ status: 400, headers },
				);
			}

			const previousStatus = record.status;
			store.updateBrokerStatus(recordId, body.status as BrokerStatus, body.notes);
			store.addAuditEntry(
				"api_status_update",
				"dashboard",
				JSON.stringify({
					brokerId: record.brokerId,
					before: previousStatus,
					after: body.status,
					notes: body.notes,
				}),
				true,
				record.brokerId,
				record.profileId,
			);

			return Response.json(
				{
					success: true,
					id: recordId,
					previousStatus,
					newStatus: body.status,
				},
				{ headers },
			);
		}

		switch (path) {
			case "/api/summary": {
				const summary = store.getCampaignSummary();
				return Response.json(summary, { headers });
			}

			case "/api/brokers": {
				const records = store.listBrokerRecords();
				let registry: ReturnType<typeof getRegistry> | null = null;
				try {
					registry = getRegistry();
				} catch {
					// Registry may fail if playbooks are missing or invalid
				}
				const enriched = records.map((r) => {
					const broker = registry?.getBroker(r.brokerId);
					return {
						...r,
						name: broker?.name ?? r.brokerId,
						domain: broker?.domain ?? "",
						difficulty: broker?.difficulty ?? "unknown",
					};
				});
				return Response.json(enriched, { headers });
			}

			case "/api/audit": {
				const entries = store.getAuditLog(100);
				return Response.json(entries, { headers });
			}

			case "/api/profiles": {
				const profiles = store.listProfiles();
				return Response.json(profiles, { headers });
			}

			case "/api/broker-intel": {
				const intel = store.listBrokerIntel();
				// Enrich with personal removal status from broker_records
				const records = store.listBrokerRecords();
				const enriched = intel.map((item) => {
					const record = records.find((r) => r.brokerId === item.domain || r.brokerId === item.id);
					return {
						...item,
						removalStatus: record?.status ?? null,
					};
				});
				return Response.json(enriched, { headers });
			}

			case "/api/broker-intel/summary": {
				const summary = store.getBrokerIntelSummary();
				return Response.json(summary, { headers });
			}

			case "/api/health": {
				return Response.json({ status: "ok", timestamp: new Date().toISOString() }, { headers });
			}

			default:
				return Response.json({ error: "Not found" }, { status: 404, headers });
		}
	} catch (error) {
		return Response.json(
			{ error: error instanceof Error ? error.message : "Internal error" },
			{ status: 500, headers },
		);
	}
}

console.log(`  Dashboard server running at http://${HOST}:${PORT}`);

export { server };
