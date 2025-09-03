# Repository Guidelines

## Project Structure & Module Organization
- Root (Expo React Native app): `App.tsx`, `index.js`, `app.json`, `metro.config.js`, `.env`.
- Admin Panel (Next.js + Tailwind): `admin-panel/` with its own `package.json`, `tsconfig.json`, `.env.local`.
- Config & Docs: setup guides (`*.md`), SQL migrations (`*.sql`), deployment scripts (`*.sh`).
- Use scopes in commits/PRs: `mobile` (root) and `admin` (`admin-panel/`).

## Build, Test, and Development Commands
- Mobile install: `pnpm install` (run at repo root).
- Mobile dev: `pnpm start` (Expo), or `pnpm android` / `pnpm ios` / `pnpm web`.
- Mobile with env: `pnpm start:env` (loads variables from `.env`).
- Admin install: `cd admin-panel && pnpm install`.
- Admin dev: `pnpm dev`; build: `pnpm build`; start: `pnpm start`; lint: `pnpm lint`.
- If not using `pnpm`, substitute `npm run <script>` or `yarn <script>`.

## Coding Style & Naming Conventions
- Language: TypeScript preferred; 2-space indentation; UTF-8; LF line endings.
- Components: `PascalCase.tsx`; utilities: `camelCase.ts`.
- Env vars: `UPPER_SNAKE_CASE` in `.env` and `admin-panel/.env.local`.
- Linting: `admin-panel` uses Next/ESLint via `pnpm lint`. Fix issues before PRs.

## Testing Guidelines
- No global test runner yet.
- Mobile: validate flows in Expo (Android/iOS/web) and check console warnings.
- Admin: run `pnpm dev` and verify key pages, forms, and API calls.
- If adding tests, prefer Jest + React Testing Library (`admin-panel`) and Jest Expo (mobile). Name files `*.test.ts`/`*.test.tsx`.

## Commit & Pull Request Guidelines
- Commits: Conventional Commits, e.g., `feat(mobile): add courier tracking`, `fix(admin): handle auth redirect`).
- PRs: include a clear description, linked issue(s), screenshots/GIFs for UI changes, and notes on env/config changes.
- Keep PRs focused and small; include any SQL or script updates when relevant.

## Security & Configuration Tips
- Never commit secrets. Use `.env` (root) and `admin-panel/.env.local`.
- Scripts like `deploy-google-maps-proxy.sh` and `deploy-edge-function.sh` assume configured credentials.
- Review SQL scripts before applying to shared databases.

