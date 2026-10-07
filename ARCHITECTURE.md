# Architecture

Describes what exists plus the boundaries later phases must respect. Sections
marked **Planned** are not implemented.

## Repository layout

npm workspaces monorepo.

```
devflow-ai/
├── packages/
│   ├── shared/      # wire contracts used by both sides (exists)
│   ├── extension/   # Chrome MV3 extension (exists)
│   └── server/      # Node backend (Phase 5)
├── tsconfig.base.json
├── tsconfig.json    # solution file, project references
└── eslint.config.js
```

### Why a monorepo

The extension and the backend exchange typed payloads. Split repositories force
either a published types package or copy-paste drift, and drift between a
client and its server is the defect class that is hardest to catch in review.
Workspaces are built into npm, so this costs no extra tooling.

### Why `@devflow/shared` carries only contracts

It is imported by a browser bundle _and_ by Node. Anything with a runtime
dependency on one environment (DOM APIs, `node:` builtins, Chrome APIs) belongs
in the package that owns that environment, not here. Keeping `shared`
environment-neutral is what makes it safe for both.

## The response envelope

`ApiResponse<T>` is a discriminated union used at **every** boundary — HTTP
responses and `chrome.runtime` messages alike:

```ts
{ success: true,  data: T }
{ success: false, error: { code, message, details? } }
```

One shape means callers have one error-handling path. `ErrorCode` is a closed
set, so a caller can branch exhaustively and the compiler catches a missed case
when the set grows.

`details` carries safe context only. Stack traces, upstream provider responses,
and SQL errors never cross this boundary — see SECURITY.md.

## Extension messaging

`DevFlowRequest` is a discriminated union of every message that can cross
contexts; `DevFlowResultMap` maps each `type` to its success payload;
`ResponseFor<T>` joins them through the envelope.

Adding a message is two edits in `packages/shared/src/messaging.ts`. The
compiler then forces the sender and the router to agree. The alternative — ad
hoc object literals passed to `chrome.runtime.sendMessage` — is untyped on both
ends, which is where extension bugs hide.

## Extension process model

Four contexts, each with one job:

| Context        | Owns                                                              | State   |
| -------------- | ----------------------------------------------------------------- | ------- |
| Content script | Page-world observation. Minimum privilege, treats page as hostile | Exists  |
| Service worker | Message routing, backend calls, token custody                     | Exists  |
| Side panel     | Primary UI                                                        | Shell   |
| DevTools page  | Network panel access                                              | Phase 7 |

Rules that follow: React components call services, never Chrome APIs directly.
The service worker is the only context holding credentials. The content script
never talks to the backend.

### Injection over declaration

There is no `content_scripts` block in the manifest and no host permission. The
content script is injected by `chrome.scripting` against `activeTab`, which is
granted only when the user invokes the extension on a tab.

A declared content script on `<all_urls>` would run on every page the user
visits for the life of the install. Injection on user action gives the same
capability with a permission the user can reason about, and it is what makes the
privacy claims in SECURITY.md true rather than aspirational.

The cost is that the script must be re-injected per tab and guard against
double-registration, which it does with a window flag.

### Build

Two Vite passes. The pages and the service worker build as ES modules; the
content script builds separately as a single IIFE, because `chrome.scripting`
runs it as a classic script and an ESM chunk graph would not load.

## Backend — Planned (Phase 5+)

Node + TypeScript + Express, Postgres via Prisma, Redis for rate limiting and
caching. Layered: route → validation → service → repository. Business logic
lives in services, so it is testable without HTTP.

### Why Express over NestJS

NestJS pays for itself on large teams with deep module graphs. For this
surface, its decorator/DI layer is cost without return. Express with explicit
composition and Zod validation stays legible and leaves the door open to swap
the HTTP layer later, because services will not depend on it.

## AI layer — Planned (Phase 6+)

Business logic depends on an `AIService` interface, never on the OpenAI SDK.
The SDK appears in exactly one adapter module. Structured outputs are validated
against a schema before use; a model response that fails validation is an error,
not data.

## Data flow for any AI request — Planned

```
User action → context collection → sanitization → user-visible preview → backend → model
```

Sanitization runs before the preview, so what the user sees is what is actually
sent. There is no path from page content to the model that skips a user action.

## Decision log

| Decision                            | Rationale                                                |
| ----------------------------------- | -------------------------------------------------------- |
| npm workspaces monorepo             | Shared wire types; no extra tooling                      |
| Contracts-only `shared` package     | Imported by both browser and Node                        |
| One envelope for HTTP and messaging | One error path in callers                                |
| Express over NestJS                 | Simplest thing that supports the roadmap                 |
| TS project references               | Incremental builds; enforces the dependency direction    |
| Side panel as primary UI            | Debugging needs persistent surface; popups close on blur |
