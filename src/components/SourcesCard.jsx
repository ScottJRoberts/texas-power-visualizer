import { useId, useState } from 'react';
import './SourcesCard.css';
import {
  AVAILABILITY,
  BATTERY,
  CAPACITY,
  DEMAND_P50_MW,
  HOURS_OF_INTEREST,
  SOLAR_CF,
  WIND_CF,
} from '../data/generationProfiles';
import { ANNUAL_ADDITIONS_GW, BEST_TOTAL_YEAR } from '../data/buildRates';
import { clockLabel } from '../data/demand';
import { HOMES_PER_MW, PLANT } from '../data/plantScale';

const CAPACITY_ROWS = [
  ['thermal', 'Thermal (all)'],
  ['gas', 'Gas'],
  ['coal', 'Coal'],
  ['nuclear', 'Nuclear'],
  ['wind', 'Wind'],
  ['solar', 'Solar'],
  ['batteries', 'Batteries'],
  ['dcTieImports', 'DC tie imports'],
  ['total', 'Total'],
];

const PLANT_ROWS = ['nuclear', 'coal', 'gasCC', 'gasPeaker', 'wind', 'solar', 'battery'];

// Which numbers are published and which are ours. The MORA header is explicit
// that these must not be blurred together, so they get separate badges.
const ASSUMPTIONS = [
  ['Battery round-trip efficiency', `${BATTERY.roundTrip}`, 'assumed', 'Not in the MORA.'],
  ['Battery duration', `${BATTERY.durationHours} h`, 'assumed', 'ERCOT fleet is mostly 2-4h.'],
  [
    'Solar and wind hourly shapes',
    'PRRM synthetic',
    'projected',
    'ERCOT Probabilistic Reserve Risk Model, fitted across weather years back to 1980. Not observed generation for any real day.',
  ],
  [
    'Merit order',
    'gas, then coal',
    'assumed',
    'Conventional ERCOT stack. There is no cost model in this tool yet.',
  ],
  [
    'Existing fleet on the chart',
    '90% of demand',
    'placeholder',
    'A stand-in, not a modelled fleet. The real August 2026 fleet covers P50 demand outright.',
  ],
  [
    'One unit added',
    'median site size',
    'derived',
    'Median over Texas sites commissioned 2020 or later, from the MORA unit registry.',
  ],
  [
    'Homes per MW',
    `${HOMES_PER_MW}`,
    'sourced',
    "ERCOT's own yardstick, stated on its dashboards and fact sheets.",
  ],
];

const ratio = ([installed, available]) => `${((available / installed) * 100).toFixed(1)}%`;
const mw = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });

function SourcesCard() {
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();
  const riskHour = HOURS_OF_INTEREST.riskHour;

  return (
    <section className={expanded ? 'sources is-expanded' : 'sources'}>
      <h2 className="sources__heading">
        <button
          type="button"
          className="sources__toggle"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded((wasExpanded) => !wasExpanded)}
        >
          <span className="sources__title">What is this based on??</span>
          <span className="sources__sub">
            ERCOT Monthly Outlook for Resource Adequacy, August 2026
          </span>
          <svg className="sources__chevron" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.75"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h2>

      <div className="sources__body" id={bodyId} hidden={!expanded}>
        <p>
          Every figure in this tool comes from the{' '}
          <strong>ERCOT Monthly Outlook for Resource Adequacy (MORA), reporting month
          August&nbsp;2026</strong> &mdash; specifically the <em>PRRM Percentile Results</em>,{' '}
          <em>Capacity by Resource Category</em> and <em>Resource Details</em> tabs. The
          workbooks are public and need no registration.
        </p>

        <ul className="sources__links">
          <li>
            <a href="https://www.ercot.com/gridinfo/resource" target="_blank" rel="noreferrer">
              ERCOT &rarr; Grid Information &rarr; Resource Adequacy
            </a>{' '}
            <span className="sources__muted">where the MORA workbooks are published</span>
          </li>
          <li>
            <a href="https://www.ercot.com/gridinfo/load/load_hist" target="_blank" rel="noreferrer">
              ERCOT &rarr; Hourly Load Data Archives
            </a>{' '}
            <span className="sources__muted">observed historical load, if we swap the P50 curve</span>
          </li>
          <li>
            <a href="https://www.ercot.com" target="_blank" rel="noreferrer">
              ercot.com
            </a>
          </li>
        </ul>

        <h3>Why August</h3>
        <p>
          August is the summer peak month (89.3&nbsp;GW P50) and its percentile tables are clean.
          The July and September 2026 workbooks each contain a corrupted hour-column in the wind
          block &mdash; July HE9, September HE5 &mdash; where every percentile collapses to near
          zero. That is an artifact, not weather. Those two months should not be used without
          repairing them first.
        </p>

        <h3>
          Capacity at the highest-risk hour{' '}
          <span className="sources__muted">9 PM CDT, MW</span>
        </h3>
        <div className="sources__scroll">
        <table className="sources__table">
          <thead>
            <tr>
              <th scope="col">Resource</th>
              <th scope="col">Installed</th>
              <th scope="col">Expected available</th>
              <th scope="col">Ratio</th>
            </tr>
          </thead>
          <tbody>
            {CAPACITY_ROWS.map(([key, label]) => (
              <tr key={key} className={key === 'total' ? 'is-total' : undefined}>
                <th scope="row">{label}</th>
                <td>{mw(CAPACITY[key][0])}</td>
                <td>{mw(CAPACITY[key][1])}</td>
                <td>{ratio(CAPACITY[key])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <p className="sources__caption">
          39&nbsp;GW of installed solar contributes exactly zero at this hour. Batteries fall to
          22.7% because they are state-of-charge limited, not because they are broken.
        </p>

        <h3>Plant sizes</h3>
        <p className="sources__caption">
          Median site size from the MORA unit registry (1,876 registered units). Units aggregated
          into sites by name; sites under 50&nbsp;MW excluded as distributed-scale; aggregate
          accounting rows excluded. Where a recent cohort exists, the median is taken over sites
          commissioned 2020 or later.
        </p>
        <div className="sources__scroll">
        <table className="sources__table">
          <thead>
            <tr>
              <th scope="col">Type</th>
              <th scope="col">Median site</th>
              <th scope="col">Texas fleet</th>
              <th scope="col">Sites</th>
              <th scope="col">Exemplar</th>
            </tr>
          </thead>
          <tbody>
            {PLANT_ROWS.map((key) => {
              const p = PLANT[key];
              return (
                <tr key={key}>
                  <th scope="row">{p.label}</th>
                  <td>{mw(p.nameplateMW)} MW</td>
                  <td>{p.fleetGW} GW</td>
                  <td>{p.sitesInTexas}</td>
                  <td className="sources__exemplar">{p.exemplar ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        <h3>
          Hourly profiles <span className="sources__muted">P50 demand, MW &middot; capacity factors</span>
        </h3>
        <div className="sources__scroll">
        <table className="sources__table">
          <thead>
            <tr>
              <th scope="col">Hour</th>
              <th scope="col">Demand</th>
              <th scope="col">Solar CF</th>
              <th scope="col">Wind CF</th>
            </tr>
          </thead>
          <tbody>
            {DEMAND_P50_MW.map((demand, i) => (
              <tr key={i} className={i === riskHour ? 'is-risk' : undefined}>
                <th scope="row">{clockLabel(i)}</th>
                <td>{demand.toLocaleString()}</td>
                <td>{SOLAR_CF[i].toFixed(3)}</td>
                <td>{WIND_CF[i].toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <p className="sources__caption">
          Demand is gross P50: it includes rooftop solar, EV and Large Load adjustments, and
          excludes demand response deployments. Peak 89,309&nbsp;MW at 5&nbsp;PM, trough
          69,232&nbsp;MW at 4&nbsp;AM &mdash; a ratio of 1.290, because summer nights stay hot.
          The highlighted row is 9&nbsp;PM, ERCOT&rsquo;s highest-risk hour. Each row is
          labelled by the hour it begins, so 9&nbsp;PM covers 9&ndash;10&nbsp;PM.
        </p>

        <h3>
          How fast Texas builds <span className="sources__muted">annual additions, GW</span>
        </h3>
        <p className="sources__caption">
          Capacity added to ERCOT each year, by fuel. The win screen divides what you built by
          the <strong>total</strong> column of the fastest year on record
          ({BEST_TOTAL_YEAR.total} GW, {BEST_TOTAL_YEAR.year}) &mdash; comparing a mixed
          portfolio against a mixed annual total, and against the most favourable year, so the
          resulting estimate is the conservative one.
        </p>
        <div className="sources__scroll">
          <table className="sources__table">
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col">Total</th>
                <th scope="col">Solar</th>
                <th scope="col">Battery</th>
                <th scope="col">Wind</th>
                <th scope="col">Gas</th>
              </tr>
            </thead>
            <tbody>
              {ANNUAL_ADDITIONS_GW.map((row) => (
                <tr key={row.year} className={row.year === BEST_TOTAL_YEAR.year ? 'is-risk' : undefined}>
                  <th scope="row">{row.year}</th>
                  <td>{row.total.toFixed(1)}</td>
                  <td>{row.solar.toFixed(1)}</td>
                  <td>{row.battery.toFixed(1)}</td>
                  <td>{row.wind.toFixed(1)}</td>
                  <td>{row.gas.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="sources__caption">
          Note that {BEST_TOTAL_YEAR.year} is the current reporting year, so its figures include
          planned additions that have not all landed. Note also that no nuclear or coal appears
          here at all: Texas has added no nuclear since 1993 and no coal since 2013. Unlike the
          MORA figures above, this table arrived without a workbook tab reference, so it is
          marked <span className="sources__badge sources__badge--projected">provided</span>{' '}
          rather than presented as MORA-sourced.
        </p>

        <h3>Availability factors</h3>
        <div className="sources__scroll">
        <table className="sources__table">
          <thead>
            <tr>
              <th scope="col">Resource</th>
              <th scope="col">Availability</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(AVAILABILITY).map(([key, value]) => (
              <tr key={key}>
                <th scope="row">{key}</th>
                <td>{(value * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <h3>Sourced versus assumed</h3>
        <div className="sources__scroll">
        <table className="sources__table">
          <thead>
            <tr>
              <th scope="col">Figure</th>
              <th scope="col">Value</th>
              <th scope="col">Status</th>
              <th scope="col">Note</th>
            </tr>
          </thead>
          <tbody>
            {ASSUMPTIONS.map(([figure, value, status, note]) => (
              <tr key={figure}>
                <th scope="row">{figure}</th>
                <td>{value}</td>
                <td>
                  <span className={`sources__badge sources__badge--${status}`}>{status}</span>
                </td>
                <td className="sources__exemplar">{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  );
}

export default SourcesCard;
