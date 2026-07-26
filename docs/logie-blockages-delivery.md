# LogIE Blockages — delivery model (one clear-mvp PR)

## Why not two frontend PRs?

The spike smoke and the production map layer share the **same** paint path, tooltip,
label fallbacks, and slim GeoJSON contract. A second clear-mvp PR that “rewrites for
prod” would only confuse reviewers and force a re-test of the same UX.

| Repo / ticket | Role |
|---------------|------|
| **This PR / Expo #280** | clear-mvp: pull script, docs, ADR, map layer, **dev spike feed** |
| **Expo #317** (clear-api) | Persist LogIE + serve slim Blockages JSON |
| **Expo #277** | Flip data source to #317 + enable Blockages outside local spike — **not** a parallel FE rewrite |

## Ready-to-test now

```bash
npm run logie:spike          # writes scripts/logie/out/ (gitignored)
npm run dev
# /map → Layers → Blockages  (development; hint shows “spike”)
```

Contract: `src/lib/map/logie-blockages.ts`  
Fetch swap point: `src/lib/map/fetch-blockages.ts`  
API waitlist: `docs/clear-api-logie-ingest.md`  
SoT decision: `docs/adr/0003-logie-is-access-constraint-source.md`

## After clear-api (#317)

1. clear-api exposes slim Blockages GeoJSON (same shape as spike route response).
2. Set in clear-mvp env:

   ```bash
   NEXT_PUBLIC_LOGIE_BLOCKAGES_URL=<clear-api-slim-blockages-url>
   ```

3. Layers → Blockages works in any environment where that URL is set (hint drops “spike”).
4. Expo #277 checklist: confirm URL in deploy envs; remove reliance on
   `/api/dev/logie-blockages` for QA; keep Coming soon only when URL is unset in prod.

No map paint rewrite required unless the API cannot match the slim contract.
