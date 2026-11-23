# Map modes

A map mode is one feature that draws on the Mapbox map of `src/components/map/crisis-map.tsx`.
Examples: the presence map, the heatmap, admin boundaries, roads.

This page says how to write a mode as a module. The presence map is the first one:
[`src/components/map/presence-map-mode.ts`](../src/components/map/presence-map-mode.ts).

## Why

`crisis-map.tsx` holds most modes as React effects on one shared map. Each effect calls the map
when its own inputs change. Two effects that are each correct can clash inside one frame.

That is how GlitchTip prod #912 happened. A click handler changed feature state, and a
different effect changed a paint property before the next frame. Mapbox crashed in its render
loop.

A module gives each mode one owner. The order of its map calls is in one place, and a test can
run it without React.

## Terms

| Term | Meaning |
|---|---|
| Mode | One feature that draws on the map. |
| Config | What the mode needs when it is added. It does not change while the mode is on the map. |
| State | What changes while the mode is on the map, for example the selected country. |
| Memory | What must outlive a rebuild, for example the camera position to fly back to. |

## The interface

A mode exports one function and returns two methods.

```ts
const mode = addPresenceMap(map, mapboxgl, config, memory); // add
mode.update(state);                                         // update
mode.remove();                                              // remove
```

- **add** puts the sources, layers, event handlers and markers on the map.
- **update** applies a new state. It does nothing when the state is the same.
- **remove** takes everything off the map and gives back what the mode changed, for example
  the minimum zoom.

`crisis-map.tsx` calls these three things only. It must not call `setPaintProperty`,
`setLayoutProperty`, `setFilter` or `setFeatureState` on a layer that a mode owns.

## Rules

1. The mode owns its layer ids and source ids. No other code changes them.
2. The mode adds its handlers with `map.on` and removes each one in `remove`.
3. Put the map calls for one state change in one function, in a fixed order. In the presence
   map this is `apply`.
4. Change paint values with `setPaintPropertySafe` (`src/lib/map/safe-paint.ts`). A paint value
   that reads feature state must keep reading feature state. To hide such a layer, set its
   `visibility`.
5. Report a caught error with `reportMapError` (`src/lib/map/report-map-error.ts`). Do not
   write an empty `catch`.
6. A style reload removes all layers. The component calls `remove`, then `add` again. Keep
   what must survive in the memory object, not in the mode.
7. Layers that wait for something (an image, a fetch) are added later. Store the newest state
   and apply it when they arrive.

## How the component uses a mode

Two effects, and no map calls of their own:

```tsx
// Add and remove. Runs again when the style reloads.
useEffect(() => {
  const mode = addPresenceMap(map, mapboxgl, config, memory);
  modeRef.current = mode;
  return () => mode.remove();
}, [loaded, isDark, baseMapType]);

// Update.
useEffect(() => {
  modeRef.current?.update(stateRef.current);
}, [loaded, selectedIso]);
```

## Tests

- **Unit:** run the mode against a fake map. See `presence-map-mode.test.ts`. Test add, each
  state change, remove, and a rebuild with the same memory.
- **End to end:** drive the mode on a real canvas. See `e2e/tests/29-presence-map.spec.ts`.
  It needs a Mapbox token (`E2E_REAL_MAP=1`). A mocked map cannot show a render-loop crash.

## Move the next mode

1. Pick one mode. Good next ones: the heatmap, admin boundaries, roads.
2. Find its effects and refs in `crisis-map.tsx`.
3. Move the code into `src/components/map/<name>-mode.ts` without changing its logic.
4. Replace refs that survive a rebuild with a memory object.
5. Add unit tests, and an end-to-end case if the mode has hover or click.
6. Run case 29 and the new case on a real canvas before you open the pull request.

Move one mode per pull request.
