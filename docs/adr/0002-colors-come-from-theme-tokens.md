---
status: accepted
---

# Colors come from theme tokens; components never hardcode hex

## Context

CLEAR already has a complete, adaptive theming system. [globals.css](../../src/styles/globals.css)
defines `--color-*` tokens and **redefines every one of them** under
`[data-mantine-color-scheme="dark"]`, so any consumer of a token adapts to light/dark for
free. The app default is `defaultColorScheme="auto"` ([layout.tsx](../../src/app/layout.tsx)),
so a user whose OS is in dark mode gets the dark palette. Imperative/canvas surfaces that CSS
variables cannot reach (Mapbox) are bridged through the `useIsDark`
([use-is-dark.ts](../../src/hooks/use-is-dark.ts)) hook.

Despite this, the accept-invite page rendered unusably in dark mode: black labels on a dark
card, a washed-out light-grey info box. The cause was not a missing dark theme — it was the
page **bypassing the token system** with hardcoded light-mode hex (`#171717` labels,
`#F5F5F5` card, `#737373` text). An audit found this pattern is app-wide: ~881 hex literals,
~263 of them in color props, and ~150 of those are `#E85D3D` written out longhand where
`var(--color-accent)` (the same value, already a token) belongs.

Two facts make this acute on **pre-login pages** (accept-invite, login, signup, forgot/reset
password, verify-email): there is **no color-scheme toggle before login**, so the user cannot
work around a broken page; and the audit is large enough that a single sweep would be
unreviewable.

## Decision

**Every color in a component comes from the theme system, never from a literal hex.**
Concretely, four populations and one rule each:

1. **Neutral chrome** (text, borders, backgrounds, surfaces, labels) — MUST use an adaptive
   `--color-*` token. A hardcoded chrome hex is a defect. Nearly every literal already has a
   matching token (e.g. `#F5F5F5` → `var(--color-bg-muted)`, which is dark-overridden to
   `#222222`).
2. **Semantic color** (meaning-encoding: critical, warning, success, info, ai, accent/brand)
   — MUST use the corresponding semantic token (`--color-critical`, `--color-accent`, …).
   These tokens are themselves dark-tuned for contrast (`#DC2626` → `#F87171`), so the
   *meaning* is constant across themes while the *hex* may differ.
3. **Fixed color** (a literal that is intentionally identical in both themes AND has no
   semantic token — e.g. region colors, chart series) — allowed, but MUST live in one named
   palette module, not scattered as literals across components.
4. **Canvas / imperative color** (Mapbox, WebGL, Chart.js) — allowed to read hex in JS, but
   ONLY by branching on the `useIsDark` color-scheme bridge. This is the single sanctioned
   place to switch colors in JavaScript.

**Pre-login pages get full theme support** (they respect the OS-resolved scheme), not a forced
single scheme — matching `defaultColorScheme="auto"` and the in-app experience.

**Rollout is phased, guardrailed against regression:**
- **PR1** — convert all pre-login pages to tokens (fixes the reported bug end-to-end).
- **PR2** — create the ESLint config (none exists today) with a rule banning hex literals in
  `style` / `styles` / `c` / `bg` / `color` props, so semantic and fixed colors satisfy it by
  being *named references*, not literals; canvas hex is exempt via the bridge.
- **PR3+** — burn down the remaining surfaces (dashboard, detection, cash, knowledge, …) area
  by area, now that the guardrail stops new violations.

## Considered options

- **Force pre-login pages to a single (light) scheme.** Rejected: ignores users who prefer
  dark and diverges from the themed in-app experience; the framing of the bug was "no full
  dark/light implementation", i.e. make it work, not pin it.
- **Tokenize every color, including semantic and fixed ones, with per-theme variants.**
  Rejected as the default: over-tokenizes colors whose meaning is theme-independent (region
  codes, chart series) and maximizes churn. Semantic colors that *do* benefit from contrast
  tuning already have dark variants in `globals.css`.
- **One big-bang sweep of all ~263 color-prop literals.** Rejected: an unreviewable diff with
  real regression risk. The phased + lint approach ships the user-visible fix immediately and
  prevents new violations while the tail is cleaned up.
- **Fix only accept-invite.** Rejected: the same pattern breaks the sibling pre-login pages
  the next time someone opens them in dark mode.

## Consequences

- The reported dark-mode bug is fixed at the root, not patched per-field.
- After PR2, a hardcoded chrome hex fails lint — the bug class cannot silently return.
- A new "fixed color" must be added to the palette module, not inline — a small, deliberate
  friction that keeps colors centralized.
- Canvas code must go through `useIsDark`; this is already the established pattern
  ([crisis-map.tsx](../../src/components/map/crisis-map.tsx)).
- The `--color-accent` consolidation removes ~150 stray `#E85D3D` literals, so a future brand
  tweak is a one-line token change.

## Revisit when

A design-system or Mantine-theme overhaul changes how tokens are defined, or if a third color
scheme (e.g. high-contrast) is introduced — at which point the "fixed color" population may
need to become tokens after all.
