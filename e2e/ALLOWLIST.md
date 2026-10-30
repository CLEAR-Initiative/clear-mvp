# Smoke allowlist

Scaffold, not a full inventory. One line per primary control this suite does not click, and one reason. Deferred catalog rows stay on the epic.

- Detection — "+ Connect Source": external. It is the hook for an outside feed, and this stack does not connect one.
- Map — Mapbox canvas and pins: WebGL-pixel-only. There is no map token, so this suite never asserts canvas pixels. Filter-bar position on reload is `e2e/tests/23-regression-catalog.spec.ts`.
- Map — Satellite and Topography: WebGL-pixel-only. The change is the canvas imagery. Boundaries and Population stay in `e2e/tests/09-map-layers.spec.ts`.
- Insights — evidence Download: external. The control opens the source file in a new tab.
- Crisis — "Delete crisis": destructive.
- Crisis — document "Remove": destructive.
- Observe — map centroid: screen no longer in the product. Observe has no map canvas; GPS capture, send, and the Signals list are clicked in `e2e/tests/12-observe-field-signals.spec.ts`.
- Auth — "Forgot password?": email-only. The reset link is delivered to an inbox this stack does not read.
- Auth — "Accept & Create Account": email-only. The invitation page is reached from an email link.
- Dashboard — NRC Core Activities titles (CLEAR-589): the hermetic seed cannot reach them. They render in the dashboard right panel only for a non-crisis NRC country. The seed's only country is Sudan, and Sudan shows crisis pins instead of those titles.
