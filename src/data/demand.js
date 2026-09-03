import { DEMAND_P50_MW } from './generationProfiles';

// One point per hour-ending block. Index i is HE(i+1), covering the hour that
// *begins* at i — so index 17 is HE18, 17:00-18:00, the demand peak. We plot
// each point at the start of its block.
// Plain 12-hour clock. Index 17 plots at 5 PM, which is the hour ERCOT calls
// HE18 — the hour ending 18:00, i.e. 5-6 PM. We label the hour it begins.
export const clockLabel = (hour) => {
  const h = ((hour % 24) + 24) % 24;
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${h < 12 ? 'AM' : 'PM'}`;
};

export const DEMAND_CURVE = DEMAND_P50_MW.map((mw, i) => ({
  hour: i,
  label: clockLabel(i),
  mw,
}));

export const scaleCurve = (curve, factor) =>
  curve.map((point) => ({ ...point, mw: point.mw * factor }));

// The model runs in MW to match the MORA. The UI reads in GW.
export const toGw = (curve) => curve.map((point) => ({ ...point, gw: point.mw / 1000 }));
