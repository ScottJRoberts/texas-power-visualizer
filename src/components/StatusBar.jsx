import './StatusBar.css';
import { clockLabel } from '../data/demand';
import { homesServed } from '../data/plantScale';

const formatHours = (hours) => (Number.isInteger(hours) ? String(hours) : hours.toFixed(1));

const formatHomes = (homes) =>
  homes >= 1_000_000
    ? `${(homes / 1_000_000).toFixed(1)} million homes`
    : `${Math.round(homes / 1000)},000 homes`;

function StatusBar({ hours, deficitGwh, worstGapMW, worstHour }) {
  if (hours === 0) {
    return (
      <p className="status-bar status-bar--covered">
        Supply meets demand at every hour of this scenario.
      </p>
    );
  }

  return (
    <div className="status-bar">
      <p className="status-bar__headline">
        You are short <strong className="status-bar__value">{formatHours(hours)} hours</strong> a
        day, short by <strong className="status-bar__value">{Math.round(deficitGwh)} GWh</strong>
        <span className="status-bar__note"> of unserved energy</span>
      </p>

      <p className="status-bar__worst">
        Worst hour is <strong>{clockLabel(worstHour)}</strong>, down{' '}
        <strong>{(worstGapMW / 1000).toFixed(1)} GW</strong>
        <span className="status-bar__note">
          {' '}
          &mdash; power for {formatHomes(homesServed(worstGapMW))}
        </span>
      </p>
    </div>
  );
}

export default StatusBar;
