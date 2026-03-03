# AI Eraser Architecture

## Overview

AI Eraser uses an agent-based architecture to automate personal data removal from data brokers. The system is composed of specialized agents that handle different aspects of the removal process.

## System Diagram

```
┌──────────────────────────────────────────────────────────┐
│  CLI (Commander + Clack)                                 │
│  Commands: setup | scan | remove | status | research |   │
│            dashboard | config                            │
└────────────┬─────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────┐
│  Orchestrator Agent                                      │
│  Coordinates campaigns across all specialized agents     │
├──────────┬──────────┬──────────┬─────────────────────────┤
│  Recon   │ Removal  │  Legal   │  Monitor                │
│  Agent   │ Agent    │  Agent   │  Agent                  │
└────┬─────┴────┬─────┴────┬─────┴────┬────────────────────┘
     │          │          │          │
┌────▼──────────▼──────────▼──────────▼────────────────────┐
│  Core Services                                           │
│  ┌─────────┐ ┌──────────┐ ┌──────┐ ┌─────────────────┐  │
│  │ Broker  │ │ Playbook │ │Vault │ │ Claude AI       │  │
│  │Registry │ │ Runner   │ │(PII) │ │ (Analysis/Gen)  │  │
│  └────┬────┘ └────┬─────┘ └──┬───┘ └────────┬────────┘  │
│       │           │          │               │           │
│  ┌────▼───┐  ┌────▼────┐ ┌──▼────┐  ┌───────▼───────┐  │
│  │ YAML   │  │Playwright│ │libsod-│  │ Anthropic API │  │
│  │Playbook│  │ Browser │ │ium    │  │ (Claude)      │  │
│  │ Files  │  │         │ │       │  │               │  │
│  └────────┘  └─────────┘ └───────┘  └───────────────┘  │
└──────────────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────┐
│  Storage Layer                                           │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │ SQLite + WAL │  │ Vault Dir │  │ Email Templates  │  │
│  │ (operations) │  │ (enc PII) │  │ (MJML files)     │  │
│  └──────────────┘  └───────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────┐
│  Dashboard (React + Vite + Tailwind CSS v4)              │
│  Served by Bun.serve() on port 3847                      │
│  API: /api/summary | /api/brokers | /api/audit |         │
│       /api/profiles | /api/broker-intel | /api/health    │
└──────────────────────────────────────────────────────────┘
```

## Agent System

### Orchestrator
Coordinates campaign execution across all specialized agents. Manages the full lifecycle.

### Recon Agent
Scans data brokers to discover where a person's data appears. Uses YAML playbooks to define search procedures for each broker.

### Removal Agent
Executes opt-out playbooks on brokers where data was found. Handles form filling, submission, and error recovery.

### Legal Agent
Generates and sends formal data deletion requests under CCPA, GDPR, or generic opt-out frameworks. Uses Claude AI for natural language generation and MJML templates for formatted emails. See [email-strategy.md](email-strategy.md).

### Monitor Agent
Periodically re-checks brokers to verify removals and detect re-appearances.

### Research Agent
Uses HTTP fetch + Firecrawl + Claude AI to analyze broker websites and build intelligence about opt-out processes, difficulty levels, and legal frameworks. Results stored in `broker_intel` table.

## State Machine

Each broker record is managed by an XState v5 state machine that tracks the lifecycle:

```
discovered → scanning → found → opt_out_started → opt_out_submitted → awaiting_confirmation → removal_confirmed
                    ↘ not_found
            opt_out_started → verification_needed → opt_out_submitted
            any_stage → removal_failed → (retry) → opt_out_started
            removal_confirmed → re_appeared → opt_out_started
```

## Security

See [security.md](security.md) for the full security model.

- PII is encrypted at rest using XSalsa20-Poly1305 (libsodium)
- Encryption keys derived from user password via Argon2id
- Vault stores each entry as a separate encrypted file
- Vault password is never persisted
- SQLite stores only operational data — never PII

## Data Flow

1. User provides PII → encrypted in Vault
2. Recon Agent scans brokers using playbooks
3. Matches stored in SQLite (no PII, only references)
4. Removal Agent executes opt-out playbooks
5. Legal Agent sends formal deletion requests
6. Monitor Agent verifies removals
7. Dashboard shows real-time campaign status

## Key Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Runtime | Bun | Fast startup, built-in SQLite, TypeScript-native, `bun build --compile` for distribution |
| AI | Claude API (not local LLM) | Needs strong reasoning for form analysis and legal language |
| Encryption | libsodium (not Node crypto) | Audited library, Argon2id support, consistent cross-platform |
| State management | XState v5 | Deterministic state machine prevents invalid broker status transitions |
| Database | SQLite + WAL | Zero-config, embedded, good enough for single-user workloads |
| Browser automation | Playwright | Best cross-browser support, well-maintained |
| Dashboard | React + Vite + Tailwind | Fast to build, familiar ecosystem |
| Playbooks | YAML + Zod validation | Human-readable, easy to contribute, validated at load time |

## File Layout

```
src/
  agents/          Orchestrator + specialized agents (recon, removal, legal, monitor)
  ai/              Claude API integration (form analysis, response parsing, prompts)
  brokers/         Broker registry, playbook runner, browser manager, YAML playbooks
  cli/             CLI entry point (Commander + Clack) and subcommands
  config/          Zod schema validation, env loading, defaults
  dashboard/
    server.ts      Bun.serve() API backend
    app/           Nested Vite + React project (separate package.json/tsconfig)
  email/           Nodemailer sender, inbox monitor, MJML templates
  scheduler/       Cron scheduling with croner
  security/        Encrypted vault (libsodium)
  state/           SQLite database, migrations, CRUD store, XState state machine
  types/           All TypeScript interfaces
  utils/           Shared utilities (resource resolution)
scripts/           Build and seed scripts
tests/             Unit tests
docs/              This documentation
```

## Related Documentation

- [vision.md](vision.md) — Project goals, design principles, roadmap
- [security.md](security.md) — Encryption, threat model, credential management
- [email-strategy.md](email-strategy.md) — SMTP setup, Gmail limitations, upgrade path
- [playbooks.md](playbooks.md) — Broker playbook format, adding new brokers
- [distribution.md](distribution.md) — Binary builds, Docker, CI/CD pipeline
