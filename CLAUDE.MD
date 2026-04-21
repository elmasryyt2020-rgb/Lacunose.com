# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This repo contains three things that should not be confused:

- [lacunose/](lacunose/) — the actual shippable product: an Expo / React Native app (TypeScript). This is where day-to-day code changes happen.
- [research gap finder (3)/](research%20gap%20finder%20%283%29/) — standalone HTML/JSX design mockups (`design-canvas.jsx`, `ios-frame.jsx`, static HTML). These are reference-only artifacts from the design phase and are not wired into the RN app's build. Do not import from here.
- [implementation-plan.md](implementation-plan.md) — the client-facing product/architecture plan. Treat as product context, not a spec for the current codebase (notably, the plan proposes JavaScript + a Supabase/VPS backend; the actual app is TypeScript and currently has no backend — all data is mocked).

Note: [implementation-plan.md](implementation-plan.md) says "JavaScript, not TypeScript" and "self-hosted Supabase backend." Neither is true of the code today. The Expo app is TypeScript with strict mode and every screen renders hardcoded mock data. The plan describes a future state; the code is at the UI-first phase.

## Working in the Expo app

All commands run from inside [lacunose/](lacunose/), not the repo root.

```bash
cd lacunose
npm install          # first time only
npx expo start       # or: npm run start
npm run ios          # expo start --ios
npm run android      # expo start --android
npm run web          # expo start --web
npm run lint         # expo lint (flat config in eslint.config.js)
```

There is no test runner configured and no build/CI script. `expo lint` and the TypeScript compiler (via the editor / `tsc --noEmit`) are the only static checks.

`npm run reset-project` runs [scripts/reset-project.js](lacunose/scripts/reset-project.js) which **moves `app/`, `components/`, `hooks/`, `constants/`, `scripts/` into `app-example/` and scaffolds a blank `app/`**. Never run this unless the user explicitly asks for a full reset — it will hide all current work.

## Architecture

### Routing (expo-router, file-based)

The root stack is [app/_layout.tsx](lacunose/app/_layout.tsx). Screens are declared explicitly there rather than auto-discovered, so adding a new top-level route means editing both the file and the `<Stack.Screen>` list. Routes today:

- `index` → [app/index.tsx](lacunose/app/index.tsx) — get-started landing
- `onboarding`, `sign-up`, `sign-in`, `privacy`, `terms` — pre-auth flow
- `(tabs)` — the authenticated shell, with its own layout at [app/(tabs)/_layout.tsx](lacunose/app/(tabs)/_layout.tsx). Tabs: `home`, `library`, `analyze`, `me`. The tab bar is a custom floating pill (`FloatingNav`) that replaces the default `<Tabs>` bar — icons are resolved by `route.name`, so renaming a tab file silently breaks its icon.
- `analyze/results`, `analyze/detail` — pushed from the Analyze flow
- `paywall` — presented as a modal (`presentation: 'modal'`)

`typedRoutes` and `reactCompiler` are both enabled in [app.json](lacunose/app.json). Path alias `@/*` maps to the project root (see [tsconfig.json](lacunose/tsconfig.json)), though most existing code uses relative imports.

### Theme and shared primitives

All visual styling goes through two files:

- [constants/theme.ts](lacunose/constants/theme.ts) exports a single `RGF` object: color tokens (`bg`, `ink`, pastel category palette `mint`/`lavender`/`butter`/`peach`/`sky`/`rose`/`sage`) **and** font-family tokens (`display`, `sans`, `sansMedium`, `sansSemiBold`, `mono`). Reference tokens by name — don't hardcode hex values or font strings in screens.
- [components/Shared.tsx](lacunose/components/Shared.tsx) provides the design-system primitives used across screens: `Icon` (inline SVG icon set, all names are string literals inside a `switch` — see the file for the full list), `BlackPill`, `ChipIcon`, `ScoreDial`, `CategoryPill`. To add a new icon, add a `case` to the `switch` in `Icon`; don't pull in a separate icon library.

Fonts are loaded via `@expo-google-fonts/*` in [app/_layout.tsx](lacunose/app/_layout.tsx) and the splash screen is held until they resolve. Adding a new font variant requires loading it there or it will silently fall back.

### Data model

There is no backend, no API client, and no state management library. Every screen defines its mock data inline (e.g. the `recent` array in [app/(tabs)/home.tsx](lacunose/app/(tabs)/home.tsx)). When real data is introduced, expect to add a fetching layer and replace those inline arrays — the product plan in [implementation-plan.md](implementation-plan.md) targets self-hosted Supabase, but nothing in the app assumes it yet.

### New Architecture

`newArchEnabled: true` in [app.json](lacunose/app.json). Reanimated v4 + `react-native-worklets` are in use. Keep this in mind when picking dependencies — some older RN libs still don't support the new arch.

## Conventions worth matching

- TypeScript strict mode is on. Prefer explicit prop types on exported components; loose `any` is tolerated only in the `FloatingNav` navigation prop shim.
- Styling uses `StyleSheet.create` for layout-heavy screens and inline style objects for one-off text — both patterns coexist; follow whatever the neighboring file does.
- Screens are default-exported functions named `ScreenX` (e.g. `ScreenHome`, `ScreenGetStarted`). Sub-components live in the same file unless they're reused.
