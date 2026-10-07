# Contributing

## Setup

```bash
npm install
npm run build
```

Node `>=20.19.0`; `.nvmrc` pins the development version.

## Before you push

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
```

All four must pass. A failing lint or type error is not merged with a follow-up
promise attached.

## Making a change

Read the surrounding code first, then make the smallest clean change that
works. Specifically: check whether the helper you are about to write already
exists, and whether the pattern you are about to introduce contradicts one
already in use. Rewriting working code because it is not how you would have
written it is not a contribution.

Do not add a dependency that a few lines of code would cover.

## Standards

- TypeScript strict; `any` is a lint error
- Business logic in services, not React components
- Chrome APIs behind a service, never called from a component
- Comments explain **why**. The code already says what
- No magic numbers or strings; name them
- New contract between extension and backend goes in `@devflow/shared`

## Commits

Conventional Commits:

```
feat(extension): capture unhandled promise rejections
fix(server): reject oversized context payloads
refactor(shared): split messaging contract from api envelope
test(server): cover refresh token rotation
docs(security): document redaction rules
chore: bump typescript
```

Scopes: `extension`, `server`, `shared`, or omitted for repo-wide changes.

Keep commits focused. One logical change per commit.

## Tests

Logic with a branch, a loop, a parser, or anything on a security or money path
ships with a test. Trivial pass-throughs do not need one.

Flows that must always have coverage once they exist: login, token refresh,
error capture, API inspection, AI analysis, knowledge create and search,
permission handling, and sensitive-data redaction.

## Documentation

`README.md`, `ARCHITECTURE.md`, `SECURITY.md` and `API.md` describe what is
built. If a change makes one of them wrong, fix it in the same commit. Do not
document a feature that does not exist; mark planned work as planned.
