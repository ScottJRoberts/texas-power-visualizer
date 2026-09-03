import { CAPACITY, DEMAND_P50_MW } from './generationProfiles';
import { clockLabel } from './demand';
import { PLANT } from './plantScale';
import { SUPPLY_OPTIONS } from './supplyOptions';

// --- today's grid ----------------------------------------------------------
// The fleet already on the system, expressed in the same units the user adds:
// installed MW from the MORA's Capacity by Resource Category, divided by the
// median site size for that type. Counts are fractional here on purpose —
// this is the real fleet, not a whole number of user clicks.
const CAPACITY_KEY = {
  solar: 'solar',
  wind: 'wind',
  nuclear: 'nuclear',
  gas: 'gas',
  coal: 'coal',
  battery: 'batteries',
};

export const EXISTING_FLEET_COUNTS = Object.fromEntries(
  SUPPLY_OPTIONS.map((option) => [
    option.id,
    CAPACITY[CAPACITY_KEY[option.id]][0] / PLANT[option.plantKey].nameplateMW,
  ]),
);

// DC tie imports are not a plant type the user can build, so they ride along as
// a flat must-take base. Expected available, not installed.
const DC_TIE_MW = CAPACITY.dcTieImports[1];

export const BASE_CURVE = DEMAND_P50_MW.map((_, i) => ({
  hour: i,
  label: clockLabel(i),
  mw: DC_TIE_MW,
}));

// --- demand scenarios ------------------------------------------------------
// Both derive from the MORA P50 curve. Never hand-author a second array: the
// flat adder is the whole point, and it has to be visibly flat.
//
// `growth` scales the existing shape (weather-sensitive load grows with the
// shape it already has). `flatAdderMW` is added equally to every hour, which
// is what 24/7 data center load looks like.
export function demandScenario({ growth = 1, flatAdderMW = 0 } = {}) {
  return DEMAND_P50_MW.map((mw, i) => ({
    hour: i,
    label: clockLabel(i),
    mw: mw * growth + flatAdderMW,
  }));
}

export const DEMAND_TODAY = demandScenario();

// A single tranche of new around-the-clock load. SOURCED number: 9.0 GW is the
// slice of ERCOT's large-load interconnection queue with approval to energize,
// not the 238 GW of speculative filings. Kept for a smaller intermediate step;
// the UI frames the future as the full 2030 load, not as data centers alone.
export const DATACENTER_TRANCHE_MW = 9000;
export const DEMAND_WITH_DATACENTERS = demandScenario({ flatAdderMW: DATACENTER_TRANCHE_MW });

// The grid we are heading for. ERCOT's long-term forecast peak of ~150 GW,
// reached two ways at once: growth on the existing shape, which is population
// and electrification arriving in the pattern load already has, plus a flat
// around-the-clock adder for new large loads that arrive in no pattern at all.
// ASSUMED split between the two; only the ~150 GW endpoint is ERCOT's.
export const GROWTH_2030 = 1.12;
export const FLAT_ADDER_2030_MW = 50000;
export const DEMAND_2030 = demandScenario({
  growth: GROWTH_2030,
  flatAdderMW: FLAT_ADDER_2030_MW,
});

export const mergeCounts = (base, added) =>
  Object.fromEntries(
    SUPPLY_OPTIONS.map((o) => [o.id, (base[o.id] ?? 0) + (added[o.id] ?? 0)]),
  );

export const ZERO_COUNTS = Object.fromEntries(SUPPLY_OPTIONS.map((o) => [o.id, 0]));
