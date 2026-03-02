# AI Eraser Architecture

## Overview

AI Eraser uses an agent-based architecture to automate personal data removal from data brokers. The system is composed of specialized agents that handle different aspects of the removal process.

## Agent System

### Orchestrator
Coordinates campaign execution across all specialized agents. Manages the full lifecycle.

### Recon Agent
Scans data brokers to discover where a person's data appears. Uses YAML playbooks to define search procedures for each broker.

### Removal Agent
Executes opt-out playbooks on brokers where data was found. Handles form filling, submission, and error recovery.

### Legal Agent
Generates and sends formal data deletion requests under CCPA, GDPR, or generic opt-out frameworks. Uses Claude AI for natural language generation and MJML templates for formatted emails.

### Monitor Agent
Periodically re-checks brokers to verify removals and detect re-appearances.

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

- PII is encrypted at rest using XSalsa20-Poly1305 (libsodium)
- Encryption keys derived from user password via Argon2id
- Vault stores each entry as a separate encrypted file
- Vault password is never persisted

## Data Flow

1. User provides PII → encrypted in Vault
2. Recon Agent scans brokers using playbooks
3. Matches stored in SQLite (no PII, only references)
4. Removal Agent executes opt-out playbooks
5. Legal Agent sends formal deletion requests
6. Monitor Agent verifies removals
7. Dashboard shows real-time campaign status
