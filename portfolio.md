---
# =============================================================================
# PORTFOLIO.md — ai-eraser
# =============================================================================
portfolio_enabled: false
portfolio_priority: 3
portfolio_featured: false
portfolio_last_reviewed: "2026-03-02"

title: "ai-eraser — AI-Powered Data Removal Engine"
tagline: "Automated personal data removal from data brokers using Claude AI and encrypted PII vault"
slug: "ai-eraser"

category: "AI Automation"
target_audience: "Privacy-conscious individuals and organizations managing personal data exposure"
tags:
  - "ai-automation"
  - "privacy"
  - "data-brokers"
  - "ccpa"
  - "gdpr"
  - "encryption"
  - "typescript"
  - "bun"

thumbnail: ""
hero_images: []
demo_video_url: ""

live_url: ""
demo_url: ""
case_study_url: ""

problem_solved: |
  Data brokers collect and sell personal information across 100+ sites, each with different
  opt-out procedures. Manual removal is a recurring, error-prone burden that takes hours per
  broker and requires tracking follow-ups across legal frameworks. Commercial services charge
  $100-200/year and still miss brokers or fail to monitor for re-appearances.

key_outcomes:
  - "Agent-based architecture automates the full removal lifecycle end-to-end"
  - "6 broker playbooks defined with extensible YAML schema for rapid expansion"
  - "CCPA/GDPR legal request generation with proper statutory references"
  - "XSalsa20-Poly1305 + Argon2id encryption protects PII at rest"
  - "27 passing tests covering encryption, state machine, registry, and schemas"

tech_stack:
  - "Bun"
  - "TypeScript"
  - "Anthropic Claude API"
  - "SQLite (WAL mode)"
  - "XState v5"
  - "libsodium (XSalsa20-Poly1305 + Argon2id)"
  - "React"
  - "Tailwind CSS v4"
  - "Nodemailer + MJML"
  - "Zod"
  - "Commander + Clack"

complexity: "Production"
---

## Overview

ai-eraser is an AI-powered personal data removal engine that automates discovery and deletion of personal information from data broker websites. The system coordinates specialized agents — reconnaissance, removal, legal, and monitoring — through a campaign lifecycle managed by an XState v5 state machine.

Claude AI handles the intelligent operations: analyzing unfamiliar opt-out forms, mapping form fields to user data, classifying email responses from brokers, and generating legally sound deletion requests under CCPA, GDPR, and generic frameworks. All personal data is encrypted at rest using XSalsa20-Poly1305 with Argon2id key derivation — the vault password never touches disk.

Broker interactions are defined as YAML playbooks, making it possible to add support for new brokers without writing code. The system includes a React + Tailwind v4 dashboard for monitoring campaign progress and a CLI built with Commander and Clack for interactive setup and management.

## The Challenge

- **Scale problem:** 100+ data brokers each have unique opt-out procedures — web forms, email, phone verification, postal mail, or account deletion portals
- **Persistence:** Brokers routinely re-list removed data within weeks, requiring ongoing monitoring and re-submission
- **Legal complexity:** CCPA, GDPR, and generic requests require different statutory language, deadlines, and identity verification approaches
- **Tracking burden:** Without centralized tracking, it's impossible to know which brokers have been contacted, what their response was, and when to follow up
- **Cost:** Commercial removal services charge $100-200/year with inconsistent coverage and no transparency into their process

## The Solution

**Agent orchestration:** Four specialized agents handle distinct phases of the removal lifecycle. The orchestrator coordinates campaigns, routing tasks to the right agent and logging every action to an audit trail.

**YAML playbook engine:** Each broker is defined by a declarative YAML file specifying search URLs, opt-out steps, form field mappings, and verification procedures. The playbook runner executes steps sequentially with configurable retry logic and failure handling.

**AI-powered analysis:** Claude analyzes opt-out forms to map fields to user data, classifies broker email responses (confirmation, denial, verification request), and generates legally appropriate deletion requests with proper statutory references.

**Encrypted vault:** libsodium-wrappers-sumo provides XSalsa20-Poly1305 authenticated encryption with Argon2id key derivation. Each vault entry is stored as a separate encrypted file, and the derived key is securely wiped from memory when the vault locks.

## Technical Highlights

- **XState v5 state machine:** Enforces valid broker lifecycle transitions (discovered → scanning → found → opt-out → confirmed) with guards for retry limits and deterministic error recovery
- **libsodium-wrappers-sumo over sodium-native:** Solved Bun FFI incompatibility where sodium-native exports undefined constants; the WASM-based sumo variant provides identical cryptographic primitives
- **Zod schema validation:** Enforces configuration correctness at startup and validates YAML playbooks at load time, catching structural errors before runtime
- **Bun-native SQLite with WAL mode:** Concurrent read performance for the dashboard while agents write status updates, with indexed queries on status and broker ID
- **Nested Vite project:** Dashboard uses its own package.json and tsconfig targeting browser APIs, while the main project targets Bun — clean separation without monorepo tooling overhead
- **MJML email templates:** Type-safe template rendering with proper legal language for CCPA (45-day deadline, §1798.105), GDPR (30-day deadline, Art. 17), and generic opt-out requests

## Results

**For the End User:**
- Automated campaign management replaces manual spreadsheet tracking across dozens of brokers
- Encrypted vault ensures personal data is never stored in plaintext, even locally
- Legal request generation handles CCPA/GDPR compliance without requiring legal expertise

**Technical Demonstration:**
- Agent-based architecture with clear separation of concerns and event-driven communication
- Production-grade encryption using industry-standard cryptographic primitives
- Type-safe full-stack development from Zod schemas through SQLite store to React dashboard
- Practical problem-solving: identified and worked around Bun's libsodium FFI incompatibility during implementation

The project demonstrates end-to-end system design — from encrypted data storage and AI integration through state machine orchestration to a real-time monitoring dashboard.
