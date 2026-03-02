# ai-eraser

AI-powered personal data removal engine — automatically finds and removes your data from data brokers.

Built by [CushLabs AI Services](https://cushlabs.com).

## Features

- **Automated Data Broker Discovery** — Scans known data brokers for your personal information
- **AI-Powered Opt-Out** — Uses Claude to analyze forms, craft removal requests, and parse responses
- **Legal Framework Support** — Generates CCPA, GDPR, and generic opt-out requests
- **Encrypted PII Vault** — Your personal data is encrypted at rest with XSalsa20-Poly1305
- **Campaign Management** — Track removal progress across dozens of brokers
- **Real-time Dashboard** — Monitor status, view audit logs, manage brokers
- **Email Integration** — Send removal requests and monitor responses automatically

## Quick Start

```bash
# Install dependencies
bun install

# Run the setup wizard
bun run dev setup

# Scan for your data across brokers
bun run dev scan

# Start removal campaigns
bun run dev remove

# Check status
bun run dev status

# Launch the dashboard
bun run dev dashboard
```

## Architecture

```
src/
├── agents/       # Orchestrator + specialized agents (recon, removal, legal, monitor)
├── ai/           # Claude API integration for form analysis and response parsing
├── brokers/      # Broker registry and YAML playbook engine
├── cli/          # Interactive CLI with Clack prompts
├── config/       # Zod-validated configuration
├── dashboard/    # React + Tailwind v4 dashboard with Bun.serve() backend
├── email/        # Nodemailer sender, inbox monitor, MJML templates
├── scheduler/    # Cron-based task scheduling
├── security/     # libsodium vault encryption and key management
├── state/        # SQLite database, migrations, XState v5 state machine
└── types/        # TypeScript interfaces for the entire system
```

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript (strict mode)
- **AI**: Anthropic Claude API
- **Database**: Bun native SQLite (WAL mode)
- **Encryption**: libsodium (XSalsa20-Poly1305 + Argon2id)
- **State Machine**: XState v5
- **CLI**: Commander + Clack
- **Email**: Nodemailer + MJML templates
- **Dashboard**: React + Vite + Tailwind CSS v4
- **Linting**: Biome

## Development

```bash
# Type check
bun run typecheck

# Lint and format
bun run lint:fix

# Run tests
bun test

# Dev dashboard with HMR
bun run dashboard:dev
```

## License

MIT — see [LICENSE](LICENSE) for details.
