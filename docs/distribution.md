# Distribution & Deployment

## Overview

AI Eraser ships via three channels:

1. **Compiled binary** — Single executable + resources folder. No runtime dependencies.
2. **Docker** — `docker compose up` for always-on deployment with persistent data.
3. **From source** — For developers. Requires Bun 1.3+.

## Compiled Binary

### How It Works

`bun build --compile` bundles the TypeScript source and Bun runtime into a single native executable. External resources (dashboard frontend, YAML playbooks, MJML templates) are packaged alongside the binary in a `resources/` folder.

### Build Commands

```bash
# Build for current platform
bun run build:binary

# Build for all 5 platforms (creates zip/tar.gz archives)
bun run build:all
```

### Release Archive Structure

```
ai-eraser-windows-x64/
  ai-eraser.exe          # Compiled binary
  .env.example           # Configuration template
  resources/
    dashboard/           # Vite build output (index.html, assets/)
    playbooks/           # 6 YAML broker definitions
    templates/           # 4 MJML email templates
```

### Resource Resolution

The `resolveResource()` utility (`src/utils/resolve-resource.ts`) handles the difference between dev mode and compiled binary:

- **Dev mode:** Resources resolve relative to source files via `import.meta.dir`
- **Compiled binary:** Resources resolve relative to the executable at `<exe dir>/resources/<name>`

Detection heuristic: if `process.execPath` doesn't end with `/bun` or `/bun.exe`, we're running as a compiled binary.

### Supported Platforms

| Target | Binary Name | Archive |
|--------|-------------|---------|
| `bun-windows-x64` | `ai-eraser.exe` | `.zip` |
| `bun-linux-x64` | `ai-eraser` | `.tar.gz` |
| `bun-linux-arm64` | `ai-eraser` | `.tar.gz` |
| `bun-darwin-x64` | `ai-eraser` | `.tar.gz` |
| `bun-darwin-arm64` | `ai-eraser` | `.tar.gz` |

### User Installation

1. Download the archive for your OS from GitHub Releases
2. Extract to any folder
3. Copy `.env.example` → `.env`, add your `ANTHROPIC_API_KEY`
4. Run:
   ```
   ./ai-eraser setup       # Create encrypted vault
   ./ai-eraser research    # Discover data brokers
   ./ai-eraser dashboard   # Web UI at http://localhost:3847
   ```

### Limitations

- **Playwright is not bundled.** Browser automation requires Playwright installed separately (`bunx playwright install chromium`). The binary gracefully handles missing Playwright with a clear error message.
- **No auto-update.** Users must manually download new releases.

## Docker

### Architecture

Multi-stage Dockerfile:

1. **`dashboard-builder`** — Installs dashboard deps, runs Vite build
2. **`deps`** — Installs production-only Node modules
3. **`runtime`** — Slim image with just the app, node_modules, and built dashboard

### Key Configuration

| Env Var | Docker Default | Purpose |
|---------|---------------|---------|
| `DASHBOARD_HOST` | `0.0.0.0` | Bind to all interfaces (required in container) |
| `DB_PATH` | `/app/data/ai-eraser.db` | SQLite in persistent volume |
| `VAULT_DATA_DIR` | `/app/data/vault` | Encrypted vault in persistent volume |

### Data Persistence

The `ai-eraser-data` named volume is mounted at `/app/data/`, which stores:
- `ai-eraser.db` — SQLite database (broker records, audit log, profiles)
- `vault/` — Encrypted PII files

This survives container restarts, image upgrades, and `docker compose down`.

### Usage

**With git clone:**
```bash
git clone https://github.com/RCushmaniii/ai-personal-data-eraser.git
cd ai-personal-data-eraser
cp .env.example .env   # Add your ANTHROPIC_API_KEY
docker compose up -d
```

**Without cloning (just 2 files):**
Download `docker-compose.yml` and `.env.example` from the repo, fill in `.env`, run `docker compose up -d`.

**Interactive commands:**
```bash
docker compose run ai-eraser setup     # First-time vault setup
docker compose run ai-eraser scan      # Scan for your data
docker compose run ai-eraser research  # Research brokers
```

### What's NOT in Docker

- **Playwright / browser automation** — Keeps image small (~200MB vs ~1.5GB). Browser automation is stubbed anyway. If needed later, it would require a separate container with Chromium.

## CI/CD Pipeline

Triggered on version tags (`v*`). Four jobs:

```
check (lint + typecheck + test)
  ├── build-binaries (5-target matrix → zip/tar.gz artifacts)
  ├── build-docker (build + push to ghcr.io)
  └── release (create GitHub Release with all archives)
```

### Creating a Release

```bash
git tag v0.2.0
git push origin v0.2.0
```

This triggers the full pipeline: check → build binaries for all 5 platforms → build and push Docker image to GHCR → create GitHub Release with all archives attached.

### Container Registry

Docker images are pushed to GitHub Container Registry:
```
ghcr.io/rcushmaniii/ai-eraser:latest
ghcr.io/rcushmaniii/ai-eraser:0.2.0
```
