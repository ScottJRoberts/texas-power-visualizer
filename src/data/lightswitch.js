import { clockLabel } from './demand';
import { SUPPLY_OPTIONS } from './supplyOptions';

// --- brightness ------------------------------------------------------------
// Never a boolean: partial supply is a dim room, not a dark one.
//
// The response is deliberately NOT the raw ratio. A grid serving 92% of demand
// is in load shed, but 0.92 brightness looks lit — the failure would be
// invisible, and an invisible failure teaches nothing. So we stretch the band
// that actually matters onto the full range. Below VISIBLE_FLOOR the room is
// at its darkest; at parity it is fully lit; in between it is continuous.
// Two segments meeting at a knee. Above the knee, small shortfalls dim the room
// sharply — a grid serving 92% of load is in trouble, and a linear map would
// render that as "basically lit". Below the knee the response keeps moving so a
// deeply short grid still reads as a gradient across the day rather than a wall
// of black, which looks like a broken component rather than a failing grid.
const KNEE = 0.85;
const KNEE_LIT = 0.35;
const MIN_LIT = 0.08;

export function brightnessFor(deliveredMW, demandMW) {
  if (demandMW <= 0) return 1;
  const served = Math.max(0, Math.min(1, deliveredMW / demandMW));
  const lit =
    served >= KNEE
      ? KNEE_LIT + ((served - KNEE) / (1 - KNEE)) * (1 - KNEE_LIT)
      : MIN_LIT + (served / KNEE) * (KNEE_LIT - MIN_LIT);
  return Math.max(MIN_LIT, Math.min(1, lit));
}

// --- diagnosis -------------------------------------------------------------
// Two rules, both mandatory: name the hour, and name what they built.
// Generic strings teach nothing. Every message is a diagnosis.

const byId = Object.fromEntries(SUPPLY_OPTIONS.map((o) => [o.id, o]));

// Site labels ("gas combined-cycle plant") are right for counting things and
// wrong for naming a fuel. "It's running on gas."
const RUNS_ON = {
  solar: 'solar',
  wind: 'wind',
  nuclear: 'nuclear',
  gas: 'gas',
  coal: 'coal',
  battery: 'stored power',
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const gw = (mw) => `${(mw / 1000).toFixed(1)} GW`;

// What the user's own additions deliver at this hour, separate from the
// existing fleet — "you built" has to mean what they built.
function addedDelivery(hour, addedCounts) {
  const out = {};
  for (const option of SUPPLY_OPTIONS) {
    const count = addedCounts[option.id] ?? 0;
    if (count === 0 || option.kind === 'storage') {
      out[option.id] = 0;
      continue;
    }
    out[option.id] = option.deliver(hour, count * option.mwPerUnit);
  }
  return out;
}

const SERVED_LIT = 0.999;

export function diagnose(record, addedCounts) {
  const served = record.demandMW > 0 ? record.deliveredMW / record.demandMW : 1;
  const when = clockLabel(record.hour);
  const added = addedDelivery(record.hour, addedCounts);

  if (served >= SERVED_LIT) {
    // Name what is actually carrying the hour.
    const top = Object.entries(record.byOption)
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])[0];
    const carrying =
      record.batteryMW > 0 ? RUNS_ON.battery : (top && RUNS_ON[top[0]]) || 'the existing fleet';
    return {
      tone: 'lit',
      headline: `Light's on at ${when}.`,
      detail: `It's running on ${carrying}.`,
    };
  }

  const tone = served >= 0.93 ? 'dim' : 'dark';
  const word = tone === 'dim' ? 'Dim' : 'Dark';
  const headline = `${word} at ${when}.`;

  // Built solar, and at this hour it is delivering nothing, or near enough to
  // nothing that the number is the argument. Never round 0.3 GW up to "some".
  const solarBuilt = addedCounts.solar ?? 0;
  const solarNameplate = solarBuilt * byId.solar.mwPerUnit;
  if (solarBuilt > 0 && added.solar < solarNameplate * 0.1) {
    const built = plural(solarBuilt, 'solar farm');
    return {
      tone,
      headline,
      detail:
        added.solar < 1
          ? `You built ${built}. At this hour they're producing nothing.`
          : `You built ${built}, ${gw(solarNameplate)} of them. At this hour they're delivering ${gw(added.solar)}.`,
    };
  }

  // Built storage, and it has nothing left to give.
  const batteryBuilt = addedCounts.battery ?? 0;
  if (batteryBuilt > 0 && record.batteryMW <= 1 && record.socFraction < 0.02) {
    return {
      tone,
      headline,
      detail: 'Your batteries are empty — nothing charged them today.',
    };
  }

  // Built wind, and the hour caught it at its weakest.
  const windBuilt = addedCounts.wind ?? 0;
  if (windBuilt > 0 && added.wind < added.solar) {
    return {
      tone,
      headline,
      detail: `Your ${plural(windBuilt, 'wind farm')} are delivering ${gw(added.wind)} of ${gw(
        windBuilt * byId.wind.mwPerUnit,
      )} built.`,
    };
  }

  return {
    tone,
    headline,
    detail: `Even with everything running, you're ${gw(record.shortMW)} short.`,
  };
}
