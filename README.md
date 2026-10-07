# DevFlow AI

AI-powered developer productivity and debugging Chrome extension. Captures the
technical context of the page you are on (console errors, network calls, selected
code) and turns it into actionable debugging help, without shipping your
credentials to a model.

## Status

Phase 2 of 14. The extension loads in Chrome and proves the message pipeline end
to end. **No product feature is implemented yet.** See [Roadmap](#roadmap).

What exists today:

| Package              | State                                                             |
| -------------------- | ----------------------------------------------------------------- |
| `@devflow/shared`    | Built. API envelope, error codes, extension message contract.     |
| `@devflow/extension` | Loads in Chrome. Side panel shell, typed router, ping round-trip. |
| `server`             | Not created (Phase 5).                                            |

## Requirements

- Node `>=20.19.0` (repo is developed on 24; see `.nvmrc`)
- npm 11+ (workspaces)
- Docker, for Postgres and Redis from Phase 5 onward

## Setup

```bash
npm install
npm run build
```

## Loading the extension

```bash
npm run build          # or: npm run dev  (rebuilds on change)
```

Then in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `packages/extension/dist`
4. Click the DevFlow icon in the toolbar — the side panel opens

Press **Check active page** in the panel. It injects the content script into the
active tab and reports the URL back through the shared response envelope. On a
`chrome://` page it returns `FORBIDDEN`, which is the expected result, not a bug.

`npm run dev` rebuilds on save. Chrome does not hot-reload extensions: press the
reload button on the card in `chrome://extensions`, then reopen the side panel.

## Scripts

| Command                | Does                                              |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Rebuilds the extension on change                  |
| `npm run build`        | Builds `shared`, then the extension               |
| `npm run typecheck`    | `tsc --build` across the project references graph |
| `npm run lint`         | ESLint, type-aware, across the repo               |
| `npm run format:check` | Prettier verification                             |
| `npm test`             | Per-workspace tests (none exist yet)              |
| `npm run clean`        | Removes build output and `.tsbuildinfo`           |

## Testing

```bash
npm test                              # unit tests
npm run build && npm run test:e2e -w @devflow/extension
```

The end-to-end check drives real Chrome: it installs the built extension, waits
for the service worker, renders the side panel and completes a ping round trip
through the content script. It needs a display and is excluded from `npm test`.

Chrome 137 and later ignore `--load-extension`, so the test installs the
extension over the DevTools protocol instead.

## Roadmap

Phases are built in order; each one leaves the repo in a working state.

1. **Architecture + repository setup** — done
2. **Chrome extension foundation (MV3, Vite, React)** — done
3. Side panel UI
4. Console error capture
5. Backend API
6. AI error analysis
7. Network/API inspector
8. Code assistant
9. Authentication
10. Knowledge base
11. RAG
12. GitHub / Jira integrations
13. Testing, security, performance
14. Docker + production deployment

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — boundaries and why they are where they are
- [SECURITY.md](./SECURITY.md) — threat model and the rules that follow from it
- [API.md](./API.md) — HTTP contract
- [CONTRIBUTING.md](./CONTRIBUTING.md) — workflow and standards

## License

MIT
