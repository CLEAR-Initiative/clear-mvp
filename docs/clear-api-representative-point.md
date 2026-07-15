# Clear-API Schema Change: Add `representativePoint` to Location

## Problem

Currently, map markers require fetching **full polygon geometries** (12MB) from clear-api, computing centroids in tRPC procedures, then sending points to the browser. This is inefficient:

- **12MB transfer** from clear-api → Next.js server (polygons we don't need)
- **Centroid computation repeated** 600+ times in JavaScript for every map load
- Work happens in the wrong layer (application instead of database)

## Solution

Add a `representativePoint` field to the `Location` GraphQL type, computed once in PostgreSQL using PostGIS `ST_Centroid()`.

---

## 1. Clear-API GraphQL Schema Change

**File:** `clear-api/src/schema.graphql` (or wherever Location type is defined)

```graphql
type Location {
  id: ID!
  name: String!
  level: Int!
  geoId: Int
  pCode: String
  geometry: GeoJSON
  
  # NEW: Representative point for map markers
  # For Point geometries: returns the point itself
  # For Polygon/MultiPolygon: returns the centroid
  representativePoint: GeoJSON
  
  parent: Location
  children: [Location!]!
  ancestorIds: [String!]!
  ancestors: [Location!]!
  population: String
  pointType: String
  metadata: [LocationMetadata!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

---

## 2. GraphQL Resolver Implementation

**File:** `clear-api/src/resolvers/location.ts` (or equivalent)

```typescript
const locationResolvers = {
  Location: {
    representativePoint: (parent: Location) => {
      if (!parent.geometry) return null;
      
      const geom = parent.geometry;
      
      // Point geometries: return as-is
      if (geom.type === 'Point') {
        return geom;
      }
      
      // Polygon/MultiPolygon: compute centroid using PostGIS
      // This assumes you have access to the database connection in the resolver
      return db.raw(`
        SELECT ST_AsGeoJSON(ST_Centroid(ST_GeomFromGeoJSON(?)))::json
      `, [JSON.stringify(geom)]);
    }
  }
};
```

**Alternative (if geometry is already in PostGIS `geometry` column):**

```typescript
representativePoint: async (parent: Location, args, context) => {
  // If Location table has a PostGIS geometry column, compute in one query
  const result = await context.db
    .select(db.raw(`ST_AsGeoJSON(ST_Centroid(geometry))::json as point`))
    .from('locations')
    .where('id', parent.id)
    .first();
  
  return result?.point || null;
}
```

**Best approach (computed column or view):**

For optimal performance, add a **generated column** or **view** to precompute centroids:

```sql
-- Migration: Add computed representative_point column
ALTER TABLE locations
ADD COLUMN representative_point geometry(Point, 4326)
GENERATED ALWAYS AS (
  CASE 
    WHEN ST_GeometryType(geometry) = 'ST_Point' THEN geometry
    ELSE ST_Centroid(geometry)
  END
) STORED;

-- Add spatial index
CREATE INDEX idx_locations_representative_point 
ON locations USING GIST (representative_point);
```

Then the resolver becomes trivial:

```typescript
representativePoint: (parent: Location) => {
  return parent.representative_point; // Already computed in DB
}
```

---

## 3. Changes in clear-mvp (Our tRPC Layer)

### Remove centroid computation helpers

**Delete:**
- `src/lib/geo/to-map-point.ts`
- `src/lib/geo/to-map-point.test.ts`

### Update GraphQL queries

**File:** `src/server/api/routers/alerts.ts`, `signals.ts`, etc.

```typescript
// BEFORE: Fetch full geometry, compute centroid in tRPC
const LOCATION_FIELDS = `
  id name level geometry ancestorIds
`;

// AFTER: Fetch only representativePoint for map queries
const LOCATION_FIELDS_FOR_MAP = `
  id name level representativePoint ancestorIds
`;
```

### Simplify forMap procedures

**Before:**

```typescript
alertsForMap: protectedProcedure.query(async ({ ctx, input }) => {
  // ... fetch alerts with full geometry
  for (const alert of alerts) {
    sanitizeLocationGeometry(alert.event.generalLocation);
    sanitizeLocationGeometry(alert.event.originLocation);
    sanitizeLocationGeometry(alert.event.destinationLocation);
    // ... repeat for nested signals
  }
  return { alerts };
});
```

**After:**

```typescript
alertsForMap: protectedProcedure.query(async ({ ctx, input }) => {
  // ... fetch alerts with representativePoint
  // No sanitization needed - GraphQL returns points directly!
  return { alerts };
});
```

### Update frontend components

**File:** `src/components/map/crisis-map.tsx`, `src/app/(app)/map/page.tsx`

No changes needed! Components already expect Point geometries from the `forMap` queries.

---

## 4. Performance Impact

### Current Architecture (PR 110)
```
DB → GraphQL (12MB polygons) → tRPC (compute 600 centroids) → Browser (~50KB points)
```

- **12MB** network transfer from clear-api → Next.js
- **~500ms** centroid computation in JavaScript
- **50KB** to browser

### With representativePoint
```
DB (PostGIS computes once) → GraphQL (~50KB points) → tRPC (passthrough) → Browser (~50KB points)
```

- **~50KB** network transfer from clear-api → Next.js (240× reduction!)
- **~1ms** centroid computation in PostGIS (500× faster)
- **50KB** to browser (same)

**Expected map load time:** <200ms (down from 1s)

---

## 5. Migration Checklist

### In clear-api repository:

- [ ] Add `representativePoint` field to Location GraphQL schema
- [ ] Implement resolver (choose approach: on-the-fly, or generated column)
- [ ] If using generated column: write and run migration
- [ ] Test: query a Polygon location's `representativePoint` returns a Point
- [ ] Deploy to dev/staging

### In clear-mvp repository (this PR):

- [ ] Wait for clear-api deployment with `representativePoint` field
- [ ] Update `LOCATION_FIELDS` in `forMap` queries to use `representativePoint`
- [ ] Remove `sanitizeLocationGeometry()` calls from `forMap` procedures
- [ ] Delete `src/lib/geo/to-map-point.ts` and `.test.ts`
- [ ] Test locally: map loads <200ms, markers render correctly
- [ ] Update this documentation
- [ ] Open PR, reference clear-api PR

---

## 6. Backward Compatibility

If you need to support both old and new clear-api versions:

```typescript
const LOCATION_FIELDS_FOR_MAP = `
  id 
  name 
  level 
  ancestorIds
  representativePoint  # Use this if available
  geometry             # Fallback for old API
`;

// In tRPC procedure:
function getPointGeometry(location: GqlLocation): PointGeometry | null {
  // Prefer representativePoint if clear-api provides it
  if (location.representativePoint) {
    return location.representativePoint;
  }
  // Fallback: compute from geometry (old behavior)
  if (location.geometry) {
    return toMapPointGeometry(location.geometry);
  }
  return null;
}
```

---

## 7. Related Clear-API Work

While adding `representativePoint`, consider these related improvements:

1. **Bounding box field:** `bbox: [Float!]!` for viewport queries
2. **Area field:** `area: Float` (square kilometers) for filtering/sorting
3. **Simplification levels:** `geometry(simplification: Float)` for multi-scale maps
4. **Lazy-load full geometry:** Only send `representativePoint` by default, fetch full `geometry` on demand

---

## Questions for Clear-API Team

1. Does the `locations` table already have a PostGIS `geometry` column, or is geometry stored as JSON?
2. Are there indexes on the geometry column?
3. Is there a preferred approach for computed columns vs. on-the-fly resolution?
4. What's the typical polygon complexity (number of coordinates)?
5. Should we batch centroid computation for performance?
