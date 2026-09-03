import { useMemo, useState } from 'react';
import './Lightswitch.css';
import Clock from './Clock';
import Scene from './Scene';
import { brightnessFor, diagnose } from '../data/lightswitch';
import {
  BASE_CURVE,
  DEMAND_2030,
  DEMAND_TODAY,
  EXISTING_FLEET_COUNTS,
  mergeCounts,
} from '../data/scenario';
import { simulate } from '../data/supplyOptions';

// Opens mid-afternoon on today's grid, where the light simply works.
const OPENING_HOUR = 13;

const peakGw = (curve) => Math.max(...curve.map((point) => point.mw)) / 1000;

function Lightswitch({ counts, future }) {
  const [hour, setHour] = useState(OPENING_HOUR);

  const demand = future ? DEMAND_2030 : DEMAND_TODAY;

  const day = useMemo(
    () => simulate(BASE_CURVE, demand, mergeCounts(EXISTING_FLEET_COUNTS, counts)),
    [demand, counts],
  );

  const record = day[hour];
  const lit = brightnessFor(record.deliveredMW, record.demandMW);
  const { tone, headline, detail } = diagnose(record, counts);

  return (
    <section className="lightswitch">
      <div className="lightswitch__scene">
        <Scene lit={lit}>
          <p className={`lightswitch__copy is-${tone}`}>
            <strong>{headline}</strong> {detail}
          </p>
        </Scene>
      </div>

      <div className="lightswitch__controls">
        <Clock hour={hour} onHourChange={setHour} />

        <div className="lightswitch__scenario">
          <p className="lightswitch__note">
            {future ? (
              <>
                ERCOT&rsquo;s long-term forecast: a{' '}
                <strong>{peakGw(DEMAND_2030).toFixed(0)} GW</strong> peak, up from{' '}
                {peakGw(DEMAND_TODAY).toFixed(0)} GW today. Growth on the existing shape for
                population and electrification, plus a flat around-the-clock adder for new
                large loads. A scenario, not a prediction.
              </>
            ) : (
              <>
                ERCOT&rsquo;s August 2026 P50 demand against the fleet that exists now &mdash; a{' '}
                <strong>{peakGw(DEMAND_TODAY).toFixed(0)} GW</strong> peak. Scrub the whole day.
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

export default Lightswitch;
