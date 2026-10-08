# Changelog

All notable changes to `api-insight-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-10-08

### Fixed

- **No more double-logging of thrown errors.** When both `createMiddleware` and
  `createErrorMiddleware` are mounted, a thrown error was captured twice (once by
  the error middleware with its stack trace, and again by the response-finish
  handler). The error middleware now marks the response so the finish handler
  skips it — each failed request produces exactly one log.

## [1.1.0] - 2026-09-29

### Added

- **Full-traffic capture** — `createMiddleware` now records **every** request
  (success + failure) by default, so the dashboard can report total calls,
  success/failure counts, success rate, and unique IPs.
- **`MiddlewareOptions`** — `createMiddleware(client, options)`:
  - `errorsOnly` (default `false`) — restore the previous errors-only behaviour.
  - `ignorePaths` — skip paths like `['/health', '/metrics']`.

### Changed

- On the happy path, only lightweight fields are sent (endpoint, method, status,
  duration, IP, user agent). Request/response bodies and error messages are
  captured for failures (4xx/5xx) only — keeps success logs small and avoids
  capturing sensitive payloads.

## [1.0.0] - 2025-03-19

### Added

- **`ApiInsightClient`** — Core client with `sendLog()` (fire-and-forget) and `sendLogAsync()` (awaitable)
- **`createMiddleware()`** — Express middleware that automatically captures all 4xx/5xx responses
- **`createErrorMiddleware()`** — Express error middleware that captures unhandled thrown errors with stack traces
- **TypeScript types** — Full type definitions for `LogPayload` and `ApiInsightConfig`
- **Configurable options** — `apiKey`, `host`, `timeout`, `debug`
- **Zero overhead on happy paths** — Only activates on error responses (status >= 400)
- **Fire-and-forget design** — `sendLog()` never throws, never blocks the response path
- **Framework recipes** — Documentation for Express, Fastify, NestJS, and Next.js
