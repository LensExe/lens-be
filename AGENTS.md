# Repository Guidelines

## Project Structure & Module Organization

This is a pnpm-managed NestJS and TypeScript monorepo. `apps/core` hosts the HTTP API, `apps/cli` contains command-line tasks, and `apps/ai-worker` runs background AI work. In `src/`, `features/` wires controllers, DTOs, modules, and workers; `modules/` holds domain and application code grouped by context; `shared/` contains contracts, database entities, integrations, and platform services. Add domain behavior to its context, and keep cross-context dependencies behind ports. Tests live in `test/`; SQL changes belong in `migrations/` (AI database migrations are under `migrations/ai/`), and operational documentation belongs in `docs/`.

## Build, Test, and Development Commands

- `pnpm install` installs the locked dependencies.
- `pnpm start:dev` runs the core app with watch mode; `pnpm start:ai-worker:dev` runs the AI worker.
- `pnpm build` builds the core app; `pnpm build:all` builds all Nest apps.
- `pnpm typecheck` checks TypeScript without emitting files.
- `pnpm test` runs unit and domain-boundary tests; `pnpm test:openapi` checks the OpenAPI contract. `pnpm test:integration` requires a separate test database.
- `pnpm lint` runs ESLint with automatic fixes; `pnpm format` applies Prettier to app and source TypeScript.

## Coding Style & Naming Conventions

Use TypeScript with the repository's Prettier and ESLint configuration. Match nearby code, use two-space indentation, and keep filenames kebab-case (for example, `booking.use-case.ts` or `calendar-block.test.ts`). Domain contexts commonly separate `*.domain.ts`, `*.use-case.ts`, `*.command.ts`, and `*.query.ts`. Prefer explicit contracts and keep HTTP DTO concerns in `src/features/api/` rather than domain modules.

## Testing Guidelines

Add focused tests under `test/` named `*.test.ts`; tests use `node:test` and `node:assert`. Cover domain rules and boundary behavior with clear behavior-oriented test names. Run `pnpm test` for the suite and `pnpm test:openapi` when API routes or schemas change. Integration tests need a disposable `lens_test` database configured with `LENS_TEST_DATABASE_URL`.

## Commit & Pull Request Guidelines

Recent history follows Conventional Commit prefixes, such as `feat:`, `fix(types):`, `test(kong):`, and `chore(deploy):`. Use a short imperative summary and an optional scope. PRs should explain the change and its user or domain impact, link relevant issues, note API or migration effects, and list validation commands run. Include request/response examples for API changes when useful.

## Security & Configuration

Use local environment files for credentials and never commit secrets. Review SQL migrations and seed scripts before applying them; remote seeding requires explicit opt-in flags.
