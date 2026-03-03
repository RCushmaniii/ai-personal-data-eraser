# Email Strategy & SMTP Configuration

## Current Implementation

AI Eraser sends formal data deletion requests to brokers via email using Nodemailer + MJML templates. Four template types exist:

| Template | Legal Basis | Deadline |
|----------|-------------|----------|
| `ccpa_delete` | California Consumer Privacy Act §1798.105 | 45 days |
| `gdpr_delete` | GDPR Article 17 (Right to Erasure) | 30 days |
| `generic_optout` | General privacy request | No statutory deadline |
| `followup` | Follow-up on unanswered request | References original deadline |

Templates are MJML files in `src/email/templates/` — compiled to responsive HTML with a plain-text fallback.

## Gmail SMTP — Capabilities & Limitations

The default configuration uses Gmail SMTP, which is pragmatic for personal use but has real constraints.

### What Works

- **Simple setup:** Gmail + App Password is the easiest path for non-technical users
- **Personal scale:** Sending 6-50 removal emails per campaign is well within Gmail's limits
- **TLS encryption:** Gmail enforces TLS for SMTP, so emails are encrypted in transit
- **Familiar sender:** Emails come from the user's own address, which adds legitimacy to legal requests

### Limitations

| Constraint | Impact |
|------------|--------|
| **500 emails/day** (personal) / 2,000/day (Workspace) | Fine for personal use; blocks scaling to service model |
| **Automated sending detection** | Google monitors for bulk/automated patterns. Sending 50 identical-looking templated emails could trigger a temporary account lockout |
| **App Password required** | Users must enable 2FA and generate an app-specific password — adds friction to setup |
| **Deliverability** | `@gmail.com` sender addresses may be filtered by some brokers' spam systems |
| **Google policy changes** | Google periodically tightens programmatic access; app passwords could be restricted in the future |
| **No tracking** | No open/click tracking, no delivery receipts beyond SMTP response codes |

### Mitigation Strategies (Currently Implemented)

- Templates include unique Request IDs for tracking
- Plain-text alternatives improve deliverability
- Legal language (CCPA/GDPR citations) helps avoid spam classification
- Follow-up templates for non-responsive brokers

### Mitigation Strategies (Recommended Future)

- Add configurable delays between sends (e.g., 30-60 second intervals) to avoid triggering rate limits
- Randomize send times slightly so the pattern doesn't look automated
- Log SMTP response codes to detect soft bounces and throttling

## Upgrade Path: Transactional Email Services

When Gmail limits become a problem, the architecture supports swapping SMTP providers with zero code changes — just update `.env`:

### Recommended Alternatives

| Provider | Free Tier | Best For |
|----------|-----------|----------|
| **Postmark** | 100 emails/month | Best deliverability, designed for transactional email |
| **SendGrid** | 100 emails/day | Good balance of free tier + features |
| **Amazon SES** | 62,000/month (from EC2) | Cheapest at scale, more setup required |
| **Mailgun** | 100 emails/day (trial) | Good API, reliable deliverability |

### Configuration Example (SendGrid)

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your-sendgrid-api-key
```

No code changes needed — Nodemailer handles any standard SMTP server.

## IMAP Inbox Monitoring

The inbox monitoring system (currently stubbed) will:

1. Poll the configured IMAP inbox on a cron schedule
2. Filter for emails from known broker domains
3. Use Claude AI to classify responses (confirmation, rejection, request for more info, etc.)
4. Update broker record status in the state machine

This works with Gmail IMAP and would work with any IMAP provider. Gmail's IMAP is reliable for this use case since polling frequency is low (every 5 minutes default).

### Gmail IMAP Setup

Same app password works for both SMTP and IMAP:

```env
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=your-email@gmail.com
IMAP_PASS=your-app-password
```

## Key Design Decision

Email is intentionally a **secondary** removal method. The primary path is web-based opt-out forms via Playwright browser automation. Email is used when:

- The broker only accepts email-based removal requests
- A web form submission needs legal reinforcement
- Follow-up is needed after a form-based request goes unanswered

This means Gmail's sending limits are unlikely to be the bottleneck — most removals happen through browser automation, not email.
