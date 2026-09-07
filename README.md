# Lets Power Texas!

An interactive scenario tool about the *shape* of Texas's electricity problem.

Texas needs roughly **65 GW of new peak capacity by 2030** — about 85 GW of peak demand
today against the ~150 GW in ERCOT's own long-term forecast. That gap is not only a size
problem. New around-the-clock load lifts the 4 AM floor as much as the 5 PM peak, and the
4 AM floor is the part existing capacity is worst at covering.

The tool teaches by letting you fail. You add solar, close the afternoon, and discover
that the late-night hour is untouched.

## How it works

**Keep one light on for a whole day.** Scrub a clock across 24 hours and the room
brightens and dims with the ratio of delivered supply to demand. One switch moves between
today's grid and ERCOT's projected 2030 load. The light tells you *that* you failed.

**Build supply.** A panel of plant types — solar, wind, nuclear, gas combined-cycle, coal,
batteries — each with an honest hourly generation shape and a real median site size. You
add whole plants, on top of the fleet Texas already has.

**Read the chart.** Demand and delivered supply on the same axes, with live deficit stats.
The chart tells you *why*. It unlocks when you ask for it and then stays available — no
dead ends, no forced completion.

Failure and success messages are diagnoses, never generic. They name the hour and name
what you built:

> **Dark at 10 PM.** You built 30 solar farms. At this hour they're producing nothing.

> **Light's on at 10 PM.** It's running on gas.

## Running it

```bash
npm install
npm start      # dev server on http://localhost:3000
npm run build  # production bundle to dist/
npm run preview
npm test       # vitest (harness wired up; no suites yet)
```

React 18 + Vite, plain JavaScript. No TypeScript and no charting library — both deliberate,
see [Design decisions](#design-decisions).

## Project structure

```
src/
  App.jsx                  view switching, dispatch wiring, win state
  data/
    generationProfiles.js  ERCOT MORA: P50 demand, capacity factors, derates
    plantScale.js          median site size per resource type
    scenario.js            today's fleet, demand scenarios, flat adder
    supplyOptions.js       supply registry, merit-order dispatch, storage
    lightswitch.js         brightness response curve, diagnosis copy
    buildRates.js          historical build rates, used by the win screen
    demand.js              MW/GW conversion, hour labels
  components/
    Lightswitch.jsx  Scene.jsx  Clock.jsx    the room, the light, the scrubber
    SupplyForm.jsx   SupplyOptionRow.jsx     what you build
    FleetTable.jsx                           what's on the system
    LoadChart.jsx                            hand-rolled SVG chart
    StatusBar.jsx    WinAlert.jsx  SourcesCard.jsx
```

## Data and sources

Everything runs on **ERCOT's Monthly Outlook for Resource Adequacy (MORA), reporting month
August 2026** — hourly P50 demand, solar and wind capacity factors, availability derates,
and installed-vs-available capacity by resource category. Plant sizes come from the same
workbook's unit registry. Sourcing notes live inline in `src/data/generationProfiles.js`
and `src/data/plantScale.js`, and citations appear next to the numbers in the UI rather
than in a bibliography.

| Figure | Value | Source |
|---|---|---|
| ERCOT all-time peak demand | 85,245 MW | ERCOT Monthly Operational Overview |
| Summer 2025 peak absent demand response | ~88,530 MW | ERCOT Summer 2025 Operational Review |
| Crypto-mining demand response at peak | ~3,151 MW | same |
| 2030 forecast peak | ~150 GW | ERCOT long-term load forecast |
| Large-load interconnection queue | ~238.6 GW, 77.5% data centers | ERCOT queue trackers (Mar 2026) |
| Queue with approval to energize | ~9.0 GW | same |
| Observed large-load peak consumption | ~3.9 GW | same |

**The raw queue is not modelled as demand.** It is a pipeline snapshot, not a plan —
developers file in multiple locations to shop for speed, and speculative filings are
common. Request-to-operating runs around 1.6%. The model solves ERCOT's own forecast
instead, because it is defensible and it is their number.

Conventions worth knowing:

- The model runs in **MW** to match the source and converts to GW at the render boundary.
- Index 0 is Hour Ending 1:00. The UI labels each hour by the hour it **begins**, on a
  plain 12-hour clock, so ERCOT's HE18 renders as "5 PM". HE notation survives only where
  it names a column in ERCOT's workbook.
- Every demand scenario derives from the P50 curve: a weather-sensitive growth factor plus
  a **flat adder** for around-the-clock load. There is no second hand-authored array — the
  flatness of the adder is the whole point.
- Assumed values are marked as assumed and never blurred with sourced ones.

## Design decisions

**Hand-rolled SVG over Recharts.** Recharts wins on maintainability and would be the right
call in a production codebase. But the shaded deficit region *is* the product, and shading
between two arbitrary curves means fighting someone else's abstraction. SVG gives total
control over the one thing that matters. AI assistance also lowers the historical cost of
hand-written SVG considerably.

**Dimming, not blackout.** Brightness is never a boolean, and the response curve is not the
raw served ratio — a grid serving 92% of load is in trouble, and a linear map would render
that as "basically lit". `brightnessFor` bends the band that matters onto the full range.

**No on/off switch on the lamp.** A control that only turns off the subject of the exercise
is a control that does nothing. The scenario switch is the only control that changes the
question.

**Framed as a scenario, not a forecast.** Every number is a P50 from a probabilistic model.
ERCOT's August risk hour carries a low emergency probability, not certain load shed. The
honest claim is: this is the scenario, after the load you just added, and this is the hour
that breaks first.

## Deliberately out of scope

This is a 1–2 hour prototype and scoping is part of the exercise. Not included, on purpose:
full-year modeling, cost modeling, procurement lead times and per-project arrival years,
next-gen supply options (SMR, geothermal, fusion), animation beyond the brightness
transition, and glanceable failure icons — copy does that job better.

Two things are parked rather than cut: fill and deficit shading beneath the curves, and
breakpoint behavior for the chart (it scales with its container today, but tick density and
legend layout are tuned for a desktop column).

Two facts are held back deliberately, because they land harder after you have engaged than
as up-front caveats: transmission losses (~6–8%), revealed after you first close the gap,
and the identity of the hour that fails — which you have to find by scrubbing.

## License

MIT — see [LICENSE](LICENSE).
