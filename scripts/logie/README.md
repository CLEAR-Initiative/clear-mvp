# LogIE spike scripts (Expo #280)

TypeScript port of [Ewan’s `logie.py` gist](https://gist.github.com/eoglethorpe/90f2b9e645d43fe8d74c7b442d7e9ce9) — **core only** (`pull_layer`, `pull_pac`, `access_issues`, `status_domains`, `save` + CLI).

Spike additions vs the gist: shaped features **pass through `fclass`**.

## Out of scope for #280 done

- OSM Overpass surface enrichment
- `download_icons` / sprite slicing (kept on the follow-up list for symbology)

## Run

```bash
npm run logie:spike
# or
npx tsx scripts/logie/cli.ts --iso3 SDN
npx tsx scripts/logie/cli.ts --iso3 SDN --full   # also write full only_blocked=false GeoJSON
```

Use **tsx** (not system Bun 1.0.x) — Bun was writing 0-byte GeoJSON dumps on this machine.

Outputs land in `scripts/logie/out/` (gitignored):

| File | Contents |
|------|----------|
| `{iso3}_access_blocked.geojson` | Default `access_issues` (blocked + PAC) |
| `{iso3}_access_full.geojson` | Only with `--full` |
| `{iso3}_status_domains.json` | Live coded domains + blocked code sets |
| `{iso3}_spike_report.json` | Counts, open-vs-blocked, `fclass` coverage |

## Docs

- Findings / Access mapping: [`docs/logie-spike-sudan.md`](../../docs/logie-spike-sudan.md)
- clear-api ingest gap + ticket draft: [`docs/clear-api-logie-ingest.md`](../../docs/clear-api-logie-ingest.md)

## Local `/map` smoke

After a spike pull:

```bash
npm run dev
# /map → Layers → Blockages (development; hint shows “spike”)
```

Dev route: `GET /api/dev/logie-blockages` → filters/simplifies via `src/lib/map/logie-blockages.ts`.  
Fetch entry: `src/lib/map/fetch-blockages.ts`. Ingest contract:
[`docs/clear-api-logie-ingest.md`](../../docs/clear-api-logie-ingest.md).

## Note

Runtime CLEAR still owns no domain data. These dumps are **spike evidence** only — not a production layer source. Persistence belongs in clear-api (**LogIE ingest**); map paint is #277 against the slim Blockages contract.
