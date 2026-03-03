# Security Model

## Threat Model

AI Eraser handles highly sensitive personally identifiable information (PII): full names, addresses, phone numbers, email addresses, and potentially SSN fragments. The security model must protect this data at rest, in transit, and ensure it's never leaked into logs, databases, or external services unintentionally.

### What We Protect Against

- **Data at rest exposure:** Stolen laptop, compromised server, unauthorized filesystem access
- **Accidental PII leakage:** PII appearing in logs, error messages, database fields, or git commits
- **Credential exposure:** API keys, SMTP passwords, vault passwords in plaintext

### What We Do NOT Protect Against (Out of Scope)

- **Compromised runtime:** If an attacker has code execution on the host, the vault password could be captured from memory while the vault is unlocked
- **Broker-side security:** Once PII is sent to a broker via opt-out form/email, we can't control their handling
- **Network MITM:** We rely on TLS for SMTP/HTTPS; we don't implement certificate pinning

## Encryption Architecture

### Vault (PII Storage)

All personal data is stored in the encrypted vault — never in plaintext anywhere.

| Component | Algorithm | Purpose |
|-----------|-----------|---------|
| **Encryption** | XSalsa20-Poly1305 (libsodium) | Authenticated symmetric encryption of each PII entry |
| **Key Derivation** | Argon2id | Derives encryption key from user's vault password |
| **Library** | `libsodium-wrappers-sumo` | Audited, high-quality crypto implementation |

### Key Derivation Parameters

```typescript
memoryCost: 65536  // 64 MB — resistant to GPU/ASIC attacks
timeCost: 3        // 3 iterations
```

These defaults are configurable via env vars (`VAULT_MEMORY_COST`, `VAULT_TIME_COST`) but should not be lowered.

### Vault Lifecycle

1. User provides password → Argon2id derives encryption key
2. Vault is "unlocked" — key held in memory
3. PII entries are encrypted/decrypted as needed
4. Vault is "locked" — key zeroed from memory
5. Password is never persisted to disk

### File Structure

Each PII entry is stored as a separate encrypted file in the vault directory:
```
data/vault/
  <profile-id-1>.enc
  <profile-id-2>.enc
```

## Data Separation

The SQLite database (`data/ai-eraser.db`) stores operational data but **never PII**:

| What's in SQLite | What's NOT in SQLite |
|------------------|---------------------|
| Broker record IDs and statuses | Names, addresses, phone numbers |
| Audit log entries (actions taken) | Email content or PII fields |
| Campaign metadata | Vault passwords or encryption keys |
| Broker intel (public info) | SMTP/IMAP credentials |
| Profile references (IDs only) | Actual profile data |

PII is only accessed by decrypting vault entries at runtime, using them for the immediate operation (search query, email template interpolation), then discarding them.

## Credential Management

### `.env` File

All secrets live in `.env`, which is:
- Listed in `.gitignore` (never committed)
- Listed in `.dockerignore` (never baked into images)
- Injected into Docker containers via `env_file` directive

### API Keys

| Key | Purpose | Required |
|-----|---------|----------|
| `ANTHROPIC_API_KEY` | Claude AI for analysis, classification, legal drafts | Yes |
| `FIRECRAWL_API_KEY` | Enhanced web scraping during broker research | No |
| SMTP/IMAP credentials | Sending removal emails, monitoring inbox | No |

### Vault Password

- Set interactively during `setup` command
- Never written to `.env` or any file
- Must be provided each time the vault is accessed (scan, remove commands)

## Known Limitations

1. **libsodium CJS import:** Must use `require("libsodium-wrappers-sumo")` because Bun's ESM resolution for this package is broken. Functionally identical, just an import quirk.

2. **Memory safety:** While the vault locks (zeros the key), JavaScript's garbage collector may retain copies. For extremely high-security use cases, a native (Rust/C) vault implementation would be better.

3. **No audit log encryption:** The audit log in SQLite is plaintext. It records actions ("sent CCPA request to Spokeo") but not PII. If action descriptions ever include PII, this needs revisiting.

4. **Single-user model:** The vault has one password. Multi-user deployments would need per-user vaults or a different key management approach.
