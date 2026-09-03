// ---------------------------------------------------------------------------
// units of scale — "how many power plants is that?"
//
// Every plant size below is DERIVED FROM ERCOT'S OWN UNIT REGISTRY:
// MORA August 2026, "Resource Details" tab, which lists all 1,876 registered
// units with county, fuel, zone, in-service year and nameplate MW.
//
// Method: units aggregated into sites by name, distributed-scale sites (<50 MW)
// excluded, and the median taken over sites commissioned 2020 or later where a
// recent cohort exists. Aggregate rows (Private-Use Network, capacity
// contribution lines) excluded — they are accounting entries, not plants.
//
// So "a solar farm" here means the median utility-scale Texas solar farm built
// since 2020, not a textbook figure.
// ---------------------------------------------------------------------------

import { BATTERY, SOLAR_CF, WIND_CF } from './generationProfiles';

export const PLANT = {
  nuclear: {
    label: "nuclear plant", unitLabel: "reactor",
    nameplateMW: 2634,        // median SITE; Texas has exactly two
    perUnitMW: 1300,          // a single reactor
    availability: 0.944,
    fleetGW: 5.3, sitesInTexas: 2, unitsInTexas: 4,
    newestInService: 1993,
    exemplar: "South Texas Project — 2,730 MW, in service 1989",
  },
  coal: {
    label: "coal plant",
    nameplateMW: 1586, availability: 0.924,
    fleetGW: 14.7, sitesInTexas: 10, newestInService: 2013,
    exemplar: "W A Parish — the largest coal site in ERCOT",
  },
  gasCC: {
    label: "gas combined-cycle plant",
    nameplateMW: 529,         // median existing site
    recentMW: 184,            // median site built 2020+ (only 3 of them)
    availability: 0.762,
    fleetGW: 37.3, sitesInTexas: 68,
    exemplar: "Forney Energy Center — 2,024 MW",
  },
  gasPeaker: {
    label: "gas peaker",
    nameplateMW: 230, availability: 0.762,
    fleetGW: 11.3, sitesInTexas: 51,
  },
  wind: {
    label: "wind farm",
    nameplateMW: 209,         // median site built 2020+
    fleetGW: 40.6, sitesInTexas: 260,
    exemplar: "Horse Hollow — 736 MW, the largest in ERCOT",
  },
  solar: {
    label: "solar farm",
    nameplateMW: 204,         // median site built 2020+
    fleetGW: 39.7, sitesInTexas: 364,
    exemplar: "Samson Solar — 717 MW, in service 2026",
  },
  battery: {
    label: "battery site",
    nameplateMW: 126,
    fleetGW: 21.5, sitesInTexas: 390,
    exemplar: "Padua Grid BESS — 403 MW, in service 2026",
  },
};

// ERCOT's own household yardstick, stated on its dashboards and fact sheets:
// 1 MW serves roughly 250 residential customers during ERCOT peak hours.
export const HOMES_PER_MW = 250;

// --- the part that matters -------------------------------------------------
// "How many plants" has two different answers, and the gap between them IS
// the lesson. Nameplate asks how much you build. Delivered asks how much
// shows up at the hour you actually needed it.
//
// At HE22 — ERCOT's highest-risk hour in August — solar delivers ZERO.
// No quantity of solar farms closes a gap at that hour. That is not a
// rhetorical flourish; it is the published expected-available capacity.

export function plantsNeeded(gapMW, kind, hour) {
  const p = PLANT[kind];
  if (!p) throw new Error(`unknown plant type: ${kind}`);

  let cf;
  switch (kind) {
    case "solar":   cf = SOLAR_CF[hour % 24]; break;
    case "wind":    cf = WIND_CF[hour % 24]; break;
    case "battery": cf = BATTERY.availableMW / BATTERY.installedMW; break;
    default:        cf = p.availability ?? 1;
  }

  const deliveredPerPlant = p.nameplateMW * cf;
  return {
    kind, label: p.label, hour,
    nameplateCount: Math.ceil(gapMW / p.nameplateMW),
    deliveredCount: cf > 0 ? Math.ceil(gapMW / deliveredPerPlant) : Infinity,
    deliveredPerPlantMW: +deliveredPerPlant.toFixed(1),
    capacityFactor: +cf.toFixed(3),
    impossible: cf === 0,
  };
}

export const homesServed = mw => Math.round(mw * HOMES_PER_MW);
