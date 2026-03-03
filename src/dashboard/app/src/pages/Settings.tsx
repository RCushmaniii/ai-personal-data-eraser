export function SettingsPage() {
	return (
		<div>
			<h2 className="text-2xl font-bold mb-6">Settings</h2>

			<div className="space-y-6">
				<div className="bg-surface-raised border border-border rounded-xl p-5">
					<h3 className="font-semibold mb-3">API Configuration</h3>
					<p className="text-sm text-text-muted mb-4">
						API keys and service configuration are managed via the{" "}
						<code className="text-accent">.env</code> file.
					</p>
					<p className="text-sm text-text-secondary">
						Run <code className="text-accent">bun run dev config</code> to view current settings, or{" "}
						<code className="text-accent">bun run dev setup</code> to reconfigure.
					</p>
				</div>

				<div className="bg-surface-raised border border-border rounded-xl p-5">
					<h3 className="font-semibold mb-3">Vault</h3>
					<p className="text-sm text-text-muted">
						Your personal data is encrypted at rest using XSalsa20-Poly1305 with Argon2id key
						derivation. The vault password is never stored.
					</p>
				</div>

				<div className="bg-surface-raised border border-border rounded-xl p-5">
					<h3 className="font-semibold mb-3">Scheduler</h3>
					<p className="text-sm text-text-muted mb-2">
						Automated scheduling is currently configured via environment variables.
					</p>
					<div className="text-xs text-text-muted space-y-1 font-mono">
						<p>Scan: Weekly (Mondays at 6 AM)</p>
						<p>Recheck: Weekly (Wednesdays at 8 AM)</p>
						<p>Inbox: Every 5 minutes</p>
					</div>
				</div>

				<div className="bg-surface-raised border border-border rounded-xl p-5">
					<h3 className="font-semibold mb-3">About</h3>
					<p className="text-sm text-text-muted">
						AI Eraser v0.1.0 — Built by CushLabs AI Services
					</p>
				</div>
			</div>
		</div>
	);
}
