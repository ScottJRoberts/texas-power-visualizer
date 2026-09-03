// ---------------------------------------------------------------------------
// generation profiles — ERCOT MORA, August 2026
//
// SOURCE: ERCOT Monthly Outlook for Resource Adequacy, reporting month
// August 2026. Tabs: "PRRM Percentile Results" (hourly P50) and
// "Capacity by Resource Category". Public, no registration.
//
// August chosen deliberately: it is the summer peak month (89.3 GW P50), and
// its percentile tables are clean. The July and September 2026 workbooks each
// contain a corrupted hour-column in the wind block (July HE9, Sept HE5) where
// every percentile collapses to near zero — an artifact, not weather. Do not
// use those two months without repairing them first.
//
// Wind and solar here are ERCOT's SYNTHETIC profiles from its Probabilistic
// Reserve Risk Model, fitted across weather years back to 1980. They are not
// observed generation for any real day. Say "projected", not "actual".
//
// Index 0 = Hour Ending 1:00 (i.e. midnight-1am), index 23 = Hour Ending 24:00.
// ---------------------------------------------------------------------------

// Installed capacity vs expected available at the highest-risk hour,
// HE 22:00 CDT. MW. From "Capacity by Resource Category".
export const CAPACITY = {
  //                installed   available   ratio
  thermal:        [ 89201.5,   71077.2 ],  // 79.7%
  gas:            [ 69723.7,   53113.9 ],  // 76.2%
  coal:           [ 13705.4,   12663.0 ],  // 92.4%
  nuclear:        [  5268.0,    4973.2 ],  // 94.4%
  wind:           [ 40584.4,   15555.3 ],  // 38.3%
  solar:          [ 38991.5,       0.0 ],  //  0.0%  <-- 39 GW contributing nothing
  batteries:      [ 20319.3,    4618.6 ],  // 22.7%  <-- SOC-limited, not broken
  dcTieImports:   [  1220.0,     719.8 ],
  total:          [192920.5,   92852.5 ],  // 48.1%
};

// Gross demand, MW, P50. Includes rooftop solar, EV and Large Load
// adjustments; excludes demand response deployments.
// Peak 89,309 MW at HE18. Trough 69,232 MW at HE5. Ratio 1.290 —
// summer nights stay hot, so the floor is already high.
export const DEMAND_P50_MW = [
  76183, 73474, 71283, 69726, 69232, 69897, 70652, 71152,
  73506, 77176, 80723, 83818, 85542, 87032, 88040, 88341,
  89015, 89309, 87622, 84788, 83629, 82602, 80534, 78098,
];

// Solar capacity factor. Peak 0.878 at HE13. The cliff is the story:
// 0.749 at HE18, 0.258 at HE20, 0.016 at HE21, zero by HE22.
export const SOLAR_CF = [
  0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.137,
  0.487, 0.729, 0.828, 0.869, 0.878, 0.863, 0.850, 0.826,
  0.801, 0.749, 0.592, 0.258, 0.016, 0.000, 0.000, 0.000,
];

// Wind capacity factor. Anti-correlated with load: 0.369 overnight,
// trough 0.179 at HE12, recovering to 0.376 by HE22. Note that summer wind
// is materially weaker than October wind — the whole curve sits lower.
export const WIND_CF = [
  0.369, 0.353, 0.341, 0.328, 0.310, 0.292, 0.275, 0.200,
  0.187, 0.192, 0.185, 0.179, 0.192, 0.202, 0.212, 0.219,
  0.236, 0.249, 0.263, 0.284, 0.333, 0.376, 0.360, 0.359,
];

// Derived availability factors for dispatchable resources.
export const AVAILABILITY = { gas: 0.762, coal: 0.924, nuclear: 0.944 };

export const BATTERY = {
  installedMW:   20319.3,
  availableMW:    4618.6,  // at HE22 — 22.7% of nameplate
  roundTrip:         0.87, // ASSUMED — not in the MORA
  durationHours:        4, // ASSUMED — ERCOT fleet is mostly 2-4h
};

// --- the three hours that matter ------------------------------------------
// HE18  demand peaks at 89.3 GW, solar still delivering 0.749 CF
// HE21  NET load peaks at 69.5 GW — three hours after demand does
// HE22  ERCOT's highest-risk hour: solar at zero, batteries down to 22.7%
//
// The gap between HE18 and HE22 is the entire lesson. The grid's hardest
// hour is not its hottest hour.
export const HOURS_OF_INTEREST = { demandPeak: 17, netLoadPeak: 20, riskHour: 21 };

export const solarMW = (h, nameplateMW) => nameplateMW * SOLAR_CF[h % 24];
export const windMW  = (h, nameplateMW) => nameplateMW * WIND_CF[h % 24];
export const firmMW  = (h, nameplateMW, kind) => nameplateMW * (AVAILABILITY[kind] ?? 1);
