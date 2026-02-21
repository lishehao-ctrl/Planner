# One-Screen Day — Stage Progress

Last updated: 2026-02-21

## Project Status
Current stage: **Step 4 completed** (state layer wired with persistence).  
UI is still placeholder-level and not yet wired to interactive actions.

## Completed

### Step 1 — Scaffold
- Vite + React + TypeScript + Tailwind + Router + Zustand + Dexie + Vitest/RTL + ESLint/Prettier
- Routes:
  - `/` Today placeholder
  - `/settings` Settings placeholder
- Base project scripts working:
  - `npm run dev`
  - `npm run test`
  - `npm run lint`

### Step 2 — Domain Logic
- Added strong domain models in `src/domain/types.ts`
- Added pure time helpers in `src/domain/time.ts`
- Added planning logic in `src/domain/plan.ts`:
  - `generateActionChain`
  - `applyCommuteRule`
  - `shiftRemainingSegments`
  - `getNextAction`
- Added tests in `src/domain/plan.test.ts`

### Step 3 — Storage (Dexie)
- Added Dexie schema in `src/storage/db.ts`:
  - `commuteRules`
  - `dayPlans`
- Added DB types in `src/storage/types.ts`
- Added domain <-> DB mappers in `src/storage/mapper.ts`
- Added repo CRUD + seed in `src/storage/repo.ts`:
  - `loadCommuteRules`, `upsertCommuteRule`, `deleteCommuteRule`
  - `loadDayPlan`, `saveDayPlan`, `ensureSeeded`
- Added storage tests in `src/storage/repo.test.ts`
- Added `fake-indexeddb` for test environment setup

### Step 4 — Zustand Store Wiring
- Implemented real planner store in `src/state/store.ts` with:
  - State:
    - `mode`, `todayISO`, `isLoading`, `error`
    - `commuteRules`, `activeRuleId`, `dayPlan`
  - Actions:
    - `init`
    - `setMode`
    - `setActiveRule`
    - `markDone`
    - `markSkipped`
    - `toggleLock`
    - `shift`
    - `regenerateToday`
- Added local date helper:
  - `src/state/localDate.ts` (`getLocalDateISO`)
- Added state tests:
  - `src/state/store.test.ts`
  - covers init, persisted markDone, locked-segment shift behavior

### Security Hardening (Toolchain)
- Upgraded lint toolchain to align with security fixes:
  - `eslint` -> `^10.0.1`
  - `@eslint/js` -> `^10.0.1`
  - `typescript-eslint` -> `^8.56.0`
  - `eslint-plugin-react-hooks` -> `7.1.0-canary-ab18f33d-20260220`
  - `eslint-plugin-react-refresh` -> `^0.5.0`
- Added targeted `overrides` in `package.json` for `minimatch` to address advisory chain:
  - `@typescript-eslint/typescript-estree > minimatch = 10.2.2`
  - `@eslint/config-array > minimatch = 10.2.2`
  - `@eslint/eslintrc > minimatch = 10.2.2`
- Security check status after reinstall:
  - `npm audit --omit=dev` -> `found 0 vulnerabilities`
  - `npm audit` -> `found 0 vulnerabilities`

## Current Test Status
Latest local run:
- `npm run test` -> PASS
- Test files: 4
- Tests: 10 passed

## Not Done Yet (Next Stage)
- Wire store actions/state to UI components/pages
- Replace placeholders with interactive timeline/action controls
- Add end-to-end user flows (done/skip/shift/lock from UI)

## Quick Run
```bash
npm install
npm run dev
npm run test
npm run lint
```
