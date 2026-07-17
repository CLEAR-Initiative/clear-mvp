/**
 * Soft “lava lamp” blob simulation for Overview situation heatmaps.
 *
 * Blobs stay home-anchored to situation (event+signal) locations. Hover mostly
 * changes **intensity**, with only light local drift — other situations remain
 * visible as dimmer heat instead of emptying into one hotspot.
 */

export interface LavaAnchor {
  lng: number;
  lat: number;
  weight: number;
  groupId: string;
}

export interface LavaBlob {
  lng: number;
  lat: number;
  vlng: number;
  vlat: number;
  weight: number;
  vweight: number;
  phase: number;
  groupId: string;
  homeLng: number;
  homeLat: number;
  homeWeight: number;
}

const SETTLE_MS = 700;

function hash01(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/** One blob per anchor (capped), seeded at home so the field stays distributed. */
export function createLavaBlobs(anchors: LavaAnchor[], maxBlobs = 18): LavaBlob[] {
  const seeds = anchors.length > 0 ? anchors.slice(0, maxBlobs) : [];
  if (seeds.length === 0) {
    return [
      {
        lng: 30,
        lat: 15,
        vlng: 0,
        vlat: 0,
        weight: 0.3,
        vweight: 0,
        phase: 0,
        groupId: "",
        homeLng: 30,
        homeLat: 15,
        homeWeight: 0.3,
      },
    ];
  }

  return seeds.map((a, i) => {
    const j = hash01(i + 1);
    const k = hash01(i + 17);
    const homeWeight = Math.max(0.12, Math.min(1, a.weight));
    return {
      lng: a.lng + (j - 0.5) * 0.25,
      lat: a.lat + (k - 0.5) * 0.25,
      vlng: 0,
      vlat: 0,
      weight: homeWeight,
      vweight: 0,
      phase: j * Math.PI * 2,
      groupId: a.groupId,
      homeLng: a.lng,
      homeLat: a.lat,
      homeWeight,
    };
  });
}

export interface StepLavaOptions {
  focusId: string | null;
  focusAgeMs: number;
  nowMs: number;
}

/**
 * Keep blobs near their homes; focus raises weight on the hovered group and
 * dims the rest. Position motion stays small (local lava settle only).
 */
export function stepLavaBlobs(
  blobs: LavaBlob[],
  dtSec: number,
  opts: StepLavaOptions,
): void {
  const dt = Math.min(0.048, Math.max(0.008, dtSec));
  const settled = opts.focusAgeMs >= SETTLE_MS;
  // Gentle springs — intensity does most of the focus work.
  const spring = 3.2;
  const damp = 0.9;
  const wSpring = 4.5;

  for (const b of blobs) {
    const focused = opts.focusId != null && b.groupId === opts.focusId;
    const dimmed = opts.focusId != null && !focused;

    let tLng = b.homeLng;
    let tLat = b.homeLat;
    let tWeight = b.homeWeight;

    if (focused) {
      tWeight = Math.min(1.2, b.homeWeight * 1.45);
      if (settled) {
        const t = opts.nowMs / 1000;
        const amp = 0.08; // small local drift only
        tLng += Math.sin(t * 0.65 + b.phase) * amp;
        tLat += Math.cos(t * 0.5 + b.phase * 1.2) * amp * 0.8;
        tWeight *= 0.92 + 0.12 * (0.5 + 0.5 * Math.sin(t * 0.85 + b.phase));
      }
    } else if (dimmed) {
      tWeight = Math.max(0.08, b.homeWeight * 0.28);
    } else {
      tWeight = b.homeWeight * 0.7;
    }

    const ax = (tLng - b.lng) * spring;
    const ay = (tLat - b.lat) * spring;
    b.vlng = (b.vlng + ax * dt) * damp;
    b.vlat = (b.vlat + ay * dt) * damp;
    b.lng += b.vlng * dt;
    b.lat += b.vlat * dt;

    const aw = (tWeight - b.weight) * wSpring;
    b.vweight = (b.vweight + aw * dt) * 0.88;
    b.weight = Math.max(0.05, Math.min(1.25, b.weight + b.vweight * dt));
  }
}

export const LAVA_SETTLE_MS = SETTLE_MS;
