# API

**No endpoint is implemented.** The backend lands in Phase 5. This document
fixes the contract that `@devflow/shared` already encodes, so the extension and
the server cannot disagree about shape once routes exist.

## Base

```
/api/v1
```

Versioned from the first endpoint. A breaking change ships as `/api/v2`
alongside `/api/v1`, never as a mutation of a live contract.

## Response envelope

Every response, success or failure, uses the shape exported by
`@devflow/shared` as `ApiResponse<T>`.

Success:

```json
{ "success": true, "data": {} }
```

Failure:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Invalid request" }
}
```

`error.details` is optional and carries safe context only — which field failed,
not why the database rejected it.

## Error codes

Defined in `packages/shared/src/api.ts`. The set is closed; clients may branch
exhaustively.

| Code               | HTTP | Meaning                                    |
| ------------------ | ---- | ------------------------------------------ |
| `VALIDATION_ERROR` | 400  | Request failed schema validation           |
| `UNAUTHORIZED`     | 401  | Missing or invalid credentials             |
| `FORBIDDEN`        | 403  | Authenticated, not permitted               |
| `NOT_FOUND`        | 404  | Resource does not exist or is not visible  |
| `RATE_LIMITED`     | 429  | Quota exceeded                             |
| `UPSTREAM_ERROR`   | 502  | A dependency failed (model provider, etc.) |
| `TIMEOUT`          | 504  | Operation exceeded its deadline            |
| `INTERNAL_ERROR`   | 500  | Unhandled failure; details never exposed   |

## Planned route groups

Documented here so the surface is reviewable before it is built. Each lands in
the phase shown, and this file is updated with real request and response bodies
at that point — not before.

| Group                   | Phase | Purpose                           |
| ----------------------- | ----- | --------------------------------- |
| `/api/v1/auth`          | 9     | Register, login, refresh, logout  |
| `/api/v1/users`         | 9     | Profile and settings              |
| `/api/v1/ai`            | 6     | Error analysis, explain, generate |
| `/api/v1/conversations` | 6     | Chat threads and messages         |
| `/api/v1/knowledge`     | 10    | Knowledge items, search           |
| `/api/v1/integrations`  | 12    | GitHub, Jira                      |

## Conventions

- Authentication: `Authorization: Bearer <access token>` — Phase 9
- Request IDs: `X-Request-Id`, echoed on every response
- Rate limits: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`
- Pagination: cursor-based, `?cursor=&limit=`; `limit` is capped server-side
- Timestamps: ISO 8601, UTC
