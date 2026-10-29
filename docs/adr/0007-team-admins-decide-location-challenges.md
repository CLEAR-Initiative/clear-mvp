---
status: accepted
---

# Team admins decide Location challenges in the Inbox

Supersedes the queue-only boundary of [ADR-0003](0003-location-trust-challenge-without-candidates.md).
Its main decision stands: analysts challenge a Signal's pin without being made to pick a
gazetteer candidate.

Location challenges sat in `consideration` with no way to act on them, so a wrong pin stayed
wrong however often analysts reported it. On 2026-10-28 we decided that the admin of the team
a challenge was filed for decides it from the **Inbox**, and that the decision corrects the
**Signal**, not its **Event**:

- **Accept** writes the analyst's proposed point onto the Signal.
- **Place a different point** writes a point the admin places instead: on the map first,
  with place search and typed coordinates as well.
- **Decline** leaves the Signal as it is.

An analyst files a challenge for one team they are an analyst on, and the Signal (and any
corrected point) must be in that team's area; platform admins may file and decide any.
An admin may decide a challenge they filed (2026-10-29). A written point becomes the
Signal's general location (its origin and destination are cleared, and its countries follow)
and survives later source revisions. Which Event the Signal belongs to does not change: fixing an Event's location
means correcting its Signals, which the Event work builds on.

In the app, filing is **Change location** (2026-10-29): the ⋯ menu at the top right of a
Signal, and its map panel. The form shows where the Signal is now, with its exact
coordinates, and asks where it should be: a place search, a click on its map, or typed
coordinates. That new point is now required, replacing ADR-0003's optional correction;
challenges filed earlier without one still reach the Inbox, where the admin places a point
or declines. Product copy says "location change"; clear-api and the code keep "challenge".

The nav Inbox badge counts each open challenge until it is decided, beside the unread
Proposed signals.

## Considered options

- **A Location admin role** (the gazetteer reviewer ADR-0003 foresaw): no such group exists,
  and the team's admin already owns the team's area and its analysts.
- **Analysts decide each other's challenges** (as Exponential ticket 836 was first written):
  analysts file, admins decide.
- **A second admin decides** (nobody decides their own, as clear-api first shipped it): an
  admin can override a decision anyway, so waiting for another one only hid an admin's own
  changes from their Inbox.
- **Moving the Event instead of its Signals** (clear-api PR 261, on hold): an Event's pin and
  grouping come from its Signals, so a moved Event could not say which Signals were wrong,
  and its pin would not follow.
