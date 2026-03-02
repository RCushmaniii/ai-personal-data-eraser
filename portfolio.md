# ai-eraser — Portfolio Entry

## Project Overview
AI-powered personal data removal engine that automatically discovers and removes personal information from data broker websites. Uses Claude AI for intelligent form analysis, legal request generation, and response classification.

## Client
Internal tool / CushLabs AI Services

## Tech Stack
- Bun + TypeScript
- Anthropic Claude API
- SQLite (WAL mode) + XState v5
- libsodium encryption (XSalsa20-Poly1305)
- React + Tailwind CSS v4 dashboard
- Nodemailer + MJML email templates

## Key Features
- Encrypted PII vault with Argon2id key derivation
- Agent-based architecture: recon, removal, legal, and monitor agents
- YAML playbook engine for extensible broker definitions
- CCPA/GDPR legal template generation
- Real-time campaign dashboard
- Automated email monitoring for removal confirmations

## Status
In Development

## Repository
https://github.com/RCushmaniii/ai-personal-data-eraser
