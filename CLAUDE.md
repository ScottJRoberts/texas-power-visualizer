# CLAUDE.md

Project context for Claude Code. Read this before making changes.

## Thesis

Texas needs roughly **65 GW of new peak capacity by 2030** (~85 GW today → ~150 GW in
ERCOT's own long-term forecast). The gap is not just a size problem, it's a *shape*
problem: new data center load is flat 24/7, so it lifts the 4 AM floor as much as the
5 PM peak — and that's the part existing capacity is worst at covering.

The user should leave with a sense of **scale**: how much of each thing you'd actually
need, and why the obvious answers don't line up with when the demand is.

The tool teaches by letting the user fail. They add solar, close the afternoon, and
discover 4 AM is untouched.

## What this is

A single-page React app, in two layers.

**The lightswitch layer** is the opening experience. The user tries to keep one light
on across a 24-hour day. They scrub a clock; the room brightens and dims with the
ratio of delivered supply to demand, and one switch moves between today's grid and the
projected 2030 grid. The light tells you THAT you failed.

There is no on/off switch on the lamp. A control that only turns the subject of the
exercise off is a control that does nothing — the scenario switch is the framing
device, and it is the only control in this layer that changes the question.

**The simulator** sits behind it: today's demand curve and the delivered-supply curve
on the same axes, a panel of supply options with honest generation shapes, and live
deficit stats. The chart tells you WHY. It is the diagnostic the user opens when the
light fails — an explainer, not a wall.

Not a game. Not a dashboard. One interaction, one lesson.

### Why the pivot

The simulator alone assumed too much. It opened on a chart and a deficit readout,
which reads as failure before the user has done anything, and it asked them to care
about a gap they had no stake in. The lightswitch puts a concrete physical problem in
front of the abstraction first. Confidence, then failure, then explanation.

## Stack

- React, plain JavaScript. **No TypeScript** — deliberate, this is a 1–2 hour prototype.
- **Hand-rolled SVG for the chart**, not a charting library.

### Why SVG over Recharts (tradeoff, documented for the writeup)

Recharts wins on maintainability and would be the right call in a real codebase.
But the shaded deficit region *is* the product, and shading the area between two
arbitrary curves means fighting someone else's abstraction. SVG gives total control
over the one thing that matters here. AI assistance also lowers the historical cost
of hand-written SVG considerably.

If the chart work starts eating the budget, falling back to Recharts is acceptable —
the lesson matters more than the rendering.

## Data and sources

Cite the source next to the number, in the UI, not in a bibliography.

| Figure | Value | Source |
|---|---|---|
| ERCOT all-time peak demand | 85,245 MW | ERCOT Monthly Operational Overview |
| Summer 2025 peak absent demand response | ~88,530 MW | ERCOT Summer 2025 Operational Review |
| Crypto-mining demand response at peak | ~3,151 MW | same |
| 2030 forecast peak | ~150 GW | ERCOT long-term load forecast |
| Large-load interconnection queue | ~238.6 GW, 77.5% data centers | ERCOT queue trackers (Mar 2026) |
| Queue with approval to energize | ~9.0 GW | same |
| Observed large-load peak consumption | ~3.9 GW | same |

**Do not model the raw queue as demand.** The queue is a pipeline snapshot, not a
plan — developers file in multiple locations to shop for speed, and speculative
filings are common. Request-to-operating is ~1.6% today. We solve ERCOT's own
forecast instead, because it's defensible and it's their number.

The synthetic curve is gone. The model now runs on **ERCOT MORA, reporting month
August 2026** — hourly P50 demand, solar and wind capacity factors, availability
derates, and installed-vs-available capacity by resource category. Plant sizes come
from the same workbook's unit registry. See `src/data/generationProfiles.js` and
`src/data/plantScale.js`, which carry the sourcing notes inline.

Index 0 is Hour Ending 1:00. The UI labels each hour by the hour it **begins**, on a
plain 12-hour clock — so ERCOT's HE18 renders as "5 PM". That matches the "4 AM
floor / 5 PM peak" language above. HE notation survives in the UI only where it names
a column in ERCOT's own workbook.

The model runs in **MW** to match the source and converts to GW at the render
boundary. **Mark ASSUMED values as assumed, and never blur them with sourced ones.**

Derive every demand scenario from the P50 curve — a weather-sensitive growth factor
plus a **flat adder** for data center load. Do not hand-author a second array. The
flat adder is the whole point.

## Build order

The simulator layer is built: SVG chart, supply registry with honest shapes,
dispatch with merit order and storage, live deficit stats, sources card.

The lightswitch layer is the current work:

1. Scene + brightness (standalone, testable immediately)
2. Clock + scrubbing
3. Wire to the dispatch model
4. Failure and success copy
5. Beat sequencing
6. Escalation and scale bridge

**Steps 1-4 are the valuable core.** If time runs out after step 4, that is a
coherent shippable state. Do not leave a half-built beat sequence sitting in front of
the working simulator.

### The five beats

1. **It works.** Open at 1 PM on today's grid. Let them scrub the whole day and find
   it holds everywhere. Confidence first.
2. **The load arrives.** One switch moves from today's grid to ERCOT's projected 2030
   load — population growth and electrification arriving in the shape load already has,
   plus a flat around-the-clock adder for new large loads. The room dims everywhere.
   **Do not say which hour is worst.** The discovery is the point.

   Framed as *future grid output*, not as data centers. Data centers are one input to
   the forecast, not the story, and naming them invites an argument about them instead
   of about shape.
3. **Controls appear.** Reveal the supply panel once they have found a failing hour.
   Prefill nothing.
4. **The turn.** They add solar, test a late hour, and the light stays dark. This is
   the moment the whole thing exists for.
5. **Full simulator.** Chart and full panel, everything unlocked.

The user must be able to reach the simulator at any point — no dead ends, no forced
completion. **Once the chart has been shown it stays available**; users who reason
forward should not have to fail again to get it back.

### Failure and success copy

This replaces graphical failure indicators, and it is the most important copy in the
app. Two mandatory rules: **name the hour**, and **name what they built**. The line
sits near the switch, in the same eyeline as the light — never in a page header.

> **Dark at 10 PM.** You built 30 solar farms. At this hour they're producing nothing.

Success copy must be equally specific or the payoff is an anticlimax:

> **Light's on at 10 PM.** It's running on gas.

Generic strings ("not enough power") teach nothing. Every message is a diagnosis.

## Deliberately not in v1

- Full-year modeling (two canonical days would teach the same lesson; start with one)
- Real hourly ERCOT CSVs (synthetic curve is enough to show the shape)
- Cost modeling — cost is the obvious axis; time and shape are the non-obvious ones
- Procurement lead times — a later layer, not v1
- Interconnection queue deduplication — data-cleaning rabbit hole, teaches nothing
- Animation and visual polish beyond the brightness transition
- Next-gen supply options (SMR, geothermal, fusion)
- **Procurement lead times and per-project arrival years.** Still out: those numbers
  are unsourced. What *is* in, as of the build-rate table in `src/data/buildRates.js`,
  is the aggregate historical build rate — the win screen divides what the user built
  by the total column of ERCOT's fastest year on record. That is a rate, not a lead
  time, and the distinction is worth keeping: it answers "how long would this take at
  the pace we have actually managed", not "how long does one plant take".
- **Glanceable failure icons** (sun-below-horizon graphics and the like). Copy does
  this job, and does it better — see the failure copy rules above.
- New data sources. Everything comes from the MORA modules already in the repo.

These are deliberate. Do not add them "for completeness".

## Deferred, coming back to

Not cut — parked, with high confidence we return to them. These are optimizations
on a chart that already reads well enough as bare lines, so they wait until the
interaction is real.

- **Both kinds of shading.** Fill beneath the curves, *and* the shaded deficit
  region between them. The two lines communicate the gap well enough for now.
  Note this softens the SVG-over-Recharts rationale above — that tradeoff was
  argued on needing total control over the shaded region. The argument still
  holds for where we're going, just not for what's on screen today.
- **Chart responsiveness.** The SVG scales with its container today (`viewBox` +
  `width: 100%`), which is enough. What's deferred is the breakpoint behavior:
  axis tick density, label rotation, and legend layout are tuned for the desktop
  2/3 column and will crowd on narrow screens.

## Staged reveals

Two facts are held back deliberately, because they land harder after the user has
engaged than as up-front caveats:

- **Transmission losses** (~6–8%): reveal *after* they first close the gap. "You're
  still short, because delivery isn't free."
- **The dead hour**: don't label it, on the chart or in the copy. Beat 2 opens a
  failing window and the user has to scrub to find it. Naming it is the one thing
  that spends the whole lesson for nothing.

## Honesty requirements

Non-negotiable. The rest of the project is rigorous about sourcing and this layer must
not undermine it.

- **Frame as a scenario, not a forecast.** Every number is a P50 from ERCOT's
  probabilistic model. Say "scenario" in the UI.
- **Do not imply the lights go out tonight.** ERCOT's August risk hour carries a low
  EEA probability, not certain load shed. The honest framing: this is the scenario,
  after the load you just added, and this is the hour that breaks first.
- **Prefer dimming over blackout.** Degradation is more honest than binary failure,
  and it reads as more serious rather than less.
- Keep citations visible next to numbers, as elsewhere in the app.

## Constraints

Assignment target is 1–2 hours, hard cap 8. Scoping is part of what's being
evaluated. Prefer cutting scope over extending time. If something here conflicts
with shipping a working version of step 1, ship step 1.
