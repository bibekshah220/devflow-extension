# Security

DevFlow runs inside the browser, next to the user's authenticated sessions, and
sends data to a model provider. Both facts make it a higher-risk extension than
its feature list suggests. This document states the threat model and the rules
that follow.

Sections marked **Planned** describe controls that land with the phase named.

## Threat model

| Threat                  | Why it matters here                                                   |
| ----------------------- | --------------------------------------------------------------------- |
| Credential exfiltration | Captured network traffic contains `Authorization`, `Cookie`, API keys |
| Hostile page content    | A content script reads attacker-controlled DOM in the page's world    |
| Prompt injection        | Page text reaching a model can carry instructions                     |
| Over-broad permissions  | `<all_urls>` + `webRequest` is close to a browsing-history monitor    |
| XSS in extension UI     | Extension pages hold tokens; DOM injection there is a token theft     |
| Token leakage           | Tokens in `localStorage` or content scripts are reachable by the page |
| SSRF                    | A backend that fetches a user-supplied URL can reach internal hosts   |

## Rules in force now

**No dynamic code execution.** `eval()` and `new Function()` are banned and
enforced by `no-restricted-globals` / `no-restricted-syntax` in
`eslint.config.js`. MV3's CSP already forbids remote code; the lint rules catch
it at authoring time.

**No `any`.** `@typescript-eslint/no-explicit-any` is an error, and
`strictTypeChecked` is on. Validation gaps hide behind `any` more often than
behind a missing check.

**Errors do not leak internals.** `ApiErrorBody.details` is typed
`Record<string, unknown>` and documented as safe-context-only. Stack traces,
provider responses and database errors do not cross the envelope.

**No secrets in the repo.** `.env` is gitignored; only `.env.example` is
tracked.

## Rules for later phases

### Permissions — Phase 2

Request the minimum. `activeTab` over host permissions wherever the flow is
user-initiated. No host permission is added without a line in this document
saying which feature needs it. Optional permissions are requested at the moment
of use, not at install.

### Sensitive data — Phase 7

The network inspector must redact before anything leaves the browser.
Always-redacted: `Authorization`, `Cookie`, `Set-Cookie`, `Proxy-Authorization`,
`X-Api-Key`, and body fields matching password / token / secret / key patterns.
Redaction is applied to the copy shown in the UI as well, so the user's preview
is the truth about what is sent. Including a redacted value is an explicit,
per-request user action — never a setting that silently disables redaction.

### Token custody — Phase 9

Tokens live in the service worker and `chrome.storage.session`. Never
`localStorage`, never a content script, never a page-accessible surface. Short
access-token lifetime with refresh; refresh tokens rotate on use.

Passwords are hashed with Argon2id. Login is rate-limited per account and per
IP, with lockout on repeated failure.

### Page content — Phase 10

Nothing is collected without a user action. No background scraping, no history
collection, no automatic page capture. Extracted page text is treated as
untrusted input when it reaches a prompt: it is delimited and labelled as data,
and the system prompt states that content inside it is never an instruction.
Model output is rendered as text, never as HTML.

### Backend — Phase 5

Zod validation at every route boundary. Rate limiting per user and per IP.
Authorization checked per resource, not per route. Any feature that fetches a
user-supplied URL validates the resolved address against an allowlist and
rejects private ranges.

## Logging

Never logged: passwords, access tokens, refresh tokens, cookies, API keys, full
request bodies from captured traffic. Logs carry request ID, user ID, operation,
duration, status and error code.

## Reporting a vulnerability

Open a private security advisory on the repository. Do not open a public issue.
