import { BATTERY, firmMW, solarMW, windMW } from './generationProfiles';
import { PLANT } from './plantScale';

// Supply options the user can add. Every shape and derate comes from the MORA
// module — this file is only the catalogue and the dispatch.
//
// Three kinds, because they compose differently:
//
//   'must-take'    — produces whatever the weather or the reactor gives you,
//                    needed or not. Surplus is available to charge storage.
//   'dispatchable' — has a ceiling, not a shape. Called on only to the extent
//                    of the remaining deficit, in merit order.
//   'storage'      — makes no energy, moves it. Charges on must-take surplus,
//                    discharges into deficit.
//
// A unit is one real plant at the median Texas size for its type, from the
// ERCOT unit registry — see plantScale.js. `plantKey` is that registry's key,
// which differs from our option id where the registry is more specific
// (our 'gas' is the registry's 'gasCC').

export const SUPPLY_OPTIONS = [
  {
    id: 'solar',
    plantKey: 'solar',
    kind: 'must-take',
    label: 'Solar farm',
    hint: 'Peaks midday, at zero by 9 PM',
    deliver: (hour, mw) => solarMW(hour, mw),
  },
  {
    id: 'wind',
    plantKey: 'wind',
    kind: 'must-take',
    label: 'Wind farm',
    hint: 'Strong overnight, weakest at midday',
    deliver: (hour, mw) => windMW(hour, mw),
  },
  {
    id: 'nuclear',
    plantKey: 'nuclear',
    kind: 'must-take',
    label: 'Nuclear plant',
    hint: 'Flat, 94.4% available',
    deliver: (hour, mw) => firmMW(hour, mw, 'nuclear'),
  },
  {
    id: 'gas',
    plantKey: 'gasCC',
    kind: 'dispatchable',
    label: 'Gas combined-cycle',
    hint: 'Runs when called on, 76.2% available',
    deliver: (hour, mw) => firmMW(hour, mw, 'gas'),
  },
  {
    id: 'coal',
    plantKey: 'coal',
    kind: 'dispatchable',
    label: 'Coal plant',
    hint: 'Runs when called on, 92.4% available',
    deliver: (hour, mw) => firmMW(hour, mw, 'coal'),
  },
  {
    id: 'battery',
    plantKey: 'battery',
    kind: 'storage',
    label: 'Battery site',
    hint: 'Stores surplus, discharges into deficit',
    source: BATTERY,
  },
].map((option) => ({
  // One unit is one plant at the registry's median Texas site size.
  ...option,
  mwPerUnit: PLANT[option.plantKey].nameplateMW,
}));

// Plants are far smaller than the old 1 GW placeholder, so counts run higher.
export const MAX_PER_OPTION = 500;

const mustTake = SUPPLY_OPTIONS.filter((o) => o.kind === 'must-take');
const storage = SUPPLY_OPTIONS.filter((o) => o.kind === 'storage');

// Merit order: cheapest marginal cost first. ASSUMED ordering — no cost model
// yet, this is the conventional ERCOT stack.
const MERIT_ORDER = ['gas', 'coal'];
const dispatchable = MERIT_ORDER.map((id) => SUPPLY_OPTIONS.find((o) => o.id === id));

const countOf = (counts, option) => counts[option.id] ?? 0;

// Delivered MW from everything that produces whether or not it is needed.
export function mustTakeAt(hour, counts) {
  return mustTake.reduce((sum, option) => {
    const nameplate = countOf(counts, option) * option.mwPerUnit;
    return sum + (nameplate === 0 ? 0 : option.deliver(hour, nameplate));
  }, 0);
}

// Pooled storage across every storage option.
//
// Discharge is capped at the MORA's expected-available ratio (4,619 MW of
// 20,319 installed at 9 PM = 22.7%). This is a derate the loop should respect,
// not rediscover: left uncapped, a greedy dispatch empties the fleet into the
// first deficit hour it meets — 34.5% of nameplate in one hour — and has
// nothing left for the risk hour. ERCOT's number already accounts for state of
// charge, duration and outage across a real fleet, so we take it as given.
function storageSpec(counts) {
  return storage.reduce(
    (spec, option) => {
      const n = countOf(counts, option);
      if (n === 0) return spec;
      const power = n * option.mwPerUnit;
      const derate = option.source.availableMW / option.source.installedMW;
      return {
        power: spec.power + power,
        dischargePower: spec.dischargePower + power * derate,
        energy: spec.energy + power * option.source.durationHours,
        // Split round-trip loss evenly across the charge and discharge legs.
        leg: Math.sqrt(option.source.roundTrip),
      };
    },
    { power: 0, dischargePower: 0, energy: 0, leg: 1 },
  );
}

// Steady-state passes. The battery starts each pass holding whatever it ended
// the previous one with, so the day repeats rather than always beginning empty.
const STEADY_STATE_PASSES = 4;

// Build the delivered-supply curve, in MW.
//
// Per hour: must-take generation lands first, then storage charges on any
// surplus or discharges into any deficit, then dispatchable plants are called
// on in merit order — each only up to what is still missing, so adding gas
// never overshoots demand.
//
// `existing` is the fleet already on the system; `demand` is what must be met.
// Run the day and record what every resource actually did, hour by hour.
//
// Per hour: must-take generation lands first, then storage charges on any
// surplus or discharges into any deficit, then dispatchable plants are called
// on in merit order — each only up to what is still missing, so adding gas
// never overshoots demand.
//
// Returns one record per hour carrying the breakdown, because "why is it dark"
// cannot be answered from a total. `existing` is the fleet already on the
// system; `demand` is what must be met.
export function simulate(existing, demand, counts) {
  const dt = 24 / existing.length;
  const battery = storageSpec(counts);
  const hasStorage = battery.power > 0 && battery.energy > 0;

  let soc = battery.energy / 2;
  let hours = [];

  for (let pass = 0; pass < (hasStorage ? STEADY_STATE_PASSES : 1); pass += 1) {
    hours = existing.map((point, i) => {
      const need = demand[i].mw;
      const byOption = {};

      let supply = point.mw;
      for (const option of mustTake) {
        const nameplate = countOf(counts, option) * option.mwPerUnit;
        const delivered = nameplate === 0 ? 0 : option.deliver(point.hour, nameplate);
        byOption[option.id] = delivered;
        supply += delivered;
      }

      const mustTakeSupply = supply;
      let batteryMW = 0;
      const socBefore = soc;
      const batteryAvailable = hasStorage
        ? Math.min(battery.dischargePower, Math.max(0, (soc * battery.leg) / dt))
        : 0;
      if (hasStorage) {
        const surplus = supply - need;
        if (surplus > 0) {
          const headroom = (battery.energy - soc) / (dt * battery.leg);
          const charge = Math.min(surplus, battery.power, Math.max(0, headroom));
          soc += charge * dt * battery.leg;
          batteryMW = -charge;
        } else {
          const available = (soc * battery.leg) / dt;
          const discharge = Math.min(-surplus, battery.dischargePower, Math.max(0, available));
          soc -= (discharge * dt) / battery.leg;
          batteryMW = discharge;
        }
        supply += batteryMW;
      }
      let ceilingTotal = 0;
      let calledTotal = 0;
      for (const option of dispatchable) {
        const deficit = need - supply;
        const nameplate = countOf(counts, option) * option.mwPerUnit;
        const ceiling = nameplate === 0 ? 0 : option.deliver(point.hour, nameplate);
        const called = deficit <= 0 ? 0 : Math.min(deficit, ceiling);
        byOption[option.id] = called;
        ceilingTotal += ceiling;
        calledTotal += called;
        supply += called;
      }

      // Charge from spare dispatchable headroom too, not only from must-take
      // surplus. A real fleet fills its batteries overnight off cheap thermal
      // capacity it is not otherwise using; charging only on renewable
      // overflow leaves them permanently flat, which is not what ERCOT sees.
      // This is generation serving an extra load, so it does not raise the
      // supply delivered to demand.
      if (hasStorage && batteryMW >= 0) {
        const headroom = (battery.energy - soc) / (dt * battery.leg);
        const spare = Math.max(0, ceilingTotal - calledTotal);
        const extra = Math.min(spare, battery.power - batteryMW, Math.max(0, headroom));
        if (extra > 0) {
          soc += extra * dt * battery.leg;
          batteryMW -= extra;
        }
      }
      byOption.battery = batteryMW;

      return {
        hour: point.hour,
        label: point.label,
        demandMW: need,
        existingMW: point.mw,
        deliveredMW: supply,
        // What the fleet could put on the grid this hour if every resource were
        // called: must-take output, which arrives whether wanted or not, plus
        // dispatchable ceilings and whatever storage could discharge. Delivered
        // output is capped at demand, so it cannot show the effect of building
        // anything on a grid that is already adequate. This can.
        availableMW: mustTakeSupply + ceilingTotal + batteryAvailable,
        byOption,
        batteryMW,
        socMWh: socBefore,
        socFraction: battery.energy > 0 ? socBefore / battery.energy : 0,
        shortMW: Math.max(0, need - supply),
      };
    });
  }

  return hours;
}

// The delivered-supply curve: what actually reaches load, capped at demand.
export function applySupply(existing, demand, counts) {
  return simulate(existing, demand, counts).map((hour, i) => ({
    ...existing[i],
    mw: hour.deliveredMW,
  }));
}

// The available-supply curve: what the fleet could deliver this hour. This is
// the series worth charting — it responds to everything the user builds, and
// the distance above demand is the reserve margin.
export function availableSupply(existing, demand, counts) {
  return simulate(existing, demand, counts).map((hour, i) => ({
    ...existing[i],
    mw: hour.availableMW,
  }));
}

// Nameplate generation added, in GW. Storage is excluded — a battery adds no
// energy to the system, it only moves it.
export function generationNameplate(counts) {
  return (
    SUPPLY_OPTIONS.filter((o) => o.kind !== 'storage').reduce(
      (sum, o) => sum + countOf(counts, o) * o.mwPerUnit,
      0,
    ) / 1000
  );
}

// Below this, a gap is float noise from the storage simulation rather than a
// real shortfall. MW.
const COVERED_EPSILON = 50;

// Where the supplied curve falls under demand: for how many hours of the day,
// the area between the curves over that stretch, and the single worst hour.
// The worst hour is what "how many plants" gets asked about — a gap has to be
// closed at the hour it happens, not on average.
export function shortfall(supplied, demand) {
  const dt = 24 / supplied.length;
  let hours = 0;
  let deficitGwh = 0;
  let worstGapMW = 0;
  let worstHour = 0;

  supplied.forEach((point, i) => {
    const gap = demand[i].mw - point.mw;
    if (gap > COVERED_EPSILON) {
      hours += dt;
      deficitGwh += (gap * dt) / 1000;
      if (gap > worstGapMW) {
        worstGapMW = gap;
        worstHour = point.hour;
      }
    }
  });

  return { hours, deficitGwh, worstGapMW, worstHour };
}
