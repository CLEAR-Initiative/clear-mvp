-- Local fixture for Expo #656: per-figure yearly fill.
-- Monthly Sudan is thin (displaced + in need only). Yearly Sudan has all six
-- figures, with different numbers so a whole-snapshot switch is obvious.
--
--   psql "$DATABASE_URL" -f scripts/seed-sa-yearly-fill-fixture.sql
--
-- Sudan A0 in this local DB: e84a3d72-04cc-46a4-baf8-84c7e2d218b9

DELETE FROM situation_analyses
WHERE id IN ('sa-fill-sudan-monthly-2026-09', 'sa-fill-sudan-yearly-2026');

INSERT INTO situation_analyses (
  id,
  country_location_id,
  window_kind,
  window_start,
  window_end,
  schema_version,
  generated_by_model,
  source_report_ids,
  data
) VALUES
(
  'sa-fill-sudan-monthly-2026-09',
  'e84a3d72-04cc-46a4-baf8-84c7e2d218b9',
  'monthly',
  '2026-09-01 00:00:00',
  '2026-09-30 23:59:59',
  'v1',
  'fixture:yearly-fill',
  ARRAY[]::text[],
  $${
    "ai_summary": {
      "text": "September 2026 monthly fixture. Displacement and people in need are from this month. Other key figures are intentionally absent so the BFF should fill them from the 2026 yearly window and label those tiles “2026 yearly”. If this paragraph is replaced by the year-in-review text, the page switched snapshots — that is a bug."
    },
    "datapoints": {
      "envelope": {
        "report_count": 12,
        "quality_score": 0.7,
        "newest_source_at": "2026-09-15T00:00:00.000Z"
      },
      "estimated_current_displacement": { "stock": 8622801, "total": 8622801 },
      "population_in_need": { "value": 2500000, "confidence": 0.8 },
      "population_affected": null,
      "returnees": null,
      "funding_required_usd": null,
      "funding_received_usd": null
    },
    "sectors": {
      "protection": {
        "severity": "high",
        "top_needs": ["Protection presence in Darfur"],
        "humanitarian_conditions": ["Monthly-only protection line — keep this if the snapshot stayed monthly."]
      }
    },
    "sources": { "reports": [] }
  }$$::jsonb
),
(
  'sa-fill-sudan-yearly-2026',
  'e84a3d72-04cc-46a4-baf8-84c7e2d218b9',
  'yearly',
  '2026-01-01 00:00:00',
  '2026-12-31 23:59:59',
  'v1',
  'fixture:yearly-fill',
  ARRAY[]::text[],
  $${
    "ai_summary": {
      "text": "2026 yearly fixture (year in review). If this text is the page summary, the BFF replaced the monthly snapshot wholesale — that is a bug. All six key figures are present so missing monthly tiles can be filled."
    },
    "datapoints": {
      "envelope": {
        "report_count": 50,
        "quality_score": 0.85,
        "newest_source_at": "2026-08-01T00:00:00.000Z"
      },
      "estimated_current_displacement": { "stock": 9000000 },
      "population_in_need": { "value": 33700000 },
      "population_affected": { "value": 4000000 },
      "returnees": { "value": 120000 },
      "funding_required_usd": { "value": 2700000000 },
      "funding_received_usd": { "value": 800000000 }
    },
    "sectors": {
      "protection": {
        "severity": "critical",
        "top_needs": ["Yearly-only protection line — should not appear if monthly stayed the voice."]
      }
    },
    "sources": { "reports": [] }
  }$$::jsonb
);
