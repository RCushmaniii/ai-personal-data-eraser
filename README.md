# ai-eraser

![Bun](https://img.shields.io/badge/Bun-1.3-black?logo=bun)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![Claude API](https://img.shields.io/badge/Claude_API-Anthropic-orange)
![XState](https://img.shields.io/badge/XState-v5-purple)
![License](https://img.shields.io/badge/License-MIT-green)

> AI-powered personal data removal engine — automatically discovers and removes your information from data broker websites.

## Overview

ai-eraser automates the tedious, error-prone process of removing personal information from data broker sites like Spokeo, Whitepages, BeenVerified, and dozens of others. Instead of manually visiting each site, navigating opt-out forms, sending emails, and tracking progress across spreadsheets, ai-eraser handles the entire lifecycle.

The system uses an agent-based architecture where specialized agents handle reconnaissance (finding your data), removal (submitting opt-out requests), legal compliance (generating CCPA/GDPR requests), and monitoring (verifying removals stick). Claude AI powers the intelligent parts — analyzing unfamiliar forms, classifying broker responses, and generating legally sound deletion requests.

All personal data is encrypted at rest using XSalsa20-Poly1305 with Argon2id key derivation. The vault password never touches disk. Broker interactions are defined as extensible YAML playbooks, making it straightforward to add support for new brokers without modifying code.

## The Challenge

Data brokers collect and sell personal information — names, addresses, phone numbers, relatives, employment history — often without the subject's knowledge. Removing yourself is a Sisyphean task:

- **Scale:** There are 100+ data brokers, each with different opt-out procedures
- **Complexity:** Some require web forms, others email, some demand phone verification or notarized letters
- **Persistence:** Brokers re-list removed data within weeks or months
- **Legal variation:** CCPA, GDPR, and generic requests require different language and deadlines
- **Tracking burden:** Without a system, it's impossible to know which brokers you've contacted, what their status is, and when to follow up

Commercial removal services charge $100-200/year and often miss brokers or fail to monitor for re-appearances.

## The Solution

ai-eraser treats data removal as a campaign managed by coordinating agents:

**Agent-based orchestration:** Four specialized agents — recon, removal, legal, and monitor — each handle a distinct phase. An orchestrator coordinates them into campaigns. Each agent logs every action for full audit traceability.

**YAML playbook engine:** Every broker is defined by a YAML playbook specifying search URLs, opt-out steps, form fields, and verification procedures. Adding a new broker means writing a YAML file, not code. The playbook runner interpolates user data and executes steps sequentially with configurable retry logic.

**AI-powered intelligence:** Claude analyzes unfamiliar opt-out forms, maps fields to user data, classifies email responses (confirmation, denial, verification request), and generates legally appropriate deletion requests under CCPA, GDPR, or generic frameworks.

**Encrypted PII vault:** Personal data is encrypted with XSalsa20-Poly1305 using keys derived from the user's password via Argon2id. The vault stores each entry as a separate encrypted file — the password never persists, and the encryption key is wiped from memory when the vault locks.

## Technical Highlights

- **XState v5 state machine** tracks each broker record through a well-defined lifecycle (discovered → scanning → found → opt-out → confirmed), preventing invalid state transitions and enabling deterministic retry logic
- **libsodium-wrappers-sumo** provides WASM-based encryption compatible with Bun (sodium-native exports undefined constants under Bun's FFI)
- **Zod schema validation** enforces configuration correctness at startup and validates YAML playbooks at load time, catching errors before they cause runtime failures
- **Bun-native SQLite** with WAL mode provides concurrent read performance for the dashboard while agents write audit logs and status updates
- **MJML email templates** generate responsive HTML emails for CCPA, GDPR, generic opt-out, and follow-up requests with proper legal language
- **Nested Vite project** separates the React+Tailwind v4 dashboard from the Bun backend, allowing independent development with HMR while sharing the same API

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.3
- An [Anthropic API key](https://console.anthropic.com/) for Claude integration
- SMTP credentials for sending removal emails (Gmail app passwords work)

### Installation

```powershell
# Clone the repository
git clone https://github.com/RCushmaniii/ai-personal-data-eraser.git
cd ai-personal-data-eraser

# Install dependencies
bun install

# Run the interactive setup wizard
bun run dev setup
```

The setup wizard walks through API key configuration, email credentials, and vault password creation.

### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | Yes |
| `SMTP_HOST` | SMTP server hostname | Yes |
| `SMTP_PORT` | SMTP port (default: 587) | No |
| `SMTP_USER` | SMTP username / email address | Yes |
| `SMTP_PASS` | SMTP password or app password | Yes |
| `IMAP_HOST` | IMAP server for inbox monitoring | No |
| `IMAP_PORT` | IMAP port (default: 993) | No |
| `IMAP_USER` | IMAP username | No |
| `IMAP_PASS` | IMAP password | No |
| `VAULT_PASSWORD` | Vault encryption passphrase | Set at runtime |
| `DASHBOARD_PORT` | Dashboard server port (default: 3847) | No |
| `LOG_LEVEL` | Logging verbosity: debug, info, warn, error | No |

## Project Structure

```
src/
├── agents/          # Orchestrator + specialized agents (recon, removal, legal, monitor)
├── ai/              # Claude API integration (form analysis, response parsing, prompts)
├── brokers/         # Broker registry, playbook runner, and YAML playbook definitions
│   └── playbooks/   # YAML broker definitions (spokeo, whitepages, etc.)
├── cli/             # Commander + Clack CLI with subcommands
│   └── commands/    # setup, scan, remove, status, dashboard, config
├── config/          # Zod schema validation and environment loading
├── dashboard/       # Bun.serve() API backend + nested Vite/React app
│   └── app/         # React + Tailwind v4 dashboard (separate package.json)
├── email/           # Nodemailer sender, inbox monitor, MJML templates
│   └── templates/   # CCPA, GDPR, generic opt-out, follow-up MJML templates
├── scheduler/       # Cron-based task scheduling (scans, rechecks, inbox)
├── security/        # libsodium vault encryption and Argon2id key derivation
├── state/           # SQLite database, migrations, CRUD store, XState machine
└── types/           # TypeScript interfaces for the entire system
```

## Security

- [x] PII encrypted at rest with XSalsa20-Poly1305 authenticated encryption
- [x] Encryption keys derived via Argon2id (memory-hard, resistant to GPU attacks)
- [x] Vault password never persisted — derived key wiped from memory on lock
- [x] Each vault entry stored as a separate encrypted file (compromise isolation)
- [x] Database stores only broker record metadata — no plaintext PII
- [x] SMTP credentials stored in `.env`, excluded from version control
- [x] API keys validated at startup, never logged or exposed in dashboard

## Results

This project is in active early development. The scaffold establishes a production-grade foundation:

| Metric | Status |
|--------|--------|
| Type safety | Full strict-mode TypeScript, zero `any` in core modules |
| Test coverage | 27 tests covering encryption, state machine, registry, schemas |
| Broker playbooks | 6 brokers defined (Spokeo, Whitepages, BeenVerified, Radaris, PeopleFinder, MyLife) |
| CI/CD | GitHub Actions for lint, typecheck, test on every push |
| Encryption | Real XSalsa20-Poly1305 + Argon2id — not stubs |

Next implementation milestones: browser automation (Puppeteer/Playwright) for form interaction, IMAP inbox monitoring, and expanding the broker playbook library.

## Contact

**Robert Cushman**
Business Solution Architect & Full-Stack Developer
Guadalajara, Mexico

info@cushlabs.ai
[GitHub](https://github.com/RCushmaniii) | [LinkedIn](https://linkedin.com/in/robertcushman) | [Portfolio](https://cushlabs.ai)

## License

MIT License - Free to use for personal or commercial projects. See [LICENSE](LICENSE) for details.

---

*Last Updated: 2026-03-02*
