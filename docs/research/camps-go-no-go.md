# Camps research — go / no-go one-pager (draft)

**Ticket:** Expo #319 · Branch `research/displacement-camps-satellite`  
**Updated:** 2026-08-04 (rehydrated + high-mobility / forecast horizon notes)  
**Audience:** CLEAR product + NRC protection / IM

## Recommendation (living)

**Preliminary (catalog restored; EO spike + NRC call still open):**

> **Technically leaning “blocked on partner access + NRC,” not “no.”**  
> Public HDX does **not** offer a current site-level camp layer. Admin2 DTM can feed density later. Site pins need DTM Admin3 and/or SMC/REACH sharing, plus EO-assisted review for informal/mobile sites. Stale 2020 GPS camps are smoke-test only.  
> Multi-day mobility near conflict means we should ship **time-stamped observations** (“as of”), not a false “live pin.” Forecasting is a **later, more sensitive** track — not part of this go/no-go.

Final checkbox after EO spike + NRC meeting:

- [ ] Ship (prod tickets allowed)
- [ ] Partner first (MoU / data access, then re-score)
- [ ] Defer
- [ ] Technically go, blocked on NRC

## What we want (presence)

Current **IDP / camp site presence** on CLEAR (points/footprints + `as_of` + source), ambition ≤14–21 days for priority/mobile sites, with satellite-assisted human review. Near conflict, honesty may mean **shorter demotion** and observation trails. **Not** LogIE/Blockages on this ticket.

## Forecast horizon (explicitly out of #319 ship gate)

If presence history works, CLEAR may later explore **short-horizon migration hints** from observation trails + nearby Detection conflict context. That data is more sensitive than a single demoted pin:

- API may store history / model runs under strict ACL + retention.
- FE should default to coarse / role-gated views — not public predicted lat/lng pins.
- Requires a separate NRC + product decision before any Expo forecast ticket.

## Evidence so far

| Question | Finding |
|----------|---------|
| Public current camp GeoJSON? | **No.** |
| Public DTM today? | Admin1/2 caseloads (Snapshot 25-May-2026 on HDX) — density path |
| Public points with GPS? | 2020 “Sudan IDP camps” (~74 camps) — **too stale** for ops |
| Partner paths? | DTM Data Access Form (Admin3); SMC/CCCM; REACH site-master programme |
| EO plan? | Sentinel-2 + UNOSAT-class; contrast **Krinik** (formal) vs **Qarni** (mobile) |
| High-mobility | Sites can move every few days near fighting → confirm as observations, not permanence |

## Risks

- Publishing precise pins can endanger people → NRC precision/ACL gate before any prod ticket.
- Informal sites (north star) are weakest in public data → without EO review + partner feed, freshness ambition fails.
- False “live” UX is worse than demoted “as of” when camps relocate every few days.
- Forecast trails / predicted next sites are a **higher** leak surface than presence.
- Leak surfaces: no prod PRs/tickets until NRC approval; precise fixtures stay in `.local/` only.

## Ask of NRC (meeting)

1. Share / broker site-level data (DTM Admin3 or SMC/REACH)?  
2. Precision + role ACL for CLEAR (presence)?  
3. Confirm CLEAR-propose → NRC-confirm workflow?  
4. Multi-day mobility: trails vs pin; demotion windows?  
5. Is any forecast product desired later — and what must never be stored or painted?

## Next

1. Finish EO spike times/confidence (+ revisit vs mobility note).  
2. Demo `/research/camps` prototype in review meeting.  
3. Tick final recommendation above; only then open production Expo work for **presence**.  
4. Forecasting stays a separate research appendix until presence + NRC clear it.
