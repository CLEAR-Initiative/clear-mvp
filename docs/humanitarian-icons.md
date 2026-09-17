# Humanitarian Icons - OCHA Standards

## Official Sources

### 1. **OCHA Humanitarian Icons** (Primary)
- **URL**: https://www.unocha.org/themes/humanitarian-icons
- **License**: Public Domain (CC0)
- **Coverage**: 
  - Logistics & Infrastructure (bridges, roads, airports)
  - Health & Medicine
  - Shelter & Non-Food Items
  - Water, Sanitation & Hygiene (WASH)
  - Food Security
  - Protection
  - Camp Coordination & Management

### 2. **ReliefWeb Icons**
- **URL**: https://reliefweb.int/
- Part of OCHA, same design system

### 3. **Humanitarian Data Exchange (HDX)**
- **URL**: https://data.humdata.org/
- Uses OCHA icon standards

## Design Guidelines

### Visual Standards
- **Style**: Simple, clear, universally recognizable
- **Format**: SVG (scalable vector)
- **Color**: Monochrome base (uses `currentColor` for flexibility)
- **Stroke**: Consistent 2px stroke weight at 24x24 viewport
- **Line caps**: Rounded (`stroke-linecap="round"`)
- **Background**: Transparent

### Usage in CLEAR
- **Location**: `public/images/ui-kit/signals/icons/`
- **Naming**: Lowercase with hyphens (e.g., `bridge.svg`, `border-crossing.svg`)
- **Integration**: Map markers via `resolveMarkerIconSlug`
- **Blockages**: Mapbox symbol layers with icon references

## Infrastructure Icons Needed

For LogIE blockages and access constraints:

- ✅ `bridge.svg` - Bridge/overpass infrastructure
- ⬜ `road.svg` - Road/highway
- ⬜ `border-crossing.svg` - Border checkpoint (already exists)
- ⬜ `airport.svg` - Aerodrome/airfield
- ⬜ `port.svg` - Port/harbor
- ⬜ `tunnel.svg` - Tunnel infrastructure

## Adding New Icons

1. **Download from OCHA** (preferred) or create following OCHA style
2. **Save as SVG** to `public/images/ui-kit/signals/icons/{name}.svg`
3. **Use `currentColor`** for stroke/fill (inherits theme color)
4. **Test at multiple scales** (z5-z15 zoom levels)
5. **Update `resolve-icon.ts`** if needed for automatic mapping

## Color Mapping in CLEAR

Icons adapt to context via CSS `color` property:
- **Blockages**: Red (`#B91C1C`) for Not Passable, Orange (`#EA580C`) for Restricted
- **Events/Signals**: Severity scale (critical → high → medium → low)
- **Base**: Dark gray for neutral/informational

## Resources

- OCHA Icon Generator: https://www.unocha.org/themes/humanitarian-icons
- SVG Optimization: SVGO (already in build pipeline)
- Icon Preview: https://icones.js.org (search "humanitarian")

## Example: Bridge Icon

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" 
     fill="none" stroke="currentColor" stroke-width="2" 
     stroke-linecap="round" stroke-linejoin="round">
  <!-- Simple, clear bridge design -->
  <line x1="2" y1="10" x2="22" y2="10" />
  <line x1="6" y1="10" x2="6" y2="18" />
  <line x1="12" y1="10" x2="12" y2="18" />
  <line x1="18" y1="10" x2="18" y2="18" />
</svg>
```

## Migration Plan

Current blockages use programmatic canvas icons. Long-term:
1. ✅ Replace all canvas icons with proper SVG/PNG icons from OCHA
2. ✅ Use Mapbox `loadImage()` for icon loading and conversion
3. ✅ Maintain consistent icon size across zoom levels  
4. ⬜ Apply brand color variants (red #B91C1C for Not Passable, orange #EA580C for Restricted)
5. ⬜ Test with actual LogIE data across multiple countries
6. ⬜ Follow OCHA standards for all humanitarian-context icons across the app

## Implementation Status

### Blockages (LogIE)
- ✅ OCHA bridge icons integrated (`bridge-not-passable.png`, `bridge-restricted.png`, etc.)
- ✅ Mapbox symbol layers with status-based icon selection
- ✅ Async icon loading from PNG files
- ✅ Fallback to programmatic canvas icon
- ⬜ Color tinting for brand consistency (currently using blue OCHA originals)
- ⬜ SVG conversion for better scalability

---

**Last Updated**: 2026-09-16  
**Maintainer**: CLEAR Development Team
