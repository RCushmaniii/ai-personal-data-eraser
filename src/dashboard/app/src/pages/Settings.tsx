export function SettingsPage() {
	return (
		<div>
			<h2 className="text-2xl font-bold mb-6">Settings</h2>

			<div className="space-y-6">
				<div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
					<h3 className="font-semibold mb-3">API Configuration</h3>
					<p className="text-sm text-gray-500 mb-4">
						API keys and service configuration are managed via the{" "}
						<code className="text-violet-400">.env</code> file.
					</p>
					<p className="text-sm text-gray-400">
						Run <code className="text-violet-400">bun run dev config</code> to view
						current settings, or{" "}
						<code className="text-violet-400">bun run dev setup</code> to reconfigure.
					</p>
				</div>

				<div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
					<h3 className="font-semibold mb-3">Vault</h3>
					<p className="text-sm text-gray-500">
						Your personal data is encrypted at rest using XSalsa20-Poly1305 with
						Argon2id key derivation. The vault password is never stored.
					</p>
				</div>

				<div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
					<h3 className="font-semibold mb-3">Scheduler</h3>
					<p className="text-sm text-gray-500 mb-2">
						Automated scheduling is currently configured via environment variables.
					</p>
					<div className="text-xs text-gray-600 space-y-1 font-mono">
						<p>Scan:    Weekly (Mondays at 6 AM)</p>
						<p>Recheck: Weekly (Wednesdays at 8 AM)</p>
						<p>Inbox:   Every 5 minutes</p>
					</div>
				</div>

				<div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
					<h3 className="font-semibold mb-3">About</h3>
					<p className="text-sm text-gray-500">
						AI Eraser v0.1.0 — Built by CushLabs AI Services
					</p>
				</div>
			</div>
		</div>
	);
}
