#!/usr/bin/env bash
#
# Post-merge stability pass for this week's features.
#
# Modes:
#   ./scripts/smoke-recent-features.sh              # print manual checklist + unit tests
#   ./scripts/smoke-recent-features.sh --e2e        # also run Playwright (needs stack)
#   ./scripts/smoke-recent-features.sh --e2e-full   # docker up + seed + full suite + down
#   ./scripts/smoke-recent-features.sh --unit-only  # vitest only
#
# Manual checks need a logged-in browser on the env you care about (local or
# staging). Automated coverage is controls/DOM only — Mapbox pixels are eyes-on.
set -euo pipefail

cd "$(dirname "$0")/.."

MODE="${1:-}"

print_manual() {
  cat <<'EOF'
══════════════════════════════════════════════════════════════════
 MANUAL SMOKE — recent merges (map / scope / insights / ground)
══════════════════════════════════════════════════════════════════

Prep
  [ ] Log in as analyst (global / unscoped team) AND as a country-scoped team
  [ ] Hard-refresh /map once with DevTools → Application → Session Storage cleared
      (stale map-view camera can mask the All Countries default)

1. Map — All Countries → global view  (bugfix: Sahel/Mali crop)
  [ ] Unscoped team → /map with Country = All Countries
  [ ] First paint is a globe / world frame (zoom ~1.6), NOT zoomed into Mali/Niger/Sahel
  [ ] Pick Sudan → frames Sudan; switch back to All Countries → returns to world frame
  [ ] Scoped team → Country pinned (no All Countries); frames that country only

2. Map — this week's map polish
  [ ] Unclustered pins show type glyphs (Signals icon pack)
  [ ] Marker Location labels fill via ancestor tree (not blank)
  [ ] Topography basemap: tilt hint once, pitch works, far-zoom a11y ok
  [ ] Satellite A/B chip (Sudan): Mapbox ↔ Esri switches without blanking the map
  [ ] Create/update a signal → pin appears/moves without full page reload (realtime)

3. Team country scope
  [ ] Dashboard / Detection / Insights frame on the team country (not hard-coded Sudan)
  [ ] Onboarding phone country defaults to team scope
  [ ] INFORM / Venezuela resolve without falling back to Sudan center

4. Insights — Situation analysis
  [ ] /insights → Situation tab loads Overview / Sectors / Sources
  [ ] Country switcher respects team scope (or all countries if global)
  [ ] KPIs ≤ 4, INFORM severity tooltip, numbered Sources list
  [ ] What-changed strip + 1-week comparison when pipeline has data
  [ ] Evidence-scope chip + per-section change strips render

5. Detection — Ground Intel + History
  [ ] Ground tab: list, classification chips, source chips/badges
  [ ] Thread drawer: correction chain + lifecycle badges
  [ ] Hover help on review actions; analyst can reject/approve (role gate)
  [ ] Viewer cannot see Ground Intel
  [ ] History tab: filter chips are opt-in (nothing selected = show all)

6. Regression quick hits
  [ ] /detection Events/Signals/Alerts tabs still load
  [ ] Login / logout
  [ ] Promote alert + create crisis still work on seeded events (if using e2e seed)

══════════════════════════════════════════════════════════════════
 AUTOMATED
══════════════════════════════════════════════════════════════════
  Unit:  bun run test -- src/lib/constants/country-config.test.ts
  E2E:   bun run test:e2e -- e2e/tests/11-recent-features-smoke.spec.ts
         (stack up: bun run e2e:up && bun run e2e:seed)
  Full:  bun run e2e
EOF
}

run_unit() {
  echo "── unit: WORLD_VIEW / country-config ──"
  bun run test -- src/lib/constants/country-config.test.ts
}

run_e2e_recent() {
  echo "── e2e: recent-features smoke (case 11) + ground + map layers ──"
  bunx playwright test \
    e2e/tests/09-map-layers.spec.ts \
    e2e/tests/10-ground-intel.spec.ts \
    e2e/tests/11-recent-features-smoke.spec.ts
}

print_manual

case "$MODE" in
  --unit-only)
    run_unit
    ;;
  --e2e)
    run_unit
    run_e2e_recent
    ;;
  --e2e-full)
    run_unit
    echo "── full hermetic e2e suite ──"
    bun run e2e
    ;;
  "")
    run_unit
    echo
    echo "Tip: re-run with --e2e (stack already up) or --e2e-full (docker up+seed+suite)."
    ;;
  *)
    echo "Unknown mode: $MODE" >&2
    echo "Use: (default) | --unit-only | --e2e | --e2e-full" >&2
    exit 1
    ;;
esac
