# AI Eraser — Vision & Goals

## What This Is

AI Eraser is an AI-powered personal data removal engine. It automatically discovers where your personal information exists across data brokers (Spokeo, Whitepages, BeenVerified, etc.) and systematically removes it — through opt-out forms, legal deletion requests (CCPA/GDPR), and ongoing monitoring.

## Who It's For

**Primary:** Privacy-conscious individuals who want their personal data removed from data broker sites but don't have the time or technical knowledge to do it manually across dozens of brokers.

**Secondary:** Small businesses and professionals who need to manage their digital footprint as part of reputation management.

## The Problem

- There are 100+ data brokers openly selling personal information (name, address, phone, relatives, income estimates)
- Each broker has a different opt-out process — some are web forms, some require email, some need postal mail
- Opt-outs expire — brokers re-acquire data within 3-12 months
- Manual removal across even 10 brokers takes hours and requires follow-up
- Existing services (DeleteMe, Kanary, Optery) charge $100-250/year and are opaque about what they actually do

## How AI Eraser Solves It

1. **Research** — Claude AI researches brokers to discover opt-out processes, difficulty levels, and legal frameworks
2. **Scan** — User provides their name/location; the system searches broker sites for matches
3. **Remove** — Executes opt-out playbooks (form submission, email requests) automatically
4. **Monitor** — Periodically re-checks brokers to verify removals stuck and detect re-appearances
5. **Dashboard** — Web UI shows real-time campaign status across all brokers

## Design Principles

- **Privacy-first:** All PII is encrypted at rest (XSalsa20-Poly1305 + Argon2id). The vault password never leaves the user's machine.
- **Transparent:** Every action is logged to an audit trail. Users see exactly what was done, when, and why.
- **Self-hosted:** Runs on the user's own machine or server. No data sent to third parties (except the brokers themselves during opt-out).
- **AI-augmented, not AI-dependent:** Claude handles dynamic analysis (form detection, response classification, legal request drafting) but the core workflow is deterministic YAML playbooks.

## Distribution Model

Two tracks for non-developer users:

1. **Compiled binary** — Download a zip, extract, run `./ai-eraser setup`. No runtime dependencies.
2. **Docker** — `docker compose up` for always-on monitoring with a persistent dashboard.

Developers can also run from source with `bun run dev`.

## Current State (as of March 2026)

- Core scaffold is complete with real implementations (not stubs)
- 6 broker playbooks defined (Spokeo, Whitepages, BeenVerified, Radaris, PeopleFinder, MyLife)
- Research agent works end-to-end (HTTP fetch + Firecrawl + Claude AI analysis)
- Email templates for CCPA, GDPR, generic opt-out, and follow-up
- Encrypted vault, state machine, SQLite store, CLI, and dashboard all functional
- Browser automation (Playwright) is integrated but playbook step execution is stubbed
- Compiled binary and Docker distribution are ready

## Roadmap

### Near-term
- Complete browser automation for form-based opt-outs (Playwright step execution)
- IMAP inbox monitoring (auto-detect broker confirmation emails)
- Expand broker playbook library beyond initial 6

### Medium-term
- Scheduled campaigns (cron-based re-scanning and follow-up)
- Email template improvements (better deliverability, tracking)
- Dashboard enhancements (per-broker detail views, campaign history)

### Long-term
- Support for postal mail opt-outs (PDF generation + print services API)
- Multi-profile support (manage removals for family members)
- Broker discovery via search engine results (find brokers we don't have playbooks for)
