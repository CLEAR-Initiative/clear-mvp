# The rebuilt map draws data as Mapbox layers, not deck.gl, to keep the globe

The `/map-v2` rebuild follows Vizzuality's forest-innovation-platform template (`react-map-gl`, a layer registry, `LayerManager`, URL state through `nuqs`) except that data layers are Mapbox `<Source>`/`<Layer>` instead of deck.gl. deck.gl's `MapboxOverlay` cannot draw on Mapbox's globe projection, and we kept the globe rather than moving to Mercator or replacing Mapbox with MapLibre.
