# Broker Playbook System

## Overview

Playbooks are YAML definitions that describe how to interact with a specific data broker — how to search for a person's data, how to submit an opt-out, and what to expect. They are the core knowledge base that drives the removal engine.

## Current Playbooks

| Broker | Domain | Category | Difficulty | Opt-Out Methods |
|--------|--------|----------|------------|-----------------|
| Spokeo | spokeo.com | people-search | medium | web-form |
| Whitepages | whitepages.com | people-search | easy | web-form |
| BeenVerified | beenverified.com | people-search | medium | web-form, email |
| Radaris | radaris.com | people-search | hard | email |
| PeopleFinder | peoplefinder.com | people-search | medium | web-form |
| MyLife | mylife.com | people-search | hard | email |

Playbooks live in `src/brokers/playbooks/` and are loaded by the `BrokerRegistry` at startup.

## Playbook Schema

Every playbook is validated against a Zod schema (`src/brokers/playbook-schema.ts`) at load time. Invalid playbooks throw immediately with detailed error messages.

### Required Fields

```yaml
id: spokeo                    # Unique identifier
name: Spokeo                  # Human-readable name
domain: spokeo.com            # Primary domain
category: people-search       # people-search | data-aggregator | marketing | background-check
difficulty: medium            # easy | medium | hard
optOutMethods:                # Array: web-form | email | postal | phone
  - web-form
searchUrl: https://...        # Where to search for a person
optOutUrl: https://...        # Where to submit opt-out
estimatedDays: 14             # Expected removal time
requiresVerification: true    # Whether email/phone verification is needed
legalFrameworks:              # Applicable legal bases
  - ccpa
  - gdpr
```

### Optional Fields

```yaml
notes: "Requires CAPTCHA solving"    # Free-text notes for the removal agent
steps:                                # Ordered automation steps (see below)
  - action: navigate
    url: https://...
  - action: fill
    selector: "#email"
    value: "{{email}}"
  - action: click
    selector: "#submit"
```

## Step Execution

Playbook steps define browser automation sequences. Each step has an `action` and action-specific parameters:

| Action | Parameters | Purpose |
|--------|-----------|---------|
| `navigate` | `url` | Load a page |
| `fill` | `selector`, `value` | Fill a form field |
| `click` | `selector` | Click a button/link |
| `wait` | `selector` or `timeout` | Wait for element or delay |
| `screenshot` | `name` | Capture page state |
| `assert` | `selector`, `text` | Verify expected content |

**Current state:** Step execution is **stubbed** — the `PlaybookRunner` returns "Would navigate/fill/click" messages. Real execution requires Playwright browser automation, which is integrated but the step dispatch logic needs completion.

### Template Variables

Step values support `{{variable}}` interpolation with PII from the vault:

```yaml
- action: fill
  selector: "#first-name"
  value: "{{firstName}}"
- action: fill
  selector: "#last-name"
  value: "{{lastName}}"
- action: fill
  selector: "#email"
  value: "{{email}}"
```

## Adding a New Playbook

1. Create a YAML file in `src/brokers/playbooks/` (e.g., `intelius.yml`)
2. Follow the schema above — the registry validates on load
3. Test loading: `bun run dev config` (registry loads all playbooks at startup)
4. If the broker requires email-based removal, the legal agent handles it via MJML templates
5. If the broker requires web form submission, define `steps:` for browser automation

## Research Agent Integration

The `research` command uses Claude AI to analyze broker websites and populate broker intel. This is separate from playbooks — research discovers what a broker does, while playbooks encode how to interact with it.

Research output is stored in the `broker_intel` SQLite table and displayed on the dashboard. It includes:
- Opt-out process description
- Difficulty assessment
- Legal framework applicability
- Privacy policy analysis
- Whether the broker was reachable and cooperating

## Compiled Binary Consideration

In compiled binary mode, playbooks are loaded from `<exe dir>/resources/playbooks/` instead of `src/brokers/playbooks/`. The `resolveResource()` utility handles this transparently. Any new playbooks added after installation must be placed in the `resources/playbooks/` folder alongside the binary.
