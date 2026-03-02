# Contributing to AI Eraser

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/RCushmaniii/ai-personal-data-eraser.git
cd ai-personal-data-eraser

# Install dependencies
bun install

# Run tests
bun test

# Type check
bun run typecheck

# Lint
bun run lint:fix
```

## Project Structure

See the [README](README.md) for the full architecture overview.

## Making Changes

1. Create a feature branch: `git checkout -b feature/my-change`
2. Make your changes
3. Run `bun run lint:fix` and `bun run typecheck`
4. Run `bun test` and ensure all tests pass
5. Commit with a clear message
6. Open a pull request

## Adding a New Broker Playbook

1. Create a new YAML file in `src/brokers/playbooks/`
2. Follow the schema defined in `src/brokers/playbook-schema.ts`
3. Add search, optOut, and verify steps
4. Test that the playbook loads: add a test in `tests/registry.test.ts`

## Code Style

- We use **Biome** for linting and formatting
- Tabs for indentation, double quotes, semicolons
- Run `bun run lint:fix` before committing

## Security

- Never store plaintext PII — all personal data must go through the encrypted vault
- Never commit `.env` files or credentials
- Report security vulnerabilities privately (do not open public issues)
