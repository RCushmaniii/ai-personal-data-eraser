import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { getRegistry } from "../brokers/registry.js";
import { getDatabase } from "../state/database.js";
import { runMigrations } from "../state/migrate.js";
import { Store } from "../state/store.js";

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

const staticDir = resolve(import.meta.dir, "app/dist");

const server = Bun.serve({
	port: PORT,
	hostname: HOST,

	async fetch(req) {
		const url = new URL(req.url);
		const path = url.pathname;

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

function handleApi(path: string, req: Request): Response {
	const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

	try {
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
