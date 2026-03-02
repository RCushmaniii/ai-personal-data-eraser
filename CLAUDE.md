# ai-eraser — Project Instructions

## Project Overview
AI-powered personal data removal engine. Agent-based architecture with encrypted PII vault, YAML broker playbooks, and Claude AI integration for form analysis.

## Tech Stack
- **Runtime**: Bun (not Node)
- **Language**: TypeScript strict mode
- **Package Manager**: bun (check bun.lockb)
- **Linting/Formatting**: Biome (`bun run lint:fix`)
- **Testing**: `bun test`
- **Type Checking**: `bun run typecheck`

## Architecture
- `src/agents/` — Orchestrator + specialized agents (recon, removal, legal, monitor)
- `src/ai/` — Claude API integration (form analysis, response parsing, prompts)
- `src/brokers/` — Broker registry + YAML playbook runner
- `src/cli/` — CLI entry point with Commander + Clack
- `src/config/` — Zod schema validation + defaults
- `src/dashboard/` — server.ts (Bun.serve API) + app/ (nested Vite+React project)
- `src/email/` — Nodemailer sender, inbox monitor, MJML templates
- `src/scheduler/` — Cron scheduling with croner
- `src/security/` — libsodium-wrappers vault (XSalsa20-Poly1305 + Argon2id)
- `src/state/` — SQLite database, migrations, store, XState v5 state machine
- `src/types/` — All TypeScript interfaces

## Key Decisions
- **libsodium-wrappers** (not sodium-native) — sodium-native has Bun incompatibility
- **XState v5** with `setup().createMachine()` for full TS inference
- **Tailwind v4** with `@tailwindcss/vite` — no PostCSS needed
- **Dashboard is a nested Vite project** with its own package.json and tsconfig

## Commands
```bash
bun run dev            # Run CLI
bun run dev setup      # Setup wizard
bun run dev scan       # Scan brokers
bun run dev remove     # Start removal campaigns
bun run dev status     # Check campaign status
bun run dev dashboard  # Launch dashboard
bun run typecheck      # Type check
bun run lint:fix       # Lint and format
bun test               # Run tests
bun run dashboard:dev  # Dashboard with HMR
```

## Conventions
- Use Biome formatting (tabs, double quotes, semicolons)
- All PII must go through the encrypted vault — never store plaintext PII
- Broker playbooks are YAML files in `src/brokers/playbooks/`
- Database is SQLite with WAL mode, migrations in `src/state/migrate.ts`
- MJML templates in `src/email/templates/`
