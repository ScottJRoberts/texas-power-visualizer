import './WinAlert.css';
import { homesServed, PLANT } from '../data/plantScale';
import { SUPPLY_OPTIONS } from '../data/supplyOptions';
import { CAPACITY } from '../data/generationProfiles';
import { BEST_TOTAL_YEAR, yearsAtRecordPace } from '../data/buildRates';

const FLEET_GW_TODAY = CAPACITY.total[0] / 1000;

const formatHomes = (homes) =>
  homes >= 1_000_000
    ? `${(homes / 1_000_000).toFixed(1)} million homes`
    : `${Math.round(homes / 1000).toLocaleString()},000 homes`;

function WinAlert({ counts, baselineGapMW, dancing, onDismiss }) {
  const built = SUPPLY_OPTIONS.map((option) => ({
    id: option.id,
    label: PLANT[option.plantKey].label,
    count: counts[option.id] ?? 0,
    existing: PLANT[option.plantKey].sitesInTexas,
    gw: ((counts[option.id] ?? 0) * option.mwPerUnit) / 1000,
  })).filter((row) => row.count > 0);

  const totalSites = built.reduce((sum, row) => sum + row.count, 0);
  const totalGw = built.reduce((sum, row) => sum + row.gw, 0);
  const shareOfFleet = (totalGw / FLEET_GW_TODAY) * 100;

  return (
    <div className={dancing ? 'win-alert is-dancing' : 'win-alert'} role="alert">
      <button type="button" className="win-alert__close" onClick={onDismiss} aria-label="Dismiss">
        &times;
      </button>

      <p className="win-alert__lede">
        <strong>Power for days!!</strong> Every hour of the projected 2030 day is covered.
      </p>

      <p className="win-alert__sowhat">
        You closed a <strong>{(baselineGapMW / 1000).toFixed(0)} GW</strong> hole at its worst
        hour &mdash; enough to serve{' '}
        <strong>{formatHomes(homesServed(baselineGapMW))}</strong> at peak.
      </p>

      <table className="win-alert__built">
        <caption>What you built</caption>
        <tbody>
          {built.map((row) => (
            <tr key={row.id}>
              <th scope="row">{row.count.toLocaleString()} {row.label}{row.count === 1 ? '' : 's'}</th>
              <td>{row.gw.toFixed(1)} GW</td>
              <td className="win-alert__context">
                Texas has {row.existing.toLocaleString()} today
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">{totalSites.toLocaleString()} new sites</th>
            <td>{totalGw.toFixed(1)} GW</td>
            <td className="win-alert__context">
              {shareOfFleet.toFixed(0)}% of everything ERCOT has installed
            </td>
          </tr>
        </tfoot>
      </table>

      <p className="win-alert__caveat">
        How long do we think it would take to build all that? Texas&rsquo;s fastest year on
        record added {BEST_TOTAL_YEAR.total} GW across every fuel ({BEST_TOTAL_YEAR.year}), so
        this is about <strong>{yearsAtRecordPace(totalGw).toFixed(1)} years</strong> at that
        pace. And that&rsquo;s assuming no retirements, no permitting delays, and no supply
        chain issues. We&rsquo;ll have to innovate!
      </p>
    </div>
  );
}

export default WinAlert;
