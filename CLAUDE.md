# CLAUDE.md — ai-eraser

## Project Overview
AI-powered personal data removal engine. Uses an agent-based architecture with an encrypted PII vault, YAML broker playbooks, and Claude AI integration for form analysis, response classification, and legal request generation. Currently in early development — scaffold is complete with real implementations, not stubs.

## Tech Stack
- **Runtime:** Bun 1.3+
- **Language:** TypeScript 5.9 (strict mode)
- **AI:** Anthropic Claude API (`@anthropic-ai/sdk`)
- **Database:** Bun-native SQLite with WAL mode
- **Encryption:** libsodium-wrappers-sumo (XSalsa20-Poly1305 + Argon2id)
- **State Machine:** XState v5
- **CLI:** Commander + Clack
- **Email:** Nodemailer + MJML templates
- **Dashboard:** React + Vite + Tailwind CSS v4 (nested project)
- **Validation:** Zod
- **Linting/Formatting:** Biome (tabs, double quotes, semicolons)
- **Scheduler:** croner

## Project Structure
- `src/agents/` — Orchestrator + specialized agents (recon, removal, legal, monitor)
- `src/ai/` — Claude API integration (form analysis, response parsing, prompts)
- `src/brokers/` — Broker registry + YAML playbook runner
- `src/brokers/playbooks/` — YAML broker definitions (6 brokers)
- `src/cli/` — CLI entry point with Commander + Clack
- `src/cli/commands/` — Subcommands: setup, scan, remove, status, dashboard, config
- `src/config/` — Zod schema validation + env loading + defaults
- `src/dashboard/server.ts` — Bun.serve() API backend on port 3847
- `src/dashboard/app/` — Nested Vite+React project (separate package.json/tsconfig)
- `src/email/` — Nodemailer sender, inbox monitor, MJML templates
- `src/email/templates/` — CCPA, GDPR, generic opt-out, follow-up MJML files
- `src/scheduler/` — Cron scheduling with croner
- `src/security/` — libsodium-wrappers-sumo vault + Argon2id key derivation
- `src/state/` — SQLite database, migrations, CRUD store, XState v5 state machine
- `src/types/` — All TypeScript interfaces (pii, broker, agent, config, email, events)
- `tests/` — Vault, state machine, registry, schema tests

## Development Commands
```powershell
# Install dependencies
bun install

# Run CLI
bun run dev

# Run specific CLI command
bun run dev setup
bun run dev scan
bun run dev remove
bun run dev status
bun run dev dashboard
bun run dev config

# Type check
bun run typecheck

# Lint and auto-fix
bun run lint:fix

# Run tests
bun test

# Run database migrations
bun run migrate

# Dashboard dev mode (HMR)
bun run dashboard:dev

# Build CLI binary
bun run build
```

## Key Patterns & Conventions
- **Biome formatting:** Tabs, double quotes, semicolons, 100-char line width
- **PII handling:** All personal data MUST go through the encrypted vault — never store plaintext PII anywhere
- **Broker playbooks:** YAML files in `src/brokers/playbooks/` — validated against Zod schema at load time
- **State machine:** Every broker record follows the XState lifecycle (discovered → scanning → found → opt-out → confirmed)
- **Database:** SQLite with WAL mode; migrations in `src/state/migrate.ts`; CRUD via `Store` class
- **Email templates:** MJML files in `src/email/templates/` — rendered with interpolated data via `template-renderer.ts`
- **libsodium import:** Must use `require("libsodium-wrappers-sumo")` (CJS) — Bun's ESM resolution for this package is broken
- **Dashboard:** Nested Vite project with its own `package.json` and `tsconfig.json` — browser target vs Bun target

## Current Focus
Initial scaffold complete. Next priorities:
1. Browser automation (Puppeteer or Playwright) for form interaction
2. IMAP inbox monitoring implementation
3. Expanding broker playbook library beyond the initial 6

## Known Issues
- `libsodium-wrappers` ESM entry is broken under Bun — must use CJS `require()` with the `-sumo` variant
- Playbook runner step execution is stubbed (returns "Would navigate/fill/click" messages) — needs browser automation
- Dashboard app requires separate `bun install` in `src/dashboard/app/` and `bun run build` before serving static files

## Environment Setup
Copy `.env.example` to `.env` and configure:
- `ANTHROPIC_API_KEY` — Required for Claude AI integration
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — For sending removal emails
- `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASS` — For inbox monitoring (optional)
- `VAULT_PASSWORD` — Set at runtime via CLI setup wizard
- `DASHBOARD_PORT` — Default 3847
- `LOG_LEVEL` — debug, info, warn, error (default: info)
